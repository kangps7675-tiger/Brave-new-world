/**
 * 위치 이력(선박 AIS · 군용기 ADS-B) → 서버 봉인 근거.
 * 대상마다 사건 지점에 가장 가까이 온 표본(최근접)을 고르고,
 * 사건 시각 전후 신호가 끊긴 구간이 있으면 함께 기록한다.
 */

import { and, asc, eq, gte, lte, min } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { adsbTrackHistory, aisPositionHistory } from "@/db/schema";
import { radiusToBbox } from "@/lib/airRaidHistorySearch";
import { haversineKm } from "@/lib/conflictEvents/geo";
import {
  freezeAisEvidence,
  sealServerFrozenPayload,
  type AisFreezeQuery,
  type ServerFrozenPayload,
} from "@/lib/caseFile/serverFreeze";
import type { CaseIncident } from "@/lib/caseFile/types";

/** 이 간격보다 표본이 비면 "신호 끊김"으로 본다 (수집 버킷 30분의 4배) */
export const TRACK_GAP_MINUTES = 120;
export const ADSB_DEFAULT_WINDOW_HOURS = 3;

export type TrackSample = {
  lat: number;
  lng: number;
  sampledAt: string;
};

export type TrackGap = {
  fromIso: string;
  toIso: string;
  minutes: number;
  /** 사건 시각이 이 끊김 안에 들어가는가 */
  coversIncident: boolean;
};

/** 시각순 표본에서 TRACK_GAP_MINUTES 이상 빈 구간 */
export function findTrackGaps(
  samples: TrackSample[],
  incidentIso: string | null,
  gapMinutes = TRACK_GAP_MINUTES,
): TrackGap[] {
  const sorted = [...samples].sort((a, b) => a.sampledAt.localeCompare(b.sampledAt));
  const incidentMs = incidentIso ? Date.parse(incidentIso) : NaN;
  const gaps: TrackGap[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const a = Date.parse(sorted[i - 1]!.sampledAt);
    const b = Date.parse(sorted[i]!.sampledAt);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const minutes = Math.round((b - a) / 60_000);
    if (minutes < gapMinutes) continue;
    gaps.push({
      fromIso: sorted[i - 1]!.sampledAt,
      toIso: sorted[i]!.sampledAt,
      minutes,
      coversIncident: Number.isFinite(incidentMs) && incidentMs > a && incidentMs < b,
    });
  }
  return gaps;
}

type Candidate<T> = { row: T; distanceKm: number };

