/**
 * 피격 확인 — D1 읽기 쪽.
 *  사건: ukmto_incidents (공격·승선·납치 등, 경보·권고는 제외)
 *  항적: ais_position_history (30분 버킷, migration 0031) → 부족하면 Datalastic 으로 보강(키 있을 때만)
 *  신원: vessel_identity (aisstream 정적 메시지의 IMO, migration 0033) → 없으면 ais_vessels 의 선종
 */

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { aisPositionHistory, aisVessels, strikeNamed, strikeSnapshot, ukmtoIncidents, vesselIdentity } from "@/db/schema";
import type { CandidateWeather } from "@/lib/strikeSnapshot";
import { extractShipName } from "@/lib/strikeMatch/shipName";
import {
  GENERIC_NAMES,
  normalizeShipName,
  scoreCandidates,
  summarizeMatch,
  type MatchStatus,
  type ScoredCandidate,
  type StrikeIncident,
  type VesselTrack,
} from "@/lib/strikeMatch/scoreCandidates";
import { datalasticEnabled, enrichWithDatalastic } from "@/lib/strikeMatch/datalastic";
import { isStrikeType } from "@/lib/strikeMatch/strikeType";

export { isStrikeType };

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

/** 후보 + (스냅샷 때 받아 둔) 그 위치의 날씨 */
export type WeatheredCandidate = ScoredCandidate & { weather?: CandidateWeather };

export type StrikeMatchResult = {
  incident: StrikeCase;
  status: MatchStatus;
  top: WeatheredCandidate | null;
  candidates: WeatheredCandidate[];
  nearbyCount: number;
  /** 근거 한계 — 숨기지 않는다 */
  limits: string[];
  /** 선명을 기사에서 가져왔고 AIS 위치로 검증된 경우의 출처 (UKMTO 가 선명을 공개하지 않을 때) */
  nameSource?: NameSource;
  trackSource: "ais_position_history" | "ais_position_history+datalastic";
  /** 기사 보도 선명(위치 검증 전) — 확정 아님 */
  reportedNames?: ReportedName[];
};

export type NameSource = {
  name: string;
  /** 같은 이름을 낸 서로 다른 매체 수 */
  outlets: number;
  /** 사건 시각 추정 위치와 사건 지점의 거리(km) — AIS 검증 */
  distKm: number | null;
  sources: Array<{ url: string; outlet: string | null; headline: string; publishedAt: string | null }>;
};

type UkmtoRow = typeof ukmtoIncidents.$inferSelect;

/** UKMTO 가 선명 대신 쓰는 자리표시(".", "-", MERCHANT, TKR …)인가 */
function reportedNameUnusable(name: string | null): boolean {
  if (!name) return true;
  const n = normalizeShipName(name);
  return n.length < 3 || GENERIC_NAMES.has(n);
}

/** 기사에서 뽑고 AIS 위치로 검증된 선명 (migration 0039 전이면 빈 배열) */
export async function loadVerifiedNames(db: AppDb, incidentId: string): Promise<NameSource[]> {
  try {
    const rows = await db
      .select()
      .from(strikeNamed)
      .where(and(eq(strikeNamed.incidentId, incidentId), eq(strikeNamed.status, "verified")));
    return rows.map((r) => {
      let sources: NameSource["sources"] = [];
      try {
        const parsed = JSON.parse(r.sources) as unknown;
        if (Array.isArray(parsed)) sources = parsed as NameSource["sources"];
      } catch {
        // 깨진 JSON — 출처 없이 진행
      }
      return { name: r.name, outlets: r.outlets, distKm: r.distKm, sources };
    });
  } catch {
    return [];
  }
}

export type ReportedName = {
  name: string;
  imo: string | null;
  mmsi: string | null;
  outlets: number;
  /** new: 아직 위치 검증 전 · unresolved: 사건 시각 항적 자료가 없어 검증 못 함 */
  status: "new" | "unresolved";
  sources: NameSource["sources"];
};

/**
 * 기사가 보도한 선명 중 아직 위치로 검증되지 않은 것. 확정이 아니라 "기사가 이렇게 보도했다"일 뿐이다.
 * AIS 수신 공백으로 항적 후보가 없을 때도 사용자가 이름·IMO 단서를 볼 수 있게 한다. 테이블이 없으면 빈 배열.
 */
