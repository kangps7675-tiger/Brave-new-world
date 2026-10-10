/**
 * 서버가 직접 조회한 근거 스냅샷.
 * 클라이언트가 만든 frozenPayload는 센서 출처에서 인정하지 않는다.
 * 스냅샷은 HMAC(proofSig)으로 봉인 — 저장되는 {query, results}까지 서명한다.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, gte, lte } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { aisVessels, firmsFires } from "@/db/schema";
import {
  radiusToBbox,
  resolveAirRaidHistoryWindow,
  searchAirRaidHistory,
  type AirRaidHistorySearchInput,
  type AirRaidHistorySearchResult,
} from "@/lib/airRaidHistorySearch";
import { haversineKm } from "@/lib/conflictEvents/geo";
import { commercialUseForSourceKey } from "@/lib/caseFile/commercialUse";
import { fetchFirmsArchive } from "@/lib/caseFile/firmsArchive";
import { evidenceSourceKind } from "@/lib/caseFile/sourceKind";
import type { EvidenceSourceKind } from "@/lib/caseFile/sourceKind";
import {
  clampEvidenceStrength,
  strengthCapFor,
} from "@/lib/caseFile/strengthCaps";
import type {
  CaseIncident,
  ClaimKind,
  EvidenceLink,
  EvidenceRelevance,
  EvidenceRole,
  EvidenceStrength,
} from "@/lib/caseFile/types";

export const SERVER_PROVEN_FLAG = "serverProven" as const;

/** FIRMS: 사건 시각 ±이 창을 넘으면 맥락으로 강등 */
export const FIRMS_TIME_WINDOW_HOURS = 12;
/** 공습 이력: 사건 시각 기준 기본 창 */
export const AIR_RAID_DEFAULT_WINDOW_HOURS = 2;
/** AIS: 사건 시각 ±기본 창 */
export const AIS_DEFAULT_WINDOW_HOURS = 6;

export type ServerFrozenPayload = {
  [SERVER_PROVEN_FLAG]: true;
  sourceKind: EvidenceSourceKind;
  queriedAt: string;
  query: Record<string, unknown>;
  resultHash: string;
  resultCount: number;
  /** 선택 히트 또는 요약 목록 (크기 제한) — 해시·서명 대상 */
  results: unknown;
  pickId?: string;
  /** HMAC-SHA256 hex — sealServerFrozenPayload가 붙임 */
  proofSig: string;
};

export type ServerFrozenPayloadUnsigned = Omit<ServerFrozenPayload, "proofSig">;

/** 전용 키만 사용 — 편집 토큰(CASE_EDITOR_SECRET)과 분리 */
export function evidenceHmacSecret(): string | null {
  const dedicated = process.env.CASE_EVIDENCE_HMAC_SECRET?.trim();
  return dedicated || null;
}

/** 저장되는 그대로의 {query, results} 해시 */
export function hashStoredProvenBody(
  query: Record<string, unknown>,
  results: unknown,
): string {
  return hashCanonicalJson({ query, results });
}

function signingMaterial(payload: ServerFrozenPayloadUnsigned): string {
  const bodyHash = hashStoredProvenBody(payload.query, payload.results);
  return [
    payload.sourceKind,
    payload.queriedAt,
    bodyHash,
    String(payload.resultCount),
    payload.pickId ?? "",
  ].join("\n");
}

/** 조회 직후 봉인 — CASE_EVIDENCE_HMAC_SECRET 없으면 throw */
export function sealServerFrozenPayload(
  payload: ServerFrozenPayloadUnsigned,
): ServerFrozenPayload {
  const secret = evidenceHmacSecret();
  if (!secret) {
    throw new Error(
      "CASE_EVIDENCE_HMAC_SECRET 이 필요합니다 (근거 봉인 — 편집 토큰과 분리)",
    );
  }
  const resultHash = hashStoredProvenBody(payload.query, payload.results);
  const toSign: ServerFrozenPayloadUnsigned = { ...payload, resultHash };
  const proofSig = createHmac("sha256", secret)
    .update(signingMaterial(toSign))
    .digest("hex");
  return { ...toSign, proofSig };
}

