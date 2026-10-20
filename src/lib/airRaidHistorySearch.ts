/**
 * 공습 이력 — 사건 파일용 시각+반경 검색.
 *
 * NEPTUN 위협 샘플·경보 구간 / Tzeva Adom 경보 구간을
 * 주장 시각 창과 반경으로 찾아, 세부 주장(시간·수단·장소)별 근거 강도를 붙인다.
 *
 * 상업 이용: 양쪽 모두 license-required — 대외 결과물에는 허락 전 「참고(내부)」.
 */

import { and, gte, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { airRaidAlertIntervals, neptunThreatSamples } from "@/db/schema";
import { haversineKm } from "@/lib/conflictEvents/geo";
import {
  geocodeOrefRegion,
  isEvidenceGradeOrefMatch,
  type OrefGeocodeMatch,
} from "@/lib/israelAlertZones";
import { listUkraineAlertZones } from "@/lib/ukraineAlertZones";

export type EvidenceStrength = "strong" | "medium" | "weak";

/** 세부 주장 축 — 주체(actor)는 지도 근거로 쓰지 않음 */
export type ClaimFacet = "time" | "means" | "place";

export type EvidenceFacetHit = {
  facet: ClaimFacet;
  strength: EvidenceStrength;
  /** 이 근거가 실제로 보여주는 것 (과장 금지) */
  shows: string;
  /** 한계 */
  limit: string;
};

export type AirRaidHistorySearchInput = {
  lat: number;
  lng: number;
  fromIso: string;
  toIso: string;
  radiusKm: number;
  sources: Array<"neptun" | "tzeva-adom">;
  maxThreats: number;
  maxAlerts: number;
};

export type NeptunThreatHit = {
  kind: "neptun-threat";
  id: string;
  threatId: string;
  threatType: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  sampledAt: string;
  heading: number | null;
  speedKmh: number | null;
  confidence: string | null;
  sourceCount: number | null;
  uncertaintyKm: number | null;
  trailPointCount: number;
  facets: EvidenceFacetHit[];
  commercialUse: "license-required";
  displayLabel: string;
};

export type AlertIntervalHit = {
  kind: "alert-interval";
  id: string;
  source: "neptun" | "tzeva-adom";
  regionKey: string;
  regionName: string | null;
  title: string | null;
  category: number | null;
  startedAt: string;
  endedAt: string | null;
  lastSeenAt: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  geocodeMatch: OrefGeocodeMatch | "ukraine" | "none";
  /** 조사 근거로 쓸 수 있는지 (Tzeva는 exact만) */
  evidenceGrade: boolean;
  facets: EvidenceFacetHit[];
  commercialUse: "license-required";
  displayLabel: string;
};

export type AirRaidHistorySearchResult = {
  query: AirRaidHistorySearchInput;
  threats: NeptunThreatHit[];
  alerts: AlertIntervalHit[];
  summary: {
    threatCount: number;
    alertCount: number;
    evidenceGradeAlertCount: number;
    byFacet: Record<ClaimFacet, { strong: number; medium: number; weak: number }>;
    /** 근거가 하나도 없을 때 — 반박이 아니라 확인 못함 후보 */
    absenceNote: string;
  };
  commercialUseNote: string;
};

export type ThreatSampleRow = {
  id: string;
  threatId: string;
  threatType: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  speedKmh: number | null;
  confidence: string | null;
  sourceCount: number | null;
  uncertaintyKm: number | null;
  sampledAt: string;
  trailJson: string | null;
};

export type AlertIntervalRow = {
  id: string;
  source: string;
  regionKey: string;
  regionName: string | null;
  title: string | null;
  category: number | null;
  startedAt: string;
  endedAt: string | null;
  lastSeenAt: string;
};

const KM_PER_DEG_LAT = 111.32;

export function radiusToBbox(
  lat: number,
  lng: number,
  radiusKm: number,
): { west: number; south: number; east: number; north: number } {
  const dLat = radiusKm / KM_PER_DEG_LAT;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusKm / (KM_PER_DEG_LAT * Math.max(0.2, Math.abs(cos)));
  return {
    west: lng - dLng,
    south: lat - dLat,
    east: lng + dLng,
    north: lat + dLat,
  };
}

/** at ± windowHours → ISO from/to */
export function windowAround(
  atIso: string,
  windowHours: number,
): { fromIso: string; toIso: string } {
  const t = Date.parse(atIso.includes("T") ? atIso : atIso.replace(" ", "T") + "Z");
  const center = Number.isFinite(t) ? t : Date.now();
  const half = windowHours * 60 * 60 * 1000;
  return {
    fromIso: new Date(center - half).toISOString(),
    toIso: new Date(center + half).toISOString(),
  };
}

export function resolveAirRaidHistoryWindow(params: {
  at?: string;
  windowHours?: number;
  from?: string;
  to?: string;
}): { fromIso: string; toIso: string } | { error: string } {
  if (params.from && params.to) {
    const fromMs = Date.parse(params.from);
    const toMs = Date.parse(params.to);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
      return { error: "from/to 시각을 해석할 수 없습니다" };
    }
    if (toMs < fromMs) return { error: "to는 from 이후여야 합니다" };
    return {
      fromIso: new Date(fromMs).toISOString(),
      toIso: new Date(toMs).toISOString(),
    };
  }
  if (params.at) {
    return windowAround(params.at, params.windowHours ?? 1);
  }
  return { error: "at 또는 from+to가 필요합니다" };
}

