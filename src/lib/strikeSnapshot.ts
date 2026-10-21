/**
 * 사건 트리거 스냅샷 (순수 로직: 반경·후보 선정·공유·이력 구간·크레딧 추정).
 * fetch/D1 은 workers/cron-ingest/src/strikeSnapshot.ts.
 *
 * 흐름 — 전 해역을 상시 폴링하지 않고, UKMTO 피격 사건이 뜬 그 지점만 본다:
 *   1단계(즉시): 사건 지점 반경 N해리 Datalastic vessel_inradius(실시간) → 지금 거기 있는 배 + 후보 10척 선정
 *   2단계(사건 3시간 뒤): 후보 10척의 vessel_history → 사건 시각 전후 ±6시간 위치를 ais_position_history 에 적재
 *   매칭(src/lib/strikeMatch/server.ts)은 그 테이블만 읽는다 — 화면을 열 때마다 유료 API 를 부르지 않는다.
 *
 * 한계 (화면에 그대로 밝혀야 하는 것):
 *   - vessel_inradius 는 "지금" 위치만 준다. 보고가 늦은(time-late) 사건은 피격선이 이미 떠났을 수 있다.
 *     그래서 늦은 보고는 반경을 넓히지만, 먼 곳으로 간 배는 후보에서 빠진다.
 */

import { distanceKm, reportedTypeGroup } from "./strikeMatch/scoreCandidates";
import type { DatalasticVessel } from "./datalasticAis";

export const SNAPSHOT_RADIUS_NM = 30;
/** 사건 후 이 시간이 지난 뒤에 처리하는 사건은 배가 더 멀리 갔을 수 있어 반경을 넓힌다 (API 한도 50NM) */
export const SNAPSHOT_RADIUS_LATE_NM = 50;
export const LATE_REPORT_HOURS = 6;
/** 이보다 오래된 사건은 "지금 위치"가 쓸모없다 (배가 이미 수백 해리 떠남) — 스냅샷을 만들지 않는다 */
export const SNAPSHOT_MAX_AGE_HOURS = 24;
export const MAX_CANDIDATES = 10;
/** 2단계(이력 보강)를 사건 시각에서 이만큼 지난 뒤에 한다 — 사건 직후 표본이 Datalastic 에 쌓일 시간 */
export const HISTORY_DELAY_HOURS = 3;
export const HISTORY_WINDOW_HOURS = 6;
export const HISTORY_MAX_TRIES = 3;
/** 같은 곳에서 연달아 터진 사건은 스냅샷 한 번을 같이 쓴다 */
export const SHARE_WINDOW_MIN = 90;
export const SHARE_RADIUS_NM = 20;
/** 사건 처리 대상 — 이보다 오래된 사건은 건드리지 않는다 (과거 폭주 방지) */
export const INCIDENT_LOOKBACK_HOURS = 72;
/** 상시 폴링이 건드리지 못하게 사건용으로 남겨두는 월 크레딧 */
export const EVENT_RESERVE_CREDITS = 4_000;
/** 호출 한 번이 최대 500척(=500크레딧)이라, 남은 예산이 이보다 적으면 사건 스냅샷도 하지 않는다 */
export const EVENT_MIN_REMAINING_CREDITS = 200;
export const MAX_SNAPSHOTS_PER_TICK = 2;
export const MAX_HISTORIES_PER_TICK = 2;

export type SnapshotCandidate = { mmsi: string; name: string | null; imo: string | null; distNm: number };

const KM_PER_NM = 1.852;

export function incidentMs(occurredAt: string | null | undefined, createdAt: string | null | undefined): number | null {
  for (const raw of [occurredAt, createdAt]) {
    if (!raw) continue;
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

export function snapshotRadiusNm(ageHours: number): number {
  return ageHours > LATE_REPORT_HOURS ? SNAPSHOT_RADIUS_LATE_NM : SNAPSHOT_RADIUS_NM;
}

/** Datalastic type 문자열 → 경보 선종 대분류 (reportedTypeGroup 과 같은 범주) */
export function datalasticTypeGroup(type: string | null): "tanker" | "cargo" | "passenger" | "other" | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (/tanker|lng|lpg|crude|chemical/.test(t)) return "tanker";
  if (/cargo|container|bulk|general|ro-?ro|vehicle|reefer/.test(t)) return "cargo";
  if (/passenger|cruise|ferry/.test(t)) return "passenger";
  return "other";
}

/** vessel_identity.ship_type 에 넣을 AIS 선종 코드 (대분류만 — 세부는 모른다). 모르면 null */
export function aisTypeCodeFromDatalastic(type: string | null): number | null {
  const g = datalasticTypeGroup(type);
  if (g === "tanker") return 80;
  if (g === "cargo") return 70;
  if (g === "passenger") return 60;
  return null;
}

/**
 * 스냅샷 선박 중 이력을 받아볼 후보 — 사건 지점에 가까운 순.
 *  - 경보 선종이 있으면 다른 선종으로 확인된 배는 뺀다 (모르는 선종은 남긴다)
 *  - 군함·관공선은 뺀다
 */
export function pickCandidates(
  vessels: DatalasticVessel[],
  incident: { lat: number; lng: number; vesselType: string | null },
  max = MAX_CANDIDATES,
): SnapshotCandidate[] {
  const want = reportedTypeGroup(incident.vesselType);
  const out: SnapshotCandidate[] = [];
  for (const v of vessels) {
    const t = (v.type ?? "").toLowerCase();
    if (/military|naval|warship|law enforcement/.test(t)) continue;
    const g = datalasticTypeGroup(v.type);
    if (want && g && g !== want) continue;
    out.push({
      mmsi: v.mmsi,
      name: v.name,
      imo: v.imo,
      distNm: Math.round((distanceKm(incident, { lat: v.lat, lng: v.lng }) / KM_PER_NM) * 10) / 10,
    });
  }
  return out.sort((a, b) => a.distNm - b.distNm).slice(0, max);
}

/** 근처에서 최근 찍은 스냅샷이 있으면 그것을 같이 쓴다 */
export function canShareSnapshot(
  prev: { snapshotAtMs: number; lat: number; lng: number },
  next: { lat: number; lng: number },
  nowMs: number,
): boolean {
  if (nowMs - prev.snapshotAtMs > SHARE_WINDOW_MIN * 60_000) return false;
  return distanceKm(prev, next) / KM_PER_NM <= SHARE_RADIUS_NM;
}

/** 2단계로 넘어갈 때가 됐나 */
export function historyDue(incidentAtMs: number, nowMs: number): boolean {
  return nowMs - incidentAtMs >= HISTORY_DELAY_HOURS * 3_600_000;
}

export function historyRange(incidentAtMs: number): { fromIso: string; toIso: string } {
  const w = HISTORY_WINDOW_HOURS * 3_600_000;
  return { fromIso: new Date(incidentAtMs - w).toISOString(), toIso: new Date(incidentAtMs + w).toISOString() };
}

/** vessel_history 크레딧 추정 — 선박당 구간이 걸친 날수(UTC). `to` 는 배타적이라 하루 뒤 날짜를 쓴다. */
export function historyDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${new Date(Date.parse(toIso) + 86_400_000).toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.max(1, Math.round((to - from) / 86_400_000));
}

export function canSpendOnEvent(usedCredits: number, budget: number): boolean {
  return budget - usedCredits >= EVENT_MIN_REMAINING_CREDITS;
}