export async function loadReportedNames(db: AppDb, incidentId: string): Promise<ReportedName[]> {
  try {
    const rows = await db
      .select()
      .from(strikeNamed)
      .where(and(eq(strikeNamed.incidentId, incidentId), inArray(strikeNamed.status, ["new", "unresolved"])));
    return rows
      .sort((a, b) => b.outlets - a.outlets)
      .slice(0, 3)
      .map((r) => {
        let sources: NameSource["sources"] = [];
        try {
          const parsed = JSON.parse(r.sources) as unknown;
          if (Array.isArray(parsed)) sources = parsed as NameSource["sources"];
        } catch {
          // 깨진 JSON — 출처 없이 진행
        }
        return { name: r.name, imo: r.imo, mmsi: r.mmsi, outlets: r.outlets, status: r.status as "new" | "unresolved", sources };
      });
  } catch {
    return [];
  }
}

/** 스냅샷 때 후보 선박 위치에서 받아 둔 날씨 (mmsi → 날씨). 스냅샷 전이거나 테이블이 없으면 빈 맵. */
export async function loadCandidateWeather(db: AppDb, incidentId: string): Promise<Map<string, CandidateWeather>> {
  const out = new Map<string, CandidateWeather>();
  try {
    const rows = await db
      .select({ candidates: strikeSnapshot.candidates })
      .from(strikeSnapshot)
      .where(eq(strikeSnapshot.incidentId, incidentId))
      .limit(1);
    const arr = JSON.parse(rows[0]?.candidates ?? "[]") as unknown;
    if (Array.isArray(arr)) {
      for (const c of arr as Array<{ mmsi?: unknown; weather?: CandidateWeather }>) {
        if (typeof c?.mmsi === "string" && c.weather) out.set(c.mmsi, c.weather);
      }
    }
  } catch {
    // 테이블 없음·깨진 JSON — 날씨 없이 진행
  }
  return out;
}

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

  // UKMTO 가 선명을 안 냈으면 기사에서 뽑아 AIS 로 검증한 이름을 쓴다 — 검증된 이름이 둘 이상이면 하나를 고르지 않는다
  let nameSource: NameSource | undefined;
  let scoringName = c.reportedVesselName;
  if (reportedNameUnusable(c.reportedVesselName)) {
    const named = await loadVerifiedNames(db, c.id);
    if (named.length === 1) {
      nameSource = named[0];
      scoringName = named[0]!.name;
      limits.push(
        `선명은 기사 ${named[0]!.outlets}곳 보도 + AIS 위치 검증${named[0]!.distKm != null ? `(사건 시각 ${Math.round(named[0]!.distKm)}km 이내)` : ""} — UKMTO 는 선명을 공개하지 않음`,
      );
    } else if (named.length > 1) {
      limits.push(`기사마다 다른 선명(${named.map((n) => n.name).join(", ")})이 검증돼 하나로 못 정함`);
    }
  }

  const incident: StrikeIncident = {
    lat: c.lat,
    lng: c.lng,
    atIso: c.occurredAt,
    vesselType: c.reportedVesselType,
    vesselName: scoringName,
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
  if (!scoringName) limits.push("경보에 선명이 없어 '확인'은 불가 — 항적 정황으로만 판단");
  if (s.top && !s.top.imo) limits.push("1순위 후보의 IMO 미수신 — MMSI 로만 식별");

  const wx = await loadCandidateWeather(db, c.id);
  // 검증된 이름이 있으면 그걸 쓰므로, 없을 때만 '보도 선명(미검증)'을 단서로 붙인다
  const reportedNames = nameSource ? [] : await loadReportedNames(db, c.id);
  const withWx = (x: ScoredCandidate): WeatheredCandidate => (wx.has(x.mmsi) ? { ...x, weather: wx.get(x.mmsi)! } : x);

  return {
    incident: c,
    status: s.status,
    top: s.top ? withWx(s.top) : null,
    candidates: candidates.slice(0, 10).map(withWx),
    nearbyCount: s.nearbyCount,
    limits,
    ...(nameSource ? { nameSource } : {}),
    ...(reportedNames.length ? { reportedNames } : {}),
    trackSource,
  };
}