/** 형태만 확인 (서명 검증 없음) */
export function isServerProvenPayload(
  payload: unknown,
): payload is ServerFrozenPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      (payload as { serverProven?: unknown }).serverProven === true &&
      typeof (payload as { resultHash?: unknown }).resultHash === "string" &&
      typeof (payload as { proofSig?: unknown }).proofSig === "string" &&
      typeof (payload as { sourceKind?: unknown }).sourceKind === "string" &&
      typeof (payload as { queriedAt?: unknown }).queriedAt === "string" &&
      typeof (payload as { resultCount?: unknown }).resultCount === "number" &&
      (payload as { query?: unknown }).query != null &&
      typeof (payload as { query?: unknown }).query === "object",
  );
}

/** HMAC + 저장본 {query,results} 해시 재계산 검증 */
export function verifyServerProvenPayload(
  payload: unknown,
): payload is ServerFrozenPayload {
  if (!isServerProvenPayload(payload)) return false;
  const secret = evidenceHmacSecret();
  if (!secret) return false;

  const recomputedHash = hashStoredProvenBody(payload.query, payload.results);
  if (recomputedHash !== payload.resultHash) return false;

  const { proofSig, ...rest } = payload;
  const expected = createHmac("sha256", secret)
    .update(signingMaterial(rest))
    .digest("hex");
  try {
    const a = Buffer.from(proofSig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** 센서 출처 — 서버 증명 필수 */
export function requiresServerProof(kind: EvidenceSourceKind): boolean {
  return (
    kind === "firms" ||
    kind === "neptun" ||
    kind === "tzeva-adom" ||
    kind === "ais" ||
    kind === "adsb" ||
    kind === "control-zone" ||
    kind === "facility"
  );
}

export function hashCanonicalJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function newEvidenceId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type FirmsFreezeQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
  /** YYYY-MM-DD — acqDate 필터 (없으면 최근 ingest만) */
  fromDate?: string;
  toDate?: string;
  /** 사건 시각 — 있으면 ±FIRMS_TIME_WINDOW_HOURS 안의 열점만 */
  centerIso?: string;
  max?: number;
  pickId?: string;
};

export type FirmsFreezeResult = {
  payload: ServerFrozenPayload;
  pick: {
    id: string;
    lat: number;
    lng: number;
    distanceKm: number;
    acqDate: string | null;
    acqTime: string | null;
    frp: number | null;
    confidence: string | null;
  } | null;
  hits: number;
};

/** YYYY-MM-DD + HHmm(UTC) → ISO */
export function firmsAcqToIso(
  acqDate: string | null | undefined,
  acqTime: string | null | undefined,
): string | null {
  if (!acqDate || !/^\d{4}-\d{2}-\d{2}$/.test(acqDate)) return null;
  const digits = (acqTime ?? "0000").replace(/\D/g, "").padStart(4, "0").slice(0, 4);
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const iso = `${acqDate}T${hh}:${mm}:00.000Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

export function formatTimeDeltaMinutes(deltaMin: number): string {
  const sign = deltaMin >= 0 ? "+" : "−";
  const abs = Math.abs(Math.round(deltaMin));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}분`;
  if (m === 0) return `${sign}${h}시간`;
  return `${sign}${h}시간 ${m}분`;
}

export function buildEvidenceRelevance(args: {
  incident: CaseIncident;
  evidenceLat: number | null;
  evidenceLng: number | null;
  evidenceAtIso: string | null;
}): EvidenceRelevance {
  let distanceKm: number | null = null;
  if (
    args.incident.place &&
    args.evidenceLat != null &&
    args.evidenceLng != null &&
    Number.isFinite(args.evidenceLat) &&
    Number.isFinite(args.evidenceLng)
  ) {
    distanceKm =
      Math.round(
        haversineKm(
          { lat: args.incident.place.lat, lng: args.incident.place.lng },
          { lat: args.evidenceLat, lng: args.evidenceLng },
        ) * 10,
      ) / 10;
  }

  let timeDeltaMinutes: number | null = null;
  if (args.incident.occurredAt && args.evidenceAtIso) {
    const a = Date.parse(args.incident.occurredAt);
    const b = Date.parse(args.evidenceAtIso);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      timeDeltaMinutes = Math.round((b - a) / 60_000);
    }
  }

  const parts: string[] = [];
  if (distanceKm != null) {
    parts.push(`사건 지점에서 ${distanceKm}km`);
  }
  if (timeDeltaMinutes != null) {
    parts.push(`주장 시각 ${formatTimeDeltaMinutes(timeDeltaMinutes)}`);
  }
  return {
    distanceKm,
    timeDeltaMinutes,
    summary: parts.length ? parts.join(", ") : "사건 앵커와 거리·시간 비교 불가",
  };
}

/**
 * 사건 앵커 → FIRMS 조회. 클라이언트가 보낸 lat/lng/날짜는 쓰지 않는다.
 */
export function resolveFirmsQueryFromIncident(
  incident: CaseIncident,
  opts: { radiusKm: number; pickId?: string; max?: number },
): FirmsFreezeQuery | { error: string } {
  if (!incident.place) {
    return { error: "사건 위치가 필요합니다. 위치·시각을 먼저 설정하세요." };
  }
  if (!incident.occurredAt) {
    return { error: "사건 시각이 필요합니다. 위치·시각을 먼저 설정하세요." };
  }
  const t = Date.parse(incident.occurredAt);
  if (!Number.isFinite(t)) {
    return { error: "사건 시각 형식이 올바르지 않습니다" };
  }
  if (!(opts.radiusKm > 0) || opts.radiusKm > 200) {
    return { error: "radiusKm 은 0 초과 200 이하" };
  }
  const from = new Date(t - FIRMS_TIME_WINDOW_HOURS * 3_600_000);
  const to = new Date(t + FIRMS_TIME_WINDOW_HOURS * 3_600_000);
  return {
    lat: incident.place.lat,
    lng: incident.place.lng,
    radiusKm: opts.radiusKm,
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    centerIso: new Date(t).toISOString(),
    pickId: opts.pickId,
    max: opts.max,
  };
}

/**
 * 사건 앵커 → 공습 이력 조회. at/from/to는 서버가 사건 시각으로 정한다.
 */
export function resolveAirRaidQueryFromIncident(
  incident: CaseIncident,
  opts: {
    radiusKm: number;
    windowHours?: number;
    sources?: Array<"neptun" | "tzeva-adom">;
    pickThreatId?: string;
    pickAlertId?: string;
  },
): AirRaidFreezeQuery | { error: string } {
  if (!incident.place) {
    return { error: "사건 위치가 필요합니다. 위치·시각을 먼저 설정하세요." };
  }
  if (!incident.occurredAt) {
    return { error: "사건 시각이 필요합니다. 위치·시각을 먼저 설정하세요." };
  }
  if (!Number.isFinite(Date.parse(incident.occurredAt))) {
    return { error: "사건 시각 형식이 올바르지 않습니다" };
  }
  if (!(opts.radiusKm > 0) || opts.radiusKm > 200) {
    return { error: "radiusKm 은 0 초과 200 이하" };
  }
  const windowHours =
    typeof opts.windowHours === "number" &&
    opts.windowHours > 0 &&
    opts.windowHours <= 72
      ? opts.windowHours
      : AIR_RAID_DEFAULT_WINDOW_HOURS;
  return {
    lat: incident.place.lat,
    lng: incident.place.lng,
    radiusKm: opts.radiusKm,
    at: incident.occurredAt,
    windowHours,
    sources: opts.sources,
    pickThreatId: opts.pickThreatId,
    pickAlertId: opts.pickAlertId,
  };
}

/**
 * 거리·시간차 기록 + FIRMS ±12h 밖이면 맥락 강등.
 */
export function applyEvidenceRelevance(
  link: EvidenceLink,
  relevance: EvidenceRelevance,
  opts?: { demoteFirmsOutsideWindow?: boolean },
): EvidenceLink {
  const kind = evidenceSourceKind(link.sourceKey);
  let role = link.role;
  let strength = link.strength;
  let limits = link.limits;
  let shows = link.shows;

  const outsideFirmsWindow =
    opts?.demoteFirmsOutsideWindow !== false &&
    kind === "firms" &&
    relevance.timeDeltaMinutes != null &&
    Math.abs(relevance.timeDeltaMinutes) > FIRMS_TIME_WINDOW_HOURS * 60;

  if (outsideFirmsWindow && role !== "context") {
    role = "context";
    strength = "weak";
    limits = `${limits} [서버: 사건 시각 ±${FIRMS_TIME_WINDOW_HOURS}h 밖 — 맥락]`.trim();
  }

  if (relevance.summary && !shows.includes(relevance.summary)) {
    shows = shows.trim()
      ? `${shows.trim()} (${relevance.summary})`
      : relevance.summary;
  }

  return { ...link, role, strength, shows, limits, relevance };
}

type FirmsCompactHit = {
  id: string;
  lat: number;
  lng: number;
  frp: number | null;
  brightness: number | null;
  confidence: string | null;
  acqDate: string | null;
  acqTime: string | null;
  satellite: string | null;
  distanceKm: number;
};

function withinFirmsWindow(hit: FirmsCompactHit, centerIso: string | undefined): boolean {
  if (!centerIso) return true;
  const center = Date.parse(centerIso);
  const at = firmsAcqToIso(hit.acqDate, hit.acqTime);
  if (!Number.isFinite(center) || !at) return true;
  return Math.abs(Date.parse(at) - center) <= FIRMS_TIME_WINDOW_HOURS * 3_600_000;
}

export async function freezeFirmsEvidence(
  db: AppDb,
  query: FirmsFreezeQuery,
): Promise<FirmsFreezeResult> {
  const max = Math.min(query.max ?? 80, 200);

  // 과거 사건: NASA API를 날짜로 직접 조회. 키가 없거나 날짜가 없으면 D1(최근 48h) 폴백
  const archive =
    query.fromDate && query.toDate
      ? await fetchFirmsArchive({
          lat: query.lat,
          lng: query.lng,
          radiusKm: query.radiusKm,
          fromDate: query.fromDate,
          toDate: query.toDate,
        })
      : null;

  const compact: FirmsCompactHit[] = archive
    ? archive.hits
        .map((h) => ({
          id: h.id,
          lat: h.lat,
          lng: h.lng,
          frp: h.frp,
          brightness: h.brightness,
          confidence: h.confidence,
          acqDate: h.acqDate,
          acqTime: h.acqTime,
          satellite: h.satellite ?? h.source,
          distanceKm: h.distanceKm,
        }))
        .filter((h) => withinFirmsWindow(h, query.centerIso))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, max)
    : (await queryFirmsFromD1(db, query, max)).filter((h) =>
        withinFirmsWindow(h, query.centerIso),
      );

  const pick =
    compact.find((c) => c.id === query.pickId) ?? compact[0] ?? null;

  const queryMeta = {
    lat: query.lat,
    lng: query.lng,
    radiusKm: query.radiusKm,
    fromDate: query.fromDate ?? null,
    toDate: query.toDate ?? null,
    centerIso: query.centerIso ?? null,
    provider: archive ? "nasa-firms-api" : "d1-recent-48h",
    sourcesQueried: archive?.sources ?? null,
    sourcesFailed: archive?.failed ?? null,
    pickId: pick?.id ?? null,
  };
  const results = pick
    ? { pick, nearbyCount: compact.length }
    : { hits: compact };

  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "firms",
    queriedAt: new Date().toISOString(),
    query: queryMeta,
    resultHash: "",
    resultCount: compact.length,
    results,
    pickId: pick?.id,
  });

  return {
    payload,
    pick: pick
      ? {
          id: pick.id,
          lat: pick.lat,
          lng: pick.lng,
          distanceKm: pick.distanceKm,
          acqDate: pick.acqDate,
          acqTime: pick.acqTime,
          frp: pick.frp,
          confidence: pick.confidence,
        }
      : null,
    hits: compact.length,
  };
}

