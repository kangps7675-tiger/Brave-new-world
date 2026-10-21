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

export type DatalasticZone = { id: string; name: string; lat: number; lon: number; radiusNm: number };

/** AISstream 이 비는 해역만. 반경 최대 50NM(API 한도). */
export const DATALASTIC_ZONES: DatalasticZone[] = [
  { id: "bab-el-mandeb", name: "바브엘만데브", lat: 12.65, lon: 43.35, radiusNm: 40 },
  { id: "red-sea-south", name: "홍해 남부", lat: 16.8, lon: 40.6, radiusNm: 50 },
  { id: "red-sea-north", name: "홍해 북부", lat: 24.5, lon: 35.6, radiusNm: 50 },
];

export const DEFAULT_MONTHLY_CREDITS = 15_000;
export const DEFAULT_POLL_HOURS = 6;
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
  return zones.filter((z) => {
    const last = lastPolledAt[z.id];
    const t = last ? Date.parse(last) : NaN;
    return !Number.isFinite(t) || nowMs - t >= pollHours * 3_600_000;
  });
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
