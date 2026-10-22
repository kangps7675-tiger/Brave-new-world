/**
 * Datalastic vessel_inradius → AIS 수집 보강 (순수 로직: 구역·파싱·예산·이력 보존 박스).
 * fetch/D1 은 workers/cron-ingest/src/datalastic.ts.
 *
 * 왜: AISstream 은 지상 수신국 기반이라 홍해·바브엘만데브처럼 수신국이 없는 해역은 0척이다.
 *     그 공백 구간만 Datalastic(위성+지상)으로 채운다. 선박 1척당 1크레딧이라 구역·주기·월 예산을 제한한다.
 *
 * 확인된 응답 형태 (2026-10-21 실제 호출):
 *   GET /api/v0/vessel_inradius?api-key=&lat=&lon=&radius=(NM, 최대 50)
 *   → { data: { point, total, vessels: [{ uuid, name, mmsi, imo, type, type_specific, lat, lon,
 *        speed, course, heading, destination, last_position_UTC, ... }] }, meta: { success } }
 */

import { validImo } from "../../workers/cron-ingest/src/vesselIdentity";

export type DatalasticZone = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusNm: number;
  /** 이 구역만의 폴링 간격(시간). 없으면 기본값 */
  pollHours?: number;
};

/**
 * 전 세계 주요 해역 + 먼바다 표본. 반경 최대 50NM(API 한도).
 * 선박 1척=1크레딧이라 붐비는 구역이 비싸다 — 간격은 구역별(hot=짧게)·월 예산 페이싱(paceAllowance)으로 조절한다.
 * 먼바다 구역은 배가 드물어 싸다 — 항로 사이 빈 곳을 채우는 용도.
 */
export const DATALASTIC_ZONES: DatalasticZone[] = [
  // hot — 위험 해역
  { id: "bab-el-mandeb", name: "바브엘만데브", lat: 12.65, lon: 43.35, radiusNm: 40, pollHours: 24 },
  { id: "red-sea-south", name: "홍해 남부", lat: 16.8, lon: 40.6, radiusNm: 50, pollHours: 24 },
  { id: "red-sea-north", name: "홍해 북부", lat: 24.5, lon: 35.6, radiusNm: 50, pollHours: 24 },
  { id: "hormuz", name: "호르무즈", lat: 26.5, lon: 56.3, radiusNm: 50, pollHours: 24 },
  { id: "gulf-of-oman", name: "오만만", lat: 24.8, lon: 58.8, radiusNm: 50, pollHours: 48 },
  { id: "suez", name: "수에즈", lat: 30.0, lon: 32.55, radiusNm: 40, pollHours: 48 },
  { id: "black-sea", name: "흑해", lat: 43.5, lon: 34.0, radiusNm: 50, pollHours: 48 },
  // 전 지구 길목·항만권
  { id: "malacca", name: "말라카·싱가포르", lat: 1.3, lon: 103.9, radiusNm: 50 },
  { id: "taiwan-strait", name: "대만해협", lat: 24.5, lon: 119.5, radiusNm: 50 },
  { id: "east-china-sea", name: "동중국해", lat: 31.0, lon: 123.0, radiusNm: 50 },
  { id: "korea-strait", name: "대한해협", lat: 34.2, lon: 129.0, radiusNm: 50 },
  { id: "arabian-sea", name: "아라비아해", lat: 17.0, lon: 66.0, radiusNm: 50 },
  { id: "colombo", name: "스리랑카 남방", lat: 6.0, lon: 80.0, radiusNm: 50 },
  { id: "mediterranean", name: "지중해 중부", lat: 35.5, lon: 14.5, radiusNm: 50 },
  { id: "gibraltar", name: "지브롤터", lat: 36.0, lon: -5.6, radiusNm: 40 },
  { id: "english-channel", name: "영국해협", lat: 50.5, lon: 0.5, radiusNm: 50 },
  { id: "bosphorus", name: "보스포루스", lat: 41.1, lon: 29.1, radiusNm: 20 },
  { id: "cape-good-hope", name: "희망봉", lat: -35.5, lon: 19.0, radiusNm: 50 },
  { id: "panama-atlantic", name: "파나마 대서양측", lat: 9.4, lon: -79.8, radiusNm: 40 },
  { id: "us-gulf", name: "미 멕시코만", lat: 28.5, lon: -94.0, radiusNm: 50 },
  { id: "us-west", name: "미 서안(LA)", lat: 33.5, lon: -118.4, radiusNm: 50 },
  { id: "us-east", name: "미 동안(뉴욕)", lat: 40.3, lon: -73.8, radiusNm: 50 },
  // 먼바다 표본 (드물어 싸다)
  { id: "n-atlantic", name: "북대서양", lat: 45.0, lon: -35.0, radiusNm: 50 },
  { id: "s-atlantic", name: "남대서양", lat: -20.0, lon: -15.0, radiusNm: 50 },
  { id: "n-pacific", name: "북태평양", lat: 35.0, lon: -160.0, radiusNm: 50 },
  { id: "s-pacific", name: "남태평양", lat: -25.0, lon: -140.0, radiusNm: 50 },
  { id: "indian-ocean", name: "인도양", lat: -15.0, lon: 75.0, radiusNm: 50 },
];