async function queryFirmsFromD1(
  db: AppDb,
  query: FirmsFreezeQuery,
  max: number,
): Promise<FirmsCompactHit[]> {
  const bbox = radiusToBbox(query.lat, query.lng, query.radiusKm);
  const rows = await db
    .select()
    .from(firmsFires)
    .where(
      and(
        gte(firmsFires.lat, bbox.south),
        lte(firmsFires.lat, bbox.north),
        gte(firmsFires.lng, bbox.west),
        lte(firmsFires.lng, bbox.east),
      ),
    )
    .orderBy(desc(firmsFires.ingestedAt))
    .limit(max * 3);

  const filtered = rows
    .map((row) => {
      const distanceKm = haversineKm(
        { lat: query.lat, lng: query.lng },
        { lat: row.lat, lng: row.lng },
      );
      return { row, distanceKm };
    })
    .filter(({ row, distanceKm }) => {
      if (distanceKm > query.radiusKm) return false;
      const d = row.acqDate ?? "";
      if (query.fromDate && d && d < query.fromDate) return false;
      if (query.toDate && d && d > query.toDate) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, max);

  return filtered.map(({ row, distanceKm }) => ({
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    frp: row.frp,
    brightness: row.brightness,
    confidence: row.confidence,
    acqDate: row.acqDate,
    acqTime: row.acqTime,
    satellite: row.satellite,
    distanceKm: Math.round(distanceKm * 10) / 10,
  }));
}

export type AirRaidFreezeQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
  at?: string;
  from?: string;
  to?: string;
  windowHours?: number;
  sources?: Array<"neptun" | "tzeva-adom">;
  pickThreatId?: string;
  pickAlertId?: string;
};

