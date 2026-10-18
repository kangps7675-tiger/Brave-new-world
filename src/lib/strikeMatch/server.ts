/**
 * 피격 확인 — D1 읽기 쪽.
 *  사건: ukmto_incidents (공격·승선·납치 등, 경보·권고는 제외)
 *  항적: ais_position_history (30분 버킷, migration 0031) → 부족하면 Datalastic 으로 보강(키 있을 때만)
 *  신원: vessel_identity (aisstream 정적 메시지의 IMO, migration 0033) → 없으면 ais_vessels 의 선종
 */

import { and, desc, gte, inArray, lte } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { aisPositionHistory, aisVessels, ukmtoIncidents, vesselIdentity } from "@/db/schema";
import { extractShipName } from "@/lib/strikeMatch/shipName";
import {
  scoreCandidates,
  summarizeMatch,
  type MatchStatus,
  type ScoredCandidate,
  type StrikeIncident,
  type VesselTrack,
} from "@/lib/strikeMatch/scoreCandidates";
import { datalasticEnabled, enrichWithDatalastic } from "@/lib/strikeMatch/datalastic";

/**
 * 상선 피격으로 보는 UKMTO 유형 — 권고·의심활동은 "맞은 배"가 없을 수 있어 뺀다.
 * workers/cron-ingest/src/ukmto.ts 의 isPushWorthy 와 같은 기준 (어긋나면 푸시는 왔는데 피격 목록엔 없는 일이 생김)
 */
const STRIKE_TYPE_RE = /attack|board|hijack|seiz|piracy|detain/i;
const NON_STRIKE_RE = /advisory|suspicious|warning|approach/i;

export function isStrikeType(typeName: string | null | undefined): boolean {
  if (!typeName) return false;
  return STRIKE_TYPE_RE.test(typeName) && !NON_STRIKE_RE.test(typeName);
}

export type StrikeCase = {
  id: string;
  source: "ukmto";
  typeName: string;
  occurredAt: string;
  lat: number;
  lng: number;
  place: string | null;
  region: string | null;
  reportedVesselName: string | null;
  reportedVesselType: string | null;
  detail: string | null;
};

export type StrikeMatchResult = {
  incident: StrikeCase;
  status: MatchStatus;
  top: ScoredCandidate | null;
  candidates: ScoredCandidate[];
  nearbyCount: number;
  /** 근거 한계 — 숨기지 않는다 */
  limits: string[];
  trackSource: "ais_position_history" | "ais_position_history+datalastic";
};

type UkmtoRow = typeof ukmtoIncidents.$inferSelect;

function toCase(r: UkmtoRow): StrikeCase | null {
  const occurredAt = r.utcDateOfIncident || r.utcDateCreated;
  if (!occurredAt || !Number.isFinite(Date.parse(occurredAt))) return null;
  return {
    id: r.id,
    source: "ukmto",
    typeName: r.incidentTypeName,
    occurredAt: new Date(Date.parse(occurredAt)).toISOString(),
    lat: r.lat,
    lng: r.lng,
    place: r.place,
    region: r.region,
    reportedVesselName: r.vesselName || extractShipName(r.detail),
    reportedVesselType: r.vesselType,
    detail: r.detail,
  };
}

export async function listStrikeCases(
  db: AppDb,
  opts: { days?: number; limit?: number } = {},
): Promise<StrikeCase[]> {
  const days = opts.days ?? 60;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await db
    .select()
    .from(ukmtoIncidents)
    .where(gte(ukmtoIncidents.utcDateOfIncident, since))
    .orderBy(desc(ukmtoIncidents.utcDateOfIncident))
    .limit(200);
  return rows
    .filter((r) => isStrikeType(r.incidentTypeName))
    .map(toCase)
    .filter((c): c is StrikeCase => c !== null)
    .slice(0, opts.limit ?? 20);
}

export async function getStrikeCase(db: AppDb, id: string): Promise<StrikeCase | null> {
  const rows = await db.select().from(ukmtoIncidents).where(inArray(ukmtoIncidents.id, [id])).limit(1);
  return rows[0] ? toCase(rows[0]) : null;
}

function bbox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { south: lat - dLat, north: lat + dLat, west: lng - dLng, east: lng + dLng };
}

