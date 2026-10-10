/**
 * NASA FIRMS area API를 사건 날짜로 직접 조회한다.
 * D1 firms_fires는 48시간만 보관하므로 과거 사건은 여기서만 찾을 수 있다.
 * NRT는 최근 약 2개월, 그 이전은 SP(standard processing) 소스에 있다.
 */

import { radiusToBbox } from "@/lib/airRaidHistorySearch";
import { haversineKm } from "@/lib/conflictEvents/geo";

const NRT_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"];
const SP_SOURCES = ["VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "MODIS_SP"];
/** NRT 보관 경계 — 이보다 오래된 사건은 SP도 조회 */
const NRT_HORIZON_DAYS = 55;
const MAX_DAY_RANGE = 5;
const FETCH_TIMEOUT_MS = 12_000;

export type FirmsArchiveHit = {
  id: string;
  lat: number;
  lng: number;
  frp: number | null;
  brightness: number | null;
  confidence: string | null;
  acqDate: string | null;
  acqTime: string | null;
  satellite: string | null;
  source: string;
  distanceKm: number;
};

export function firmsMapKey(): string | null {
  const key = (process.env.NASA_FIRMS_API_KEY || process.env.FIRMS_MAP_KEY || "").trim();
  return key || null;
}

function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.parse(`${fromDate}T00:00:00Z`);
  const b = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.round((b - a) / 86_400_000) + 1;
}

export function parseFirmsAreaCsv(csv: string, source: string): Omit<FirmsArchiveHit, "distanceKm">[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0]!.split(",").map((c) => c.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const latIdx = col("latitude");
  const lngIdx = col("longitude");
  if (latIdx < 0 || lngIdx < 0) return [];
  const frpIdx = col("frp");
  const brightIdx = header.findIndex((h) => h === "bright_ti4" || h === "brightness");
  const confIdx = col("confidence");
  const dateIdx = col("acq_date");
  const timeIdx = col("acq_time");
  const satIdx = col("satellite");

  const out: Omit<FirmsArchiveHit, "distanceKm">[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i]!.split(",");
    const lat = Number(cells[latIdx]);
    const lng = Number(cells[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const acqDate = dateIdx >= 0 ? cells[dateIdx]?.trim() || null : null;
    const acqTime = timeIdx >= 0 ? cells[timeIdx]?.trim().padStart(4, "0") || null : null;
    const frp = frpIdx >= 0 ? Number(cells[frpIdx]) : NaN;
    const bright = brightIdx >= 0 ? Number(cells[brightIdx]) : NaN;
    out.push({
      id: `firms-${source}-${acqDate ?? "na"}-${acqTime ?? "na"}-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      lat,
      lng,
      frp: Number.isFinite(frp) ? frp : null,
      brightness: Number.isFinite(bright) ? bright : null,
      confidence: confIdx >= 0 ? cells[confIdx]?.trim() || null : null,
      acqDate,
      acqTime,
      satellite: satIdx >= 0 ? cells[satIdx]?.trim() || null : null,
      source,
    });
  }
  return out;
}

async function fetchCsv(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: "text/csv" }, signal: ctrl.signal });
    const body = await res.text();
    if (!res.ok || !body.toLowerCase().includes("latitude")) return null;
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 사건 반경·날짜 범위의 열점. 키가 없으면 null (호출부가 D1로 폴백).
 * 같은 열점을 여러 위성이 잡으면 좌표·시각 근사로 하나만 남긴다.
 */
export async function fetchFirmsArchive(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  fromDate: string;
  toDate: string;
}): Promise<{ hits: FirmsArchiveHit[]; sources: string[]; failed: string[] } | null> {
  const key = firmsMapKey();
  if (!key) return null;

  const bbox = radiusToBbox(args.lat, args.lng, args.radiusKm);
  const area = [bbox.west, bbox.south, bbox.east, bbox.north].map((v) => v.toFixed(4)).join(",");
  const days = Math.min(MAX_DAY_RANGE, Math.max(1, daysBetween(args.fromDate, args.toDate)));
  const ageDays = (Date.now() - Date.parse(`${args.toDate}T00:00:00Z`)) / 86_400_000;
  const sources = ageDays > NRT_HORIZON_DAYS ? [...SP_SOURCES, ...NRT_SOURCES] : NRT_SOURCES;

  const failed: string[] = [];
  const seen = new Set<string>();
  const hits: FirmsArchiveHit[] = [];
  const bodies = await Promise.all(
    sources.map(async (source) => ({
      source,
      csv: await fetchCsv(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/${area}/${days}/${args.fromDate}`,
      ),
    })),
  );
  for (const { source, csv } of bodies) {
    if (csv == null) {
      failed.push(source);
      continue;
    }
    for (const row of parseFirmsAreaCsv(csv, source)) {
      const distanceKm = haversineKm({ lat: args.lat, lng: args.lng }, { lat: row.lat, lng: row.lng });
      if (distanceKm > args.radiusKm) continue;
      const dedupe = `${row.lat.toFixed(3)}|${row.lng.toFixed(3)}|${row.acqDate}|${row.acqTime?.slice(0, 3)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      hits.push({ ...row, distanceKm: Math.round(distanceKm * 10) / 10 });
    }
  }
  return { hits, sources, failed };
}