export type AirRaidFreezeResult = {
  payload: ServerFrozenPayload;
  search: AirRaidHistorySearchResult;
  sourceKind: "neptun" | "tzeva-adom";
};

export async function freezeAirRaidEvidence(
  db: AppDb,
  query: AirRaidFreezeQuery,
): Promise<AirRaidFreezeResult | { error: string }> {
  const window = resolveAirRaidHistoryWindow({
    at: query.at,
    from: query.from,
    to: query.to,
    windowHours: query.windowHours ?? AIR_RAID_DEFAULT_WINDOW_HOURS,
  });
  if ("error" in window) return { error: window.error };

  const sources = query.sources?.length
    ? query.sources
    : (["neptun", "tzeva-adom"] as const);

  const input: AirRaidHistorySearchInput = {
    lat: query.lat,
    lng: query.lng,
    fromIso: window.fromIso,
    toIso: window.toIso,
    radiusKm: query.radiusKm,
    sources: [...sources],
    maxThreats: 40,
    maxAlerts: 60,
  };

  const search = await searchAirRaidHistory(db, input);
  const threat =
    search.threats.find(
      (t) => t.threatId === query.pickThreatId || t.id === query.pickThreatId,
    ) ??
    search.threats[0] ??
    null;
  const alert =
    search.alerts.find((a) => a.id === query.pickAlertId) ??
    (threat ? null : search.alerts[0] ?? null);

  const sourceKind: "neptun" | "tzeva-adom" = threat
    ? "neptun"
    : alert?.source === "tzeva-adom"
      ? "tzeva-adom"
      : "neptun";

  const queryMeta = {
    ...input,
    pickThreatId: threat?.id ?? null,
    pickAlertId: alert?.id ?? null,
  };
  const results = {
    threat: threat
      ? {
          id: threat.id,
          threatId: threat.threatId,
          threatType: threat.threatType,
          lat: threat.lat,
          lon: threat.lon,
          distanceKm: threat.distanceKm,
          sampledAt: threat.sampledAt,
          confidence: threat.confidence,
          sourceCount: threat.sourceCount,
          facets: threat.facets,
        }
      : null,
    alert: alert
      ? {
          id: alert.id,
          source: alert.source,
          regionKey: alert.regionKey,
          regionName: alert.regionName,
          startedAt: alert.startedAt,
          endedAt: alert.endedAt,
          distanceKm: alert.distanceKm,
          evidenceGrade: alert.evidenceGrade,
          facets: alert.facets,
        }
      : null,
    summary: search.summary,
  };

  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind,
    queriedAt: new Date().toISOString(),
    query: queryMeta,
    resultHash: "",
    resultCount: search.threats.length + search.alerts.length,
    results,
    pickId: threat?.id ?? alert?.id,
  });

  return { payload, search, sourceKind };
}