/** 사건 주변 ±hours 항적을 선박별로 묶는다 */
export async function loadTracksNear(
  db: AppDb,
  c: Pick<StrikeCase, "lat" | "lng" | "occurredAt">,
  opts: { radiusKm: number; hours: number },
): Promise<{ tracks: VesselTrack[]; coverageStart: string | null }> {
  const t = Date.parse(c.occurredAt);
  const fromIso = new Date(t - opts.hours * 3_600_000).toISOString();
  const toIso = new Date(t + opts.hours * 3_600_000).toISOString();
  // 선명 일치는 150km 까지 봐주므로 조회는 넉넉히
  const b = bbox(c.lat, c.lng, Math.max(opts.radiusKm, 150));

  let coverageStart: string | null = null;
  try {
    const first = await db
      .select({ at: aisPositionHistory.sampledAt })
      .from(aisPositionHistory)
      .orderBy(aisPositionHistory.sampledAt)
      .limit(1);
    coverageStart = first[0]?.at ?? null;
  } catch {
    return { tracks: [], coverageStart: null };
  }

  const rows = await db
    .select()
    .from(aisPositionHistory)
    .where(
      and(
        gte(aisPositionHistory.lat, b.south),
        lte(aisPositionHistory.lat, b.north),
        gte(aisPositionHistory.lng, b.west),
        lte(aisPositionHistory.lng, b.east),
        gte(aisPositionHistory.sampledAt, fromIso),
        lte(aisPositionHistory.sampledAt, toIso),
      ),
    )
    .limit(6000);

  const byMmsi = new Map<string, VesselTrack>();
  for (const r of rows) {
    let v = byMmsi.get(r.mmsi);
    if (!v) {
      v = { mmsi: r.mmsi, name: r.shipName, imo: null, shipType: null, category: r.category, points: [] };
      byMmsi.set(r.mmsi, v);
    }
    if (!v.name && r.shipName) v.name = r.shipName;
    v.points.push({ lat: r.lat, lng: r.lng, sog: r.sog, cog: r.cog, sampledAt: r.sampledAt });
  }

  const mmsis = [...byMmsi.keys()];
  // D1 바인딩 변수 한도(100) 때문에 나눠서 조회
  for (let i = 0; i < mmsis.length; i += 90) {
    const chunk = mmsis.slice(i, i + 90);
    try {
      const ids = await db.select().from(vesselIdentity).where(inArray(vesselIdentity.mmsi, chunk));
      for (const id of ids) {
        const v = byMmsi.get(id.mmsi);
        if (!v) continue;
        v.imo = id.imo ?? v.imo;
        v.shipType = id.shipType ?? v.shipType;
        v.name = v.name || id.shipName;
      }
    } catch {
      // vessel_identity 마이그레이션 전 — IMO 없이 진행
    }
    const latest = await db
      .select({ mmsi: aisVessels.mmsi, shipType: aisVessels.shipType, shipName: aisVessels.shipName })
      .from(aisVessels)
      .where(inArray(aisVessels.mmsi, chunk));
    for (const a of latest) {
      const v = byMmsi.get(a.mmsi);
      if (!v) continue;
      v.shipType = v.shipType ?? a.shipType;
      v.name = v.name || a.shipName;
    }
  }

  return { tracks: [...byMmsi.values()], coverageStart };
}

export async function matchStrikeCase(
  db: AppDb,
  c: StrikeCase,
  opts: { radiusKm?: number; hours?: number; enrich?: boolean } = {},
): Promise<StrikeMatchResult> {
  const radiusKm = opts.radiusKm ?? 60;
  const hours = opts.hours ?? 6;
  const limits: string[] = [];
  const { tracks, coverageStart } = await loadTracksNear(db, c, { radiusKm, hours });

  if (!coverageStart) limits.push("AIS 위치 이력 수집 전 — 이 사건은 항적으로 확인할 수 없음");
  else if (c.occurredAt < coverageStart) {
    limits.push(`AIS 위치 이력은 ${coverageStart.slice(0, 10)}부터 — 그 이전 사건은 항적 자료 없음`);
  }

  const incident: StrikeIncident = {
    lat: c.lat,
    lng: c.lng,
    atIso: c.occurredAt,
    vesselType: c.reportedVesselType,
    vesselName: c.reportedVesselName,
  };
  let candidates = scoreCandidates(incident, tracks, { radiusKm });
  let trackSource: StrikeMatchResult["trackSource"] = "ais_position_history";

  // 상위 후보 몇 척만 유료 API 로 보강 (크레딧 아끼기)
  if (opts.enrich !== false && datalasticEnabled() && candidates.length) {
    const top = candidates.slice(0, 5).map((x) => x.mmsi);
    const enriched = await enrichWithDatalastic(
      tracks.filter((t) => top.includes(t.mmsi)),
      { fromIso: new Date(Date.parse(c.occurredAt) - hours * 3_600_000).toISOString(), toIso: new Date(Date.parse(c.occurredAt) + hours * 3_600_000).toISOString() },
    );
    if (enriched.used) {
      const merged = tracks.map((t) => enriched.tracks.find((e) => e.mmsi === t.mmsi) ?? t);
      candidates = scoreCandidates(incident, merged, { radiusKm });
      trackSource = "ais_position_history+datalastic";
    }
    limits.push(...enriched.errors.map((e) => `Datalastic 보강 실패: ${e}`));
  }

  const s = summarizeMatch(candidates);
  if (s.status === "unknown" && coverageStart && c.occurredAt >= coverageStart) {
    limits.push("사건 주변에 AIS 기록이 없음 — 수신 공백일 수 있음 (\"아무 배도 없었다\"는 뜻이 아님)");
  }
  if (!c.reportedVesselName) limits.push("경보에 선명이 없어 '확인'은 불가 — 항적 정황으로만 판단");
  if (s.top && !s.top.imo) limits.push("1순위 후보의 IMO 미수신 — MMSI 로만 식별");

  return {
    incident: c,
    status: s.status,
    top: s.top,
    candidates: candidates.slice(0, 10),
    nearbyCount: s.nearbyCount,
    limits,
    trackSource,
  };
}
