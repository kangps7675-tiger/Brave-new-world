import type { FirmsFireRow } from "./env";
import { nearestEnergyFacility } from "../../../src/data/energyFacilities";

const DEFAULT_SOURCE = "VIIRS_SNPP_NRT";

/**
 * 여러 위성 소스를 병합해 커버리지 공백을 없앤다.
 * SNPP NRT가 비는 구간이 있어 NOAA-20/21을 함께 조회한다.
 */
const FIRMS_SOURCES = ["VIIRS_NOAA20_NRT"];

/**
 * 에너지·항만 시설 감시 범위 (2026-10-20) — 전세계 분쟁 theater 대신
 * src/data/energyFacilities.ts 시설들이 들어가는 큰 상자 6개만 조회하고,
 * 받은 열점 중 **시설 반경 안**의 것만 저장한다 (나머지 농경지 화재 등은 버림).
 * 시설을 추가해서 상자 밖으로 나가면 여기 상자도 넓힌다 (firms.test 참고).
 */
export const FIRMS_THEATERS: {
  id: string;
  west: number;
  south: number;
  east: number;
  north: number;
}[] = [
  // 우크라이나 전역 + 흑해 연안 러시아(크라스노다르·노보로시스크·투압세·크림)
  { id: "energy-black-sea", west: 22, south: 44, east: 41, north: 50.5 },
  // 러시아 중부 (모스크바·랴잔·야로슬라블·크스토보·우네차·키리시)
  { id: "energy-central-ru", west: 31, south: 52, east: 45, north: 60 },
  // 발트 수출터미널 (프리모르스크·우스트루가·비소츠크)
  { id: "energy-baltic", west: 27, south: 59.3, east: 30, north: 61 },
  // 볼가·우랄 (볼고그라드·사라토프·시즈란·사마라·우파·살라바트·오르스크)
  { id: "energy-volga-ural", west: 43, south: 48, east: 59.5, north: 56 },
  { id: "energy-ukhta", west: 52.5, south: 63, east: 55, north: 64.2 },
  { id: "energy-tyumen", west: 64.5, south: 56.5, east: 66.5, north: 57.7 },
];

/** 시설 반경 안 열점만 남긴다 */
export function keepFacilityFires(rows: FirmsFireRow[], slackKm = 2): FirmsFireRow[] {
  return rows.filter((r) => nearestEnergyFacility(r.lat, r.lng, slackKm) !== null);
}

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
        // 상자가 커서 농경지 화재가 많다 — 넉넉히 읽고 시설 반경으로 거른 뒤 상한 적용
        const parsed = keepFacilityFires(parseFirmsCsv(csv, theater.id, source, 20_000));
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