/** 대상 키별 최근접 표본 하나 */
export function closestPerTarget<T extends { lat: number; lng: number }>(
  rows: T[],
  keyOf: (row: T) => string,
  origin: { lat: number; lng: number },
  radiusKm: number,
): Candidate<T>[] {
  const best = new Map<string, Candidate<T>>();
  for (const row of rows) {
    const distanceKm = haversineKm(origin, { lat: row.lat, lng: row.lng });
    if (distanceKm > radiusKm) continue;
    const key = keyOf(row);
    const prev = best.get(key);
    if (!prev || distanceKm < prev.distanceKm) best.set(key, { row, distanceKm });
  }
  return [...best.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type TrackFreezeResult = {
  payload: ServerFrozenPayload;
  pick: {
    id: string;
    label: string;
    lat: number;
    lng: number;
    distanceKm: number;
    timestamp: string;
  } | null;
  hits: number;
  gaps: TrackGap[];
  /** 수집 시작 시각 — 조회 구간이 이보다 이르면 "없음"이 아니라 "자료 없음" */
  coverageStart: string | null;
};

function coverageNote(coverageStart: string | null, fromIso: string): string | null {
  if (!coverageStart) return "위치 이력 수집 전 — 이 구간 자료 없음";
  if (fromIso < coverageStart) {
    return `위치 이력은 ${coverageStart.slice(0, 16).replace("T", " ")} UTC부터 — 그 이전은 자료 없음`;
  }
  return null;
}

/**
 * 사건 앵커 → AIS 위치 이력 조회.
 * 이력 테이블이 비어 있으면(마이그레이션 전) 최신 스냅샷 방식으로 폴백한다.
 */
export async function freezeAisHistoryEvidence(
  db: AppDb,
  query: AisFreezeQuery & { incidentIso: string },
): Promise<TrackFreezeResult> {
  const fromIso = query.fromIso ?? query.incidentIso;
  const toIso = query.toIso ?? query.incidentIso;
  let coverageStart: string | null = null;
  let rows: Array<typeof aisPositionHistory.$inferSelect> = [];
  try {
    const cov = await db.select({ v: min(aisPositionHistory.ingestedAt) }).from(aisPositionHistory);
    coverageStart = cov[0]?.v ?? null;
    const bbox = radiusToBbox(query.lat, query.lng, query.radiusKm);
    rows = await db
      .select()
      .from(aisPositionHistory)
      .where(
        and(
          gte(aisPositionHistory.lat, bbox.south),
          lte(aisPositionHistory.lat, bbox.north),
          gte(aisPositionHistory.lng, bbox.west),
          lte(aisPositionHistory.lng, bbox.east),
          gte(aisPositionHistory.sampledAt, fromIso),
          lte(aisPositionHistory.sampledAt, toIso),
        ),
      )
      .limit(4000);
  } catch {
    coverageStart = null;
  }

  if (!coverageStart) {
    const legacy = await freezeAisEvidence(db, query);
    return {
      payload: legacy.payload,
      pick: legacy.pick
        ? {
            id: legacy.pick.id,
            label: legacy.pick.shipName || legacy.pick.mmsi,
            lat: legacy.pick.lat,
            lng: legacy.pick.lng,
            distanceKm: legacy.pick.distanceKm,
            timestamp: legacy.pick.timestamp ?? "",
          }
        : null,
      hits: legacy.hits,
      gaps: [],
      coverageStart: null,
    };
  }

  const filteredRows =
    query.category && query.category !== "all"
      ? rows.filter((r) => r.category === query.category)
      : rows;
  const candidates = closestPerTarget(
    filteredRows,
    (r) => r.mmsi,
    { lat: query.lat, lng: query.lng },
    query.radiusKm,
  );
  const chosen =
    candidates.find((c) => c.row.mmsi === query.pickMmsi || c.row.id === query.pickId) ??
    candidates[0] ??
    null;

  let gaps: TrackGap[] = [];
  if (chosen) {
    const track = await db
      .select({
        lat: aisPositionHistory.lat,
        lng: aisPositionHistory.lng,
        sampledAt: aisPositionHistory.sampledAt,
      })
      .from(aisPositionHistory)
      .where(
        and(
          eq(aisPositionHistory.mmsi, chosen.row.mmsi),
          gte(aisPositionHistory.sampledAt, fromIso),
          lte(aisPositionHistory.sampledAt, toIso),
        ),
      )
      .orderBy(asc(aisPositionHistory.sampledAt))
      .limit(500);
    gaps = findTrackGaps(track, query.incidentIso);
  }

  const pick = chosen
    ? {
        id: chosen.row.id,
        mmsi: chosen.row.mmsi,
        shipName: chosen.row.shipName,
        lat: chosen.row.lat,
        lng: chosen.row.lng,
        sog: chosen.row.sog,
        category: chosen.row.category,
        timestamp: chosen.row.sampledAt,
        distanceKm: round1(chosen.distanceKm),
      }
    : null;
  const nearby = candidates.slice(0, 20).map((c) => ({
    mmsi: c.row.mmsi,
    shipName: c.row.shipName,
    distanceKm: round1(c.distanceKm),
    at: c.row.sampledAt,
  }));
  const results = pick
    ? { pick, nearby, nearbyCount: candidates.length, gaps, coverageStart }
    : { hits: nearby, gaps, coverageStart, coverage: coverageNote(coverageStart, fromIso) };

  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "ais",
    queriedAt: new Date().toISOString(),
    query: {
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      fromIso,
      toIso,
      category: query.category ?? "all",
      provider: "ais_position_history",
      pickMmsi: pick?.mmsi ?? null,
    },
    resultHash: "",
    resultCount: candidates.length,
    results,
    pickId: pick?.id,
  });

  return {
    payload,
    pick: pick
      ? {
          id: pick.id,
          label: pick.shipName || pick.mmsi,
          lat: pick.lat,
          lng: pick.lng,
          distanceKm: pick.distanceKm,
          timestamp: pick.timestamp,
        }
      : null,
    hits: candidates.length,
    gaps,
    coverageStart,
  };
}

export type AdsbFreezeQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
  fromIso: string;
  toIso: string;
  incidentIso: string;
  pickHex?: string;
};

