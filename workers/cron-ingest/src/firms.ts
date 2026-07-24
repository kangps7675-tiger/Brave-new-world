import type { FirmsFireRow } from "./env";

const DEFAULT_SOURCE = "VIIRS_SNPP_NRT";

/**
 * 여러 위성 소스를 병합해 커버리지 공백을 없앤다.
 * SNPP NRT가 비는 구간이 있어 NOAA-20/21을 함께 조회한다.
 */
const FIRMS_SOURCES = ["VIIRS_NOAA20_NRT"];

/** Conflict theaters — keep small for Worker CPU/time limits.
 * Keep in sync with `src/lib/firmsTheaters.ts` (client display filter).
 */
export const FIRMS_THEATERS: {
  id: string;
  west: number;
  south: number;
  east: number;
  north: number;
}[] = [
  { id: "ukraine", west: 22, south: 44, east: 41, north: 53 },
  { id: "middle-east", west: 32, south: 28, east: 50, north: 38 },
  { id: "taiwan", west: 116, south: 20, east: 125, north: 27 },
  { id: "korea", west: 123, south: 33, east: 132, north: 43 },
  { id: "red-sea", west: 32, south: 10, east: 48, north: 28 },
  { id: "black-sea", west: 28, south: 41, east: 42, north: 47 },
  { id: "south-china-sea", west: 105, south: 5, east: 122, north: 23 },
];

export function buildFirmsAreaUrl(options: {
  mapKey: string;
  west: number;
  south: number;
  east: number;
  north: number;
  dayRange?: number;
  source?: string;
  /** YYYY-MM-DD — range ends on this date (archive / SP) */
  endDate?: string;
}) {
  const {
    mapKey,
    west,
    south,
    east,
    north,
    dayRange = 1,
    source = DEFAULT_SOURCE,
    endDate,
  } = options;
  const bbox = `${west},${south},${east},${north}`;
  // NRT max ~10; SP archive chunks often use up to 10
  const days = Math.min(10, Math.max(1, dayRange));
  const base = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${days}`;
  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return `${base}/${endDate}`;
  }
  return base;
}

export function parseFirmsCsv(
  csv: string,
  theater: string,
  source: string,
  maxCount: number,
): FirmsFireRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");
  if (latIdx < 0 || lngIdx < 0) return [];

  const frpIdx = header.indexOf("frp");
  const brightIdx = header.indexOf("brightness");
  const confIdx = header.indexOf("confidence");
  const dateIdx = header.indexOf("acq_date");
  const timeIdx = header.indexOf("acq_time");
  const satIdx = header.indexOf("satellite");
  const dnIdx = header.indexOf("daynight");

  const fires: FirmsFireRow[] = [];
  for (let i = 1; i < lines.length && fires.length < maxCount; i += 1) {
    const cols = lines[i]!.split(",");
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const acqDate = dateIdx >= 0 ? cols[dateIdx]?.trim() || null : null;
    const acqTime = timeIdx >= 0 ? cols[timeIdx]?.trim() || null : null;
    const frpRaw = frpIdx >= 0 ? Number(cols[frpIdx]) : NaN;

    fires.push({
      id: `firms-${theater}-${acqDate || "na"}-${acqTime || i}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      frp: Number.isFinite(frpRaw) ? frpRaw : null,
      brightness: brightIdx >= 0 ? Number(cols[brightIdx]) || null : null,
      confidence: confIdx >= 0 ? cols[confIdx]?.trim() || null : null,
      acq_date: acqDate,
      acq_time: acqTime,
      satellite: satIdx >= 0 ? cols[satIdx]?.trim() || null : null,
      daynight: dnIdx >= 0 ? cols[dnIdx]?.trim() || null : null,
      source,
      theater,
    });
  }

  return fires;
}

function isFirmsErrorBody(csv: string) {
  const head = csv.trim().slice(0, 120).toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.includes("invalid") ||
    head.includes("error") ||
    head.includes("unauthorized") ||
    !head.includes("latitude")
  );
}

export async function fetchFirmsForTheaters(options: {
  mapKey: string;
  dayRange: number;
  maxPerTheater: number;
  /** 지정 시 이 소스만, 없으면 SNPP+NOAA20+NOAA21 병합 */
  source?: string;
}): Promise<{ fires: FirmsFireRow[]; errors: string[] }> {
  const sources = options.source ? [options.source] : FIRMS_SOURCES;
  const fires: FirmsFireRow[] = [];
  const errors: string[] = [];
  // 같은 화재를 여러 위성이 잡을 수 있어 좌표·시각 근사로 중복 제거
  const seen = new Set<string>();

  for (const theater of FIRMS_THEATERS) {
    // theater별 소스 합산 상한
    let remaining = options.maxPerTheater;
    for (const source of sources) {
      if (remaining <= 0) break;
      try {
        const url = buildFirmsAreaUrl({
          mapKey: options.mapKey,
          ...theater,
          dayRange: options.dayRange,
          source,
        });
        const response = await fetch(url, {
          headers: { Accept: "text/csv" },
        });
        const csv = await response.text();
        if (!response.ok) {
          errors.push(`${theater.id}/${source}: HTTP ${response.status}`);
          continue;
        }
        if (isFirmsErrorBody(csv)) {
          // 헤더만 오는(빈) 응답은 정상 — 에러로 취급하지 않음
          if (!csv.trim().toLowerCase().includes("latitude")) {
            errors.push(`${theater.id}/${source}: unexpected body`);
          }
          continue;
        }
        const parsed = parseFirmsCsv(csv, theater.id, source, remaining);
        for (const fire of parsed) {
          const dedupeKey = `${theater.id}|${fire.lat.toFixed(3)}|${fire.lng.toFixed(3)}|${fire.acq_date || ""}|${fire.acq_time || ""}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          fires.push(fire);
          remaining -= 1;
          if (remaining <= 0) break;
        }
      } catch (error) {
        errors.push(
          `${theater.id}/${source}: ${error instanceof Error ? error.message : "fetch failed"}`,
        );
      }
    }
  }

  return { fires, errors };
}