export type AisFreezeQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
  fromIso?: string;
  toIso?: string;
  category?: "military" | "commercial" | "other" | "all";
  pickId?: string;
  pickMmsi?: string;
  max?: number;
};

export type AisFreezePick = {
  id: string;
  mmsi: string;
  shipName: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  category: string;
  timestamp: string | null;
  sog: number | null;
};

export type AisFreezeResult = {
  payload: ServerFrozenPayload;
  pick: AisFreezePick | null;
  hits: number;
};

/**
 * 사건 앵커 → AIS 조회. 클라이언트가 보낸 lat/lng/시각은 쓰지 않는다.
 */
export function resolveAisQueryFromIncident(
  incident: CaseIncident,
  opts: {
    radiusKm: number;
    windowHours?: number;
    category?: AisFreezeQuery["category"];
    pickId?: string;
    pickMmsi?: string;
    max?: number;
  },
): AisFreezeQuery | { error: string } {
  if (!incident.place) {
    return { error: "사건 위치가 필요합니다. 위치·시각을 먼저 설정하세요." };
  }
  if (!incident.occurredAt) {
    return { error: "사건 시각이 필요합니다. 위치·시각을 먼저 설정하세요." };
  }
  const t = Date.parse(incident.occurredAt);
  if (!Number.isFinite(t)) {
    return { error: "사건 시각 형식이 올바르지 않습니다" };
  }
  if (!(opts.radiusKm > 0) || opts.radiusKm > 200) {
    return { error: "radiusKm 은 0 초과 200 이하" };
  }
  const windowHours =
    typeof opts.windowHours === "number" &&
    opts.windowHours > 0 &&
    opts.windowHours <= 72
      ? opts.windowHours
      : AIS_DEFAULT_WINDOW_HOURS;
  const fromIso = new Date(t - windowHours * 3_600_000).toISOString();
  const toIso = new Date(t + windowHours * 3_600_000).toISOString();
  return {
    lat: incident.place.lat,
    lng: incident.place.lng,
    radiusKm: opts.radiusKm,
    fromIso,
    toIso,
    category: opts.category ?? "all",
    pickId: opts.pickId,
    pickMmsi: opts.pickMmsi,
    max: opts.max,
  };
}

