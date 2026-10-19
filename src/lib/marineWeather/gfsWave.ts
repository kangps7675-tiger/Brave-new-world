/**
 * NOAA GFS-Wave(WAVEWATCH III 기반 전구 파랑 모델) 파일 위치·색인(.idx) 처리 — 순수 함수만.
 *
 * 출처: NOAA Open Data Dissemination(NODD) AWS 버킷 `noaa-gfs-bdp-pds` (미국 정부 자료 · 퍼블릭 도메인).
 * NOMADS(nomads.ncep.noaa.gov)는 분당 요청 한도를 넘기면 IP 를 막으므로 쓰지 않는다.
 *
 * 경로: gfs.YYYYMMDD/HH/wave/gridded/gfswave.tHHz.global.0p25.fFFF.grib2 (+ .idx)
 * .idx 한 줄 = "번호:바이트오프셋:d=YYYYMMDDHH:변수:레벨:예보:" → 필요한 변수만 HTTP Range 로 받는다.
 */

export const GFS_S3_BASE_DEFAULT = "https://noaa-gfs-bdp-pds.s3.amazonaws.com";
export const GFS_WAVE_GRID_DEFAULT = "global.0p25";

/** 0~72시간, 6시간 간격 (우회·대기 판단용 3일) */
export const FORECAST_HOURS = Array.from({ length: 13 }, (_, i) => i * 6);

export type WaveFieldKey = "hs_m" | "period_s" | "dir_deg" | "wind_ms" | "wind_dir_deg" | "swell_m" | "wind_wave_m";

/** 받을 변수 (wgrib2 약어 · 레벨). 없는 변수는 null 로 저장하고 넘어간다. */
export const WAVE_FIELDS: Array<{ key: WaveFieldKey; varName: string; level: string; labelKo: string }> = [
  { key: "hs_m", varName: "HTSGW", level: "surface", labelKo: "유의파고(m)" },
  { key: "period_s", varName: "PERPW", level: "surface", labelKo: "주파 주기(초)" },
  { key: "dir_deg", varName: "DIRPW", level: "surface", labelKo: "주파 방향(°, 오는 방향)" },
  { key: "wind_ms", varName: "WIND", level: "surface", labelKo: "풍속(m/s)" },
  { key: "wind_dir_deg", varName: "WDIR", level: "surface", labelKo: "풍향(°, 부는 방향의 출발)" },
  { key: "swell_m", varName: "SWELL", level: "1 in sequence", labelKo: "1차 너울 높이(m)" },
  { key: "wind_wave_m", varName: "WVHGT", level: "surface", labelKo: "풍랑 높이(m)" },
];

export type IdxEntry = { n: number; offset: number; date: string; varName: string; level: string; fcst: string };

export function parseIdx(text: string): IdxEntry[] {
  const out: IdxEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const p = line.split(":");
    if (p.length < 6) continue;
    const n = Number(p[0]);
    const offset = Number(p[1]);
    if (!Number.isFinite(n) || !Number.isFinite(offset)) continue;
    out.push({ n, offset, date: p[2].replace(/^d=/, ""), varName: p[3], level: p[4], fcst: p[5] });
  }
  return out.sort((a, b) => a.offset - b.offset);
}

/** 변수별 바이트 범위. end 가 null 이면 파일 끝까지 (마지막 메시지) */
export function byteRangeFor(
  entries: IdxEntry[],
  varName: string,
  level: string,
): { start: number; end: number | null } | null {
  let k = entries.findIndex((e) => e.varName === varName && e.level === level);
  // 레벨 표기가 예상과 다르면(예: wgrib2 버전 차이) 같은 변수의 첫 메시지로
  if (k < 0) k = entries.findIndex((e) => e.varName === varName);
  if (k < 0) return null;
  const next = entries[k + 1];
  return { start: entries[k].offset, end: next ? next.offset - 1 : null };
}

const p2 = (x: number) => String(x).padStart(2, "0");

/** "2026101906" 형식 */
export function cycleId(d: Date): string {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}${p2(d.getUTCHours())}`;
}

export function cycleDate(id: string): Date {
  return new Date(Date.UTC(+id.slice(0, 4), +id.slice(4, 6) - 1, +id.slice(6, 8), +id.slice(8, 10)));
}

/**
 * 받아볼 사이클 후보 — 최신부터. GFS-Wave 는 사이클 시각 + 약 3.5~5시간에 올라오므로
 * 지금으로부터 3시간 전 기준 6시간 내림부터 시작해 이전 사이클 2개까지.
 */
export function candidateCycles(now: Date, count = 3): string[] {
  const t = now.getTime() - 3 * 3600_000;
  const base = Math.floor(t / (6 * 3600_000)) * 6 * 3600_000;
  return Array.from({ length: count }, (_, i) => cycleId(new Date(base - i * 6 * 3600_000)));
}

export function waveFileUrl(base: string, cycle: string, fhour: number, grid = GFS_WAVE_GRID_DEFAULT): string {
  const ymd = cycle.slice(0, 8);
  const hh = cycle.slice(8, 10);
  return `${base.replace(/\/$/, "")}/gfs.${ymd}/${hh}/wave/gridded/gfswave.t${hh}z.${grid}.f${String(fhour).padStart(3, "0")}.grib2`;
}

export function validTimeIso(cycle: string, fhour: number): string {
  return new Date(cycleDate(cycle).getTime() + fhour * 3600_000).toISOString();
}

/** 더글러스 해상 상태(유의파고 기준) — 화면에서 "숫자만"이 아니라 말로도 보이게 */
export function seaStateKo(hsM: number | null): string | null {
  if (hsM == null || !Number.isFinite(hsM)) return null;
  if (hsM < 0.1) return "잔잔함";
  if (hsM < 0.5) return "약간 잔물결";
  if (hsM < 1.25) return "약한 파도";
  if (hsM < 2.5) return "보통 파도";
  if (hsM < 4) return "높은 파도";
  if (hsM < 6) return "매우 높은 파도";
  if (hsM < 9) return "거친 바다";
  if (hsM < 14) return "매우 거친 바다";
  return "극심한 바다";
}

/** 보퍼트 풍력 계급 (m/s) */
export function beaufort(windMs: number | null): number | null {
  if (windMs == null || !Number.isFinite(windMs)) return null;
  const limits = [0.5, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  const k = limits.findIndex((l) => windMs < l);
  return k < 0 ? 12 : k;
}