function trailPointCount(trailJson: string | null): number {
  if (!trailJson) return 0;
  try {
    const parsed = JSON.parse(trailJson) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** NEPTUN 위협 샘플 → 세부 주장 근거 강도 */
export function scoreNeptunThreatSample(row: ThreatSampleRow): EvidenceFacetHit[] {
  const facets: EvidenceFacetHit[] = [
    {
      facet: "time",
      strength: "medium",
      shows: "해당 시각대에 이 구역 근처에서 위협이 관측·집계됨",
      limit: "2차 집계이며 관측 누락 가능. 위치는 추정(uncertaintyKm)",
    },
  ];

  const sources = row.sourceCount ?? 0;
  const conf = (row.confidence || "").toLowerCase();
  const high = conf === "high" && sources >= 2;
  facets.push({
    facet: "means",
    strength: high ? "medium" : "weak",
    shows: row.threatType
      ? `집계 유형 「${row.threatType}」 위협이 피격 지점 방향으로 기록됨`
      : "위협 유형이 기록됨",
    limit: high
      ? "잔해·발사 원점은 확인하지 않음. 궤적은 집계 경로"
      : "신뢰도가 낮거나 출처가 적어 수단 확인에는 약함",
  });

  return facets;
}

function tzevaMeansLabel(category: number | null): string {
  if (category == null) return "경보 분류 미상";
  // OREF 흔한 카테고리: 1 로켓/미사일, 2 침투 등 — 세부 탄도/순항은 구분 못 함
  if (category === 1) return "로켓·미사일 계열 경보";
  if (category === 2) return "항공기·드론 침투 계열 경보";
  return `경보 분류 cat=${category}`;
}

/** Tzeva / NEPTUN 구역 경보 → 세부 주장 근거 */
export function scoreAlertInterval(args: {
  source: "neptun" | "tzeva-adom";
  evidenceGrade: boolean;
  category: number | null;
  inRadius: boolean;
}): EvidenceFacetHit[] {
  const facets: EvidenceFacetHit[] = [];

  if (args.source === "tzeva-adom") {
    facets.push({
      facet: "time",
      strength: args.evidenceGrade ? "strong" : "medium",
      shows: "주장 시각에 해당 마을·구역에서 공식 공습 경보가 울림",
      limit: args.evidenceGrade
        ? "경보는 예상 낙하 범위. 정확한 피격 지점은 아님"
        : "구역명 좌표가 정확 일치가 아니라 근거 등급은 낮음",
    });
    if (args.inRadius && args.evidenceGrade) {
      facets.push({
        facet: "place",
        strength: "medium",
        shows: "경보 구역이 주장 장소 반경 안에 있음",
        limit: "경보 구역 ≠ 피격 좌표. 시설·피해 확인은 별도 근거 필요",
      });
    }
    facets.push({
      facet: "means",
      strength: "medium",
      shows: tzevaMeansLabel(args.category),
      limit: "탄도·순항·로켓을 세분하지 않음",
    });
    return facets;
  }

  // NEPTUN 구역 경보
  facets.push({
    facet: "time",
    strength: "medium",
    shows: "주장 시각에 해당 주·지역 공습 경보가 켜져 있었음",
    limit: "공식 경보와 모니터링 집계가 섞일 수 있음",
  });
  return facets;
}

export function filterAndScoreThreatSamples(
  rows: ThreatSampleRow[],
  input: Pick<AirRaidHistorySearchInput, "lat" | "lng" | "radiusKm" | "maxThreats">,
): NeptunThreatHit[] {
  const hits: NeptunThreatHit[] = [];
  for (const row of rows) {
    const distanceKm = haversineKm(
      { lat: input.lat, lng: input.lng },
      { lat: row.lat, lng: row.lon },
    );
    if (distanceKm > input.radiusKm) continue;
    const facets = scoreNeptunThreatSample(row);
    hits.push({
      kind: "neptun-threat",
      id: row.id,
      threatId: row.threatId,
      threatType: row.threatType,
      lat: row.lat,
      lon: row.lon,
      distanceKm: Math.round(distanceKm * 10) / 10,
      sampledAt: row.sampledAt,
      heading: row.heading,
      speedKmh: row.speedKmh,
      confidence: row.confidence,
      sourceCount: row.sourceCount,
      uncertaintyKm: row.uncertaintyKm,
      trailPointCount: trailPointCount(row.trailJson),
      facets,
      commercialUse: "license-required",
      displayLabel: `NEPTUN 집계 · ${row.threatType ?? "threat"} · 신뢰도 ${row.confidence ?? "?"} · 출처 ${row.sourceCount ?? 0}개`,
    });
  }
  hits.sort((a, b) => a.distanceKm - b.distanceKm || a.sampledAt.localeCompare(b.sampledAt));
  return hits.slice(0, input.maxThreats);
}

function resolveIntervalCoords(row: AlertIntervalRow): {
  lat: number | null;
  lng: number | null;
  geocodeMatch: OrefGeocodeMatch | "ukraine" | "none";
  evidenceGrade: boolean;
} {
  if (row.source === "tzeva-adom") {
    const name = (row.regionName || row.regionKey || "").trim();
    const geo = geocodeOrefRegion(name);
    const evidenceGrade = isEvidenceGradeOrefMatch(geo.match);
    return {
      lat: geo.lat,
      lng: geo.lng,
      geocodeMatch: geo.match,
      evidenceGrade,
    };
  }

  // neptun: region_key = "oblast:key" | "raion:key" — 폴백 가짜 좌표는 쓰지 않음
  const raw = row.regionKey.replace(/^(oblast|raion):/, "");
  const name = (row.regionName || raw).trim();
  const coords = lookupUkraineZoneCoords(name, raw);
  if (coords) {
    return {
      lat: coords.lat,
      lng: coords.lng,
      geocodeMatch: "ukraine",
      // 우크라 구역 지오코드는 장소 확정 근거로는 쓰지 않음(시간 맥락만)
      evidenceGrade: false,
    };
  }
  return { lat: null, lng: null, geocodeMatch: "none", evidenceGrade: false };
}

function normalizeUa(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ");
}

/** 사전에 있을 때만 좌표 반환. 없으면 null (ukraineAlertZones 폴백 좌표 금지). */
function lookupUkraineZoneCoords(
  ...parts: Array<string | null | undefined>
): { lat: number; lng: number } | null {
  const zones = listUkraineAlertZones();
  const tokens = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .map(normalizeUa);
  if (tokens.length === 0) return null;
  for (const token of tokens) {
    const exact = zones.find((z) => normalizeUa(z.name) === token);
    if (exact) return { lat: exact.lat, lng: exact.lng };
  }
  for (const token of tokens) {
    const partial = zones.find(
      (z) => normalizeUa(z.name).includes(token) || token.includes(normalizeUa(z.name)),
    );
    if (partial) return { lat: partial.lat, lng: partial.lng };
  }
  return null;
}

export function filterAndScoreAlertIntervals(
  rows: AlertIntervalRow[],
  input: Pick<
    AirRaidHistorySearchInput,
    "lat" | "lng" | "radiusKm" | "maxAlerts" | "sources"
  >,
): AlertIntervalHit[] {
  const hits: AlertIntervalHit[] = [];
  for (const row of rows) {
    const source = row.source === "tzeva-adom" ? "tzeva-adom" : "neptun";
    if (!input.sources.includes(source)) continue;

    const geo = resolveIntervalCoords(row);
    let distanceKm: number | null = null;
    let inRadius = false;

    if (geo.lat != null && geo.lng != null) {
      distanceKm =
        Math.round(
          haversineKm({ lat: input.lat, lng: input.lng }, { lat: geo.lat, lng: geo.lng }) * 10,
        ) / 10;
      inRadius = distanceKm <= input.radiusKm;
      // Tzeva: 반경 밖이면 제외. NEPTUN 구역 경보는 시간 맥락용으로 반경 밖도 약하게 남길 수 있으나
      // 파일럿에서는 반경 안으로 통일.
      if (!inRadius) continue;
    } else if (source === "tzeva-adom") {
      // 좌표 없는 Tzeva는 지도·근거에서 제외
      continue;
    } else {
      // NEPTUN 구역 좌표 실패 — 시간 전용 히트는 반경 조건 없이 포함하지 않음(과장 방지)
      continue;
    }

    const evidenceGrade = source === "tzeva-adom" ? geo.evidenceGrade : false;
    const facets = scoreAlertInterval({
      source,
      evidenceGrade,
      category: row.category,
      inRadius,
    });

    hits.push({
      kind: "alert-interval",
      id: row.id,
      source,
      regionKey: row.regionKey,
      regionName: row.regionName,
      title: row.title,
      category: row.category,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      lastSeenAt: row.lastSeenAt,
      lat: geo.lat,
      lng: geo.lng,
      distanceKm,
      geocodeMatch: geo.geocodeMatch,
      evidenceGrade,
      facets,
      commercialUse: "license-required",
      displayLabel:
        source === "tzeva-adom"
          ? `Tzeva Adom · ${row.regionName || row.regionKey} · 공식 경보`
          : `NEPTUN 경보 · ${row.regionName || row.regionKey}`,
    });
  }

  hits.sort(
    (a, b) =>
      (a.distanceKm ?? 999) - (b.distanceKm ?? 999) ||
      a.startedAt.localeCompare(b.startedAt),
  );
  return hits.slice(0, input.maxAlerts);
}

function emptyFacetCounts(): Record<
  ClaimFacet,
  { strong: number; medium: number; weak: number }
> {
  return {
    time: { strong: 0, medium: 0, weak: 0 },
    means: { strong: 0, medium: 0, weak: 0 },
    place: { strong: 0, medium: 0, weak: 0 },
  };
}

export function buildSearchSummary(
  threats: NeptunThreatHit[],
  alerts: AlertIntervalHit[],
): AirRaidHistorySearchResult["summary"] {
  const byFacet = emptyFacetCounts();
  const bump = (facets: EvidenceFacetHit[]) => {
    for (const f of facets) {
      byFacet[f.facet][f.strength] += 1;
    }
  };
  for (const t of threats) bump(t.facets);
  for (const a of alerts) bump(a.facets);

  const evidenceGradeAlertCount = alerts.filter((a) => a.evidenceGrade).length;
  const total = threats.length + alerts.length;

  return {
    threatCount: threats.length,
    alertCount: alerts.length,
    evidenceGradeAlertCount,
    byFacet,
    absenceNote:
      total === 0
        ? "이 시각·반경에서 경보·위협 기록이 없음. 근거 부재는 반박이 아니라 「확인 못함」 후보(관측 누락 가능)."
        : "기록은 있으나 주체·의도 주장은 지도로 확인하지 않음.",
  };
}

export function assembleAirRaidHistoryResult(
  input: AirRaidHistorySearchInput,
  threatRows: ThreatSampleRow[],
  alertRows: AlertIntervalRow[],
): AirRaidHistorySearchResult {
  const threats = input.sources.includes("neptun")
    ? filterAndScoreThreatSamples(threatRows, input)
    : [];
  const alerts = filterAndScoreAlertIntervals(alertRows, input);
  return {
    query: input,
    threats,
    alerts,
    summary: buildSearchSummary(threats, alerts),
    commercialUseNote:
      "NEPTUN·Tzeva Adom 모두 상업 이용 시 제공자 문의 필요. 허락 전 결과물에는 「참고(내부)」로만 표시.",
  };
}

/** D1에서 시각+bbox로 후보를 읽은 뒤 반경·강도 필터 */
export async function searchAirRaidHistory(
  db: AppDb,
  input: AirRaidHistorySearchInput,
): Promise<AirRaidHistorySearchResult> {
  const bbox = radiusToBbox(input.lat, input.lng, input.radiusKm);
  let threatRows: ThreatSampleRow[] = [];
  let alertRows: AlertIntervalRow[] = [];

  if (input.sources.includes("neptun")) {
    try {
      const rows = await db
        .select({
          id: neptunThreatSamples.id,
          threatId: neptunThreatSamples.threatId,
          threatType: neptunThreatSamples.threatType,
          lat: neptunThreatSamples.lat,
          lon: neptunThreatSamples.lon,
          heading: neptunThreatSamples.heading,
          speedKmh: neptunThreatSamples.speedKmh,
          confidence: neptunThreatSamples.confidence,
          sourceCount: neptunThreatSamples.sourceCount,
          uncertaintyKm: neptunThreatSamples.uncertaintyKm,
          sampledAt: neptunThreatSamples.sampledAt,
          trailJson: neptunThreatSamples.trailJson,
        })
        .from(neptunThreatSamples)
        .where(
          and(
            gte(neptunThreatSamples.sampledAt, input.fromIso),
            lte(neptunThreatSamples.sampledAt, input.toIso),
            gte(neptunThreatSamples.lat, bbox.south),
            lte(neptunThreatSamples.lat, bbox.north),
            gte(neptunThreatSamples.lon, bbox.west),
            lte(neptunThreatSamples.lon, bbox.east),
          ),
        )
        .limit(Math.min(500, input.maxThreats * 8));
      threatRows = rows.map((r) => ({
        id: r.id,
        threatId: r.threatId,
        threatType: r.threatType,
        lat: r.lat,
        lon: r.lon,
        heading: r.heading,
        speedKmh: r.speedKmh,
        confidence: r.confidence,
        sourceCount: r.sourceCount,
        uncertaintyKm: r.uncertaintyKm,
        sampledAt: r.sampledAt,
        trailJson: r.trailJson,
      }));
    } catch {
      threatRows = [];
    }
  }

  try {
    const sourceFilter: SQL | undefined =
      input.sources.length === 1
        ? sql`${airRaidAlertIntervals.source} = ${input.sources[0]}`
        : or(
            ...input.sources.map((s) => sql`${airRaidAlertIntervals.source} = ${s}`),
          );

    const rows = await db
      .select({
        id: airRaidAlertIntervals.id,
        source: airRaidAlertIntervals.source,
        regionKey: airRaidAlertIntervals.regionKey,
        regionName: airRaidAlertIntervals.regionName,
        title: airRaidAlertIntervals.title,
        category: airRaidAlertIntervals.category,
        startedAt: airRaidAlertIntervals.startedAt,
        endedAt: airRaidAlertIntervals.endedAt,
        lastSeenAt: airRaidAlertIntervals.lastSeenAt,
      })
      .from(airRaidAlertIntervals)
      .where(
        and(
          sourceFilter,
          lte(airRaidAlertIntervals.startedAt, input.toIso),
          or(
            isNull(airRaidAlertIntervals.endedAt),
            gte(airRaidAlertIntervals.endedAt, input.fromIso),
            gte(airRaidAlertIntervals.lastSeenAt, input.fromIso),
          ),
        ),
      )
      .limit(Math.min(800, input.maxAlerts * 10));

    alertRows = rows.map((r) => ({
      id: r.id,
      source: r.source,
      regionKey: r.regionKey,
      regionName: r.regionName,
      title: r.title,
      category: r.category,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      lastSeenAt: r.lastSeenAt,
    }));
  } catch {
    alertRows = [];
  }

  return assembleAirRaidHistoryResult(input, threatRows, alertRows);
}