export async function freezeAisEvidence(
  db: AppDb,
  query: AisFreezeQuery,
): Promise<AisFreezeResult> {
  const bbox = radiusToBbox(query.lat, query.lng, query.radiusKm);
  const max = Math.min(query.max ?? 80, 200);
  const rows = await db
    .select()
    .from(aisVessels)
    .where(
      and(
        gte(aisVessels.lat, bbox.south),
        lte(aisVessels.lat, bbox.north),
        gte(aisVessels.lng, bbox.west),
        lte(aisVessels.lng, bbox.east),
      ),
    )
    .orderBy(desc(aisVessels.ingestedAt))
    .limit(max * 4);

  const filtered = rows
    .map((row) => {
      const distanceKm = haversineKm(
        { lat: query.lat, lng: query.lng },
        { lat: row.lat, lng: row.lng },
      );
      return { row, distanceKm };
    })
    .filter(({ row, distanceKm }) => {
      if (distanceKm > query.radiusKm) return false;
      if (
        query.category &&
        query.category !== "all" &&
        row.category !== query.category
      ) {
        return false;
      }
      const ts = row.timestamp || row.ingestedAt;
      if (query.fromIso && ts && ts < query.fromIso) return false;
      if (query.toIso && ts && ts > query.toIso) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, max);

  const compact = filtered.map(({ row, distanceKm }) => ({
    id: row.id,
    mmsi: row.mmsi,
    shipName: row.shipName,
    lat: row.lat,
    lng: row.lng,
    sog: row.sog,
    cog: row.cog,
    category: row.category,
    timestamp: row.timestamp,
    ingestedAt: row.ingestedAt,
    distanceKm: Math.round(distanceKm * 10) / 10,
  }));

  const pick =
    compact.find(
      (c) =>
        c.id === query.pickId ||
        (query.pickMmsi && c.mmsi === query.pickMmsi),
    ) ??
    compact[0] ??
    null;

  const queryMeta = {
    lat: query.lat,
    lng: query.lng,
    radiusKm: query.radiusKm,
    fromIso: query.fromIso ?? null,
    toIso: query.toIso ?? null,
    category: query.category ?? "all",
    pickId: pick?.id ?? null,
    pickMmsi: pick?.mmsi ?? null,
  };
  const results = pick
    ? { pick, nearbyCount: compact.length }
    : { hits: compact };

  const payload = sealServerFrozenPayload({
    serverProven: true,
    sourceKind: "ais",
    queriedAt: new Date().toISOString(),
    query: queryMeta,
    resultHash: "",
    resultCount: compact.length,
    results,
    pickId: pick?.id,
  });

  return {
    payload,
    pick: pick
      ? {
          id: pick.id,
          mmsi: pick.mmsi,
          shipName: pick.shipName,
          lat: pick.lat,
          lng: pick.lng,
          distanceKm: pick.distanceKm,
          category: pick.category,
          timestamp: pick.timestamp,
          sog: pick.sog,
        }
      : null,
    hits: compact.length,
  };
}

export type BuildProvenEvidenceInput = {
  claimKind: ClaimKind;
  role: EvidenceRole;
  sourceKey: string;
  payload: ServerFrozenPayload;
  shows: string;
  limits: string;
  requestedStrength?: EvidenceStrength;
  imageKey?: string;
  /** R2 파일 이름과 맞추려고 미리 정한 근거 ID */
  id?: string;
};

/** 서버 freeze 결과 → EvidenceLink (상한표로 강도 clamp) */
export function buildProvenEvidenceLink(input: BuildProvenEvidenceInput): EvidenceLink {
  const kind = evidenceSourceKind(input.sourceKey);
  const cap = strengthCapFor(kind, input.claimKind);
  const requested = input.requestedStrength ?? "medium";
  const strength =
    cap == null
      ? "weak"
      : (clampEvidenceStrength(requested, cap) ?? "weak");

  // 히트 0건은 뒷받침/반박이 아님 — 맥락만 ("근거 없음은 반박이 아니다")
  const zeroHits = input.payload.resultCount === 0;
  let role: EvidenceRole =
    cap == null && input.role !== "context" ? "context" : input.role;
  if (zeroHits && role !== "context") {
    role = "context";
  }

  // 서명된 sourceKind와 sourceKey 종류가 다르면 상한 위조 방지 — 맥락 강등
  if (input.payload.sourceKind !== kind) {
    role = "context";
  }

  const zeroNote = zeroHits ? " [서버: 해당 범위에 탐지 없음]" : "";
  const capNote =
    cap == null ? ` [서버: ${kind}→${input.claimKind} 불가]` : "";
  const kindMismatch =
    input.payload.sourceKind !== kind
      ? ` [서버: sourceKind ${input.payload.sourceKind} ≠ ${kind}]`
      : "";

  return {
    id: input.id ?? newEvidenceId("ev"),
    sourceKey: input.sourceKey,
    role,
    strength:
      zeroHits || input.payload.sourceKind !== kind ? "weak" : strength,
    shows: zeroHits
      ? input.shows.trim() || "해당 범위에 탐지 없음"
      : input.shows,
    limits: `${input.limits}${capNote}${zeroNote}${kindMismatch}`.trim(),
    capturedAt: input.payload.queriedAt,
    frozenPayload: input.payload,
    imageKey: input.imageKey,
    commercialUse: commercialUseForSourceKey(input.sourceKey),
  };
}