export function resolveAdsbQueryFromIncident(
  incident: CaseIncident,
  opts: { radiusKm: number; windowHours?: number; pickHex?: string },
): AdsbFreezeQuery | { error: string } {
  if (!incident.place || !incident.occurredAt) {
    return { error: "사건 위치·시각을 먼저 설정하세요." };
  }
  const t = Date.parse(incident.occurredAt);
  if (!Number.isFinite(t)) return { error: "사건 시각 형식이 올바르지 않습니다" };
  if (!(opts.radiusKm > 0) || opts.radiusKm > 300) {
    return { error: "radiusKm 은 0 초과 300 이하" };
  }
  const windowHours =
    typeof opts.windowHours === "number" && opts.windowHours > 0 && opts.windowHours <= 24
      ? opts.windowHours
      : ADSB_DEFAULT_WINDOW_HOURS;
  return {
    lat: incident.place.lat,
    lng: incident.place.lng,
    radiusKm: opts.radiusKm,
    fromIso: new Date(t - windowHours * 3_600_000).toISOString(),
    toIso: new Date(t + windowHours * 3_600_000).toISOString(),
    incidentIso: new Date(t).toISOString(),
    pickHex: opts.pickHex,
  };
}

/** 사건 앵커 → 군용기 항적 이력 */
export async function freezeAdsbEvidence(
  db: AppDb,
  query: AdsbFreezeQuery,
): Promise<TrackFreezeResult> {
  let coverageStart: string | null = null;
  let rows: Array<typeof adsbTrackHistory.$inferSelect> = [];
  try {
    const cov = await db.select({ v: min(adsbTrackHistory.ingestedAt) }).from(adsbTrackHistory);
    coverageStart = cov[0]?.v ?? null;
    const bbox = radiusToBbox(query.lat, query.lng, query.radiusKm);
    rows = await db
      .select()
      .from(adsbTrackHistory)
      .where(
        and(
          gte(adsbTrackHistory.lat, bbox.south),
          lte(adsbTrackHistory.lat, bbox.north),
          gte(adsbTrackHistory.lng, bbox.west),
          lte(adsbTrackHistory.lng, bbox.east),
          gte(adsbTrackHistory.sampledAt, query.fromIso),
          lte(adsbTrackHistory.sampledAt, query.toIso),
        ),
      )
      .limit(4000);
  } catch {
    coverageStart = null;
  }

  const candidates = closestPerTarget(
    rows,
    (r) => r.hex,
    { lat: query.lat, lng: query.lng },
    query.radiusKm,
  );
  const chosen = candidates.find((c) => c.row.hex === query.pickHex) ?? candidates[0] ?? null;

  const pick = chosen
    ? {
        id: chosen.row.id,
        hex: chosen.row.hex,
        callsign: chosen.row.callsign,
        registration: chosen.row.registration,
        type: chosen.row.type,
        lat: chosen.row.lat,
        lng: chosen.row.lng,
        altitude: chosen.row.altitude,
        timestamp: chosen.row.sampledAt,
        distanceKm: round1(chosen.distanceKm),
      }
    : null;
  const nearby = candidates.slice(0, 20).map((c) => ({
    hex: c.row.hex,
    callsign: c.row.callsign,
    type: c.row.type,
    distanceKm: round1(c.distanceKm),
    at: c.row.sampledAt,
  }));
  const results = pick
    ? { pick, nearby, nearbyCount: candidates.length, coverageStart }
    : { hits: nearby, coverageStart, coverage: coverageNote(coverageStart, query.fromIso) };

  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "adsb",
    queriedAt: new Date().toISOString(),
    query: {
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      fromIso: query.fromIso,
      toIso: query.toIso,
      provider: "adsb_track_history",
      pickHex: pick?.hex ?? null,
    },
    resultHash: "",
    resultCount: candidates.length,
    results,
    pickId: pick?.id,
  });

  return {
    payload,
    pick: pick
      ? {
          id: pick.id,
          label: pick.callsign || pick.registration || pick.hex,
          lat: pick.lat,
          lng: pick.lng,
          distanceKm: pick.distanceKm,
          timestamp: pick.timestamp,
        }
      : null,
    hits: candidates.length,
    gaps: [],
    coverageStart,
  };
}

/** 근거 한계 문구 — 끊김·수집 범위를 숨기지 않는다 */
export function trackLimitsText(
  base: string,
  result: Pick<TrackFreezeResult, "gaps" | "coverageStart">,
  fromIso: string,
): string {
  const parts = [base];
  const covering = result.gaps.find((g) => g.coversIncident);
  if (covering) {
    parts.push(
      `사건 시각이 신호 끊김 구간(${covering.minutes}분, ${covering.fromIso.slice(11, 16)}–${covering.toIso.slice(11, 16)} UTC) 안 — 그 시각 위치는 확인 못 함`,
    );
  } else if (result.gaps.length) {
    parts.push(`조회 구간 안 신호 끊김 ${result.gaps.length}회 (최장 ${Math.max(...result.gaps.map((g) => g.minutes))}분)`);
  }
  const cov = coverageNote(result.coverageStart, fromIso);
  if (cov) parts.push(cov);
  return parts.join(" · ");
}