export const DEFAULT_MONTHLY_CREDITS = 15_000;
/** 구역에 pollHours 가 없을 때의 기본 간격 — 전 지구 구역 수가 많아 길게 잡고, 실제 속도는 월 예산 페이싱이 조절한다 */
export const DEFAULT_POLL_HOURS = 72;
/** 한 번 호출이 최대 500척(=500크레딧)까지 나갈 수 있어, 남은 예산이 이보다 적으면 호출하지 않는다. */
export const MIN_REMAINING_CREDITS = 150;

export type DatalasticVessel = {
  mmsi: string;
  imo: string | null;
  name: string | null;
  type: string | null;
  typeSpecific: string | null;
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  destination: string | null;
  at: string | null;
};

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function parseInradius(json: unknown): { ok: boolean; total: number; vessels: DatalasticVessel[] } {
  const root = json as { data?: { total?: unknown; vessels?: unknown }; meta?: { success?: unknown } } | null;
  if (!root || root.meta?.success === false) return { ok: false, total: 0, vessels: [] };
  const raw = Array.isArray(root.data?.vessels) ? (root.data!.vessels as Record<string, unknown>[]) : [];
  const vessels: DatalasticVessel[] = [];
  for (const r of raw) {
    const mmsi = typeof r.mmsi === "string" || typeof r.mmsi === "number" ? String(r.mmsi).trim() : "";
    const lat = num(r.lat);
    const lng = num(r.lon ?? r.lng);
    if (!/^\d{9}$/.test(mmsi) || lat === null || lng === null) continue;
    const at = str(r.last_position_UTC);
    vessels.push({
      mmsi,
      imo: validImo(r.imo),
      name: str(r.name),
      type: str(r.type),
      typeSpecific: str(r.type_specific),
      lat,
      lng,
      sog: num(r.speed),
      cog: num(r.course),
      heading: num(r.heading),
      destination: str(r.destination),
      at: at && Number.isFinite(Date.parse(at)) ? new Date(at).toISOString() : null,
    });
  }
  return { ok: true, total: num(root.data?.total) ?? vessels.length, vessels };
}

/** Datalastic type 문자열 → ais_vessels category (민간/군/기타). */
export function categoryFromType(type: string | null): "commercial" | "military" | "other" {
  const t = (type ?? "").toLowerCase();
  if (/military|naval|warship|law enforcement/.test(t)) return "military";
  if (/tanker|cargo|passenger|container|bulk|tug|vessel/.test(t)) return "commercial";
  return "other";
}

/** UTC "YYYY-MM" — 크레딧 월 집계 키 */
export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** 마지막 폴링이 pollHours 보다 오래됐거나 기록이 없는 구역 */
export function zonesDue(
  zones: DatalasticZone[],
  lastPolledAt: Record<string, string | undefined>,
  nowMs: number,
  pollHours: number,
): DatalasticZone[] {
  const age = (z: DatalasticZone) => {
    const t = lastPolledAt[z.id] ? Date.parse(lastPolledAt[z.id] as string) : NaN;
    return Number.isFinite(t) ? nowMs - t : Number.POSITIVE_INFINITY;
  };
  return (
    zones
      .filter((z) => age(z) >= (z.pollHours ?? pollHours) * 3_600_000)
      // 오래 못 본 구역부터 — 목록 뒤쪽 구역이 예산 때문에 영영 밀리지 않게
      .sort((a, b) => age(b) / (b.pollHours ?? pollHours) - age(a) / (a.pollHours ?? pollHours))
  );
}

/** 한 번의 cron 틱에서 부를 구역 수 상한 — 한 틱에 예산·시간을 몰아 쓰지 않는다 */
export const MAX_ZONES_PER_TICK = 4;

/**
 * 월 예산 페이싱: 달의 경과 비율만큼만 누적 지출을 허용해 월초에 다 써버리지 않는다.
 * 구역 하나가 최대 500척이라 한 구역분 여유(slack)를 더해 첫 호출이 막히지 않게 한다.
 */
export function paceAllowance(budget: number, now: Date, slack = 500): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = Date.UTC(y, m, 1);
  const end = Date.UTC(y, m + 1, 1);
  const frac = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  return Math.min(budget, Math.floor(budget * frac) + slack);
}

export function canSpend(usedCredits: number, budget: number): boolean {
  return budget - usedCredits >= MIN_REMAINING_CREDITS;
}

/**
 * 피격 매칭(ais_position_history)에서 솎아내기(thinWorldwide, 10° 셀당 24척)를 적용하지 않을 해역.
 * 호르무즈·페르시아만·오만만은 한 10° 셀에 몰려 24척 캡이 사건 반경 후보를 지운다.
 * [[latMin, lonMin], [latMax, lonMax]]
 */
export const HISTORY_KEEP_BOXES: Array<[[number, number], [number, number]]> = [
  [[23, 47], [31, 57]], // 페르시아만
  [[22, 56], [27, 62]], // 호르무즈·오만만
  [[8, 44], [16, 60]], // 아덴만
  [[12, 32], [30, 44]], // 홍해
  [[41, 27], [47, 42]], // 흑해
];

export function isHistoryKeepPoint(lat: number, lng: number): boolean {
  return HISTORY_KEEP_BOXES.some(([[s, w], [n, e]]) => lat >= s && lat <= n && lng >= w && lng <= e);
}
