/**
 * 저장 시 센서 근거 ↔ 현재 사건 기준점 관련성 재계산.
 * 서명된 조회 결과 안의 좌표·시각만 쓰고, 클라이언트가 보낸 relevance는 버린다.
 */

import { haversineKm } from "@/lib/conflictEvents/geo";
import {
  AIS_DEFAULT_WINDOW_HOURS,
  FIRMS_TIME_WINDOW_HOURS,
  firmsAcqToIso,
  formatTimeDeltaMinutes,
  type ServerFrozenPayload,
} from "@/lib/caseFile/serverFreeze";
import type { EvidenceSourceKind } from "@/lib/caseFile/sourceKind";
import type {
  CaseIncident,
  CasePlace,
  EvidenceRelevance,
  OccurredAtSource,
} from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";

/** 뒷받침·반박으로 인정하는 사건 시각 ± 허용 폭 */
export const SENSOR_TIME_TOLERANCE_HOURS: Partial<Record<EvidenceSourceKind, number>> = {
  firms: FIRMS_TIME_WINDOW_HOURS,
  ais: AIS_DEFAULT_WINDOW_HOURS,
  neptun: 3,
  "tzeva-adom": 3,
  adsb: 3,
  /** 통제 구역 스냅샷은 며칠 간격 */
  "control-zone": 24 * 7,
};

/** 시각이 없는 근거 (현재 지도) — 시간 비교 생략 */
const TIMELESS_KINDS: ReadonlySet<EvidenceSourceKind> = new Set(["facility"]);
/** 조회 반경이 0인 근거(지점 판별)의 허용 이동 거리 */
const MIN_RADIUS_KM: Partial<Record<EvidenceSourceKind, number>> = { "control-zone": 1 };

const DEFAULT_RADIUS_KM = 15;

type SensorHit = {
  lat: number | null;
  lng: number | null;
  /** 경보처럼 좌표 없이 조회 원점 기준 거리만 있는 경우 */
  distanceFromOriginKm: number | null;
  startIso: string | null;
  endIso: string | null;
};

export type SensorRelevanceCheck = {
  relevance: EvidenceRelevance;
  /** null이면 통과. 문자열이면 맥락으로 강등할 이유 */
  demoteReason: string | null;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function extractHit(kind: EvidenceSourceKind, payload: ServerFrozenPayload): SensorHit | null {
  const results = obj(payload.results);
  if (!results) return null;

  if (kind === "control-zone") {
    const snapshot = obj(results.snapshot);
    const at = snapshot ? str(snapshot.datetime) : null;
    return {
      lat: num(results.lat),
      lng: num(results.lng),
      distanceFromOriginKm: null,
      startIso: at,
      endIso: at,
    };
  }

  if (kind === "firms" || kind === "ais" || kind === "adsb" || kind === "facility") {
    const pick = obj(results.pick);
    if (!pick) return null;
    const at =
      kind === "firms"
        ? firmsAcqToIso(str(pick.acqDate), str(pick.acqTime))
        : kind === "facility"
          ? null
          : str(pick.timestamp);
    return {
      lat: num(pick.lat),
      lng: num(pick.lng),
      distanceFromOriginKm: null,
      startIso: at,
      endIso: at,
    };
  }

  if (kind === "neptun" || kind === "tzeva-adom") {
    const threat = obj(results.threat);
    if (threat) {
      const at = str(threat.sampledAt);
      return {
        lat: num(threat.lat),
        lng: num(threat.lon),
        distanceFromOriginKm: null,
        startIso: at,
        endIso: at,
      };
    }
    const alert = obj(results.alert);
    if (alert) {
      const start = str(alert.startedAt);
      return {
        lat: null,
        lng: null,
        distanceFromOriginKm: num(alert.distanceKm),
        startIso: start,
        endIso: str(alert.endedAt) ?? start,
      };
    }
  }
  return null;
}

/**
 * 센서 근거 하나를 현재 사건 기준점과 비교한다.
 * - 거리: 근거 좌표가 있으면 직접, 경보처럼 없으면 (조회 원점 이동 + 원점 기준 거리)로 상한 추정
 * - 시간: 사건 시각이 근거 구간 ± 허용 폭 안에 있어야 함
 */
export function checkSensorRelevance(
  kind: EvidenceSourceKind,
  payload: ServerFrozenPayload,
  incident: CaseIncident,
): SensorRelevanceCheck {
  const empty: EvidenceRelevance = {
    distanceKm: null,
    timeDeltaMinutes: null,
    summary: "사건 기준점과 거리·시간 비교 불가",
  };

  if (!incident.place || !incident.occurredAt) {
    return { relevance: empty, demoteReason: "사건 위치·시각 미설정" };
  }
  const incidentMs = Date.parse(incident.occurredAt);
  if (!Number.isFinite(incidentMs)) {
    return { relevance: empty, demoteReason: "사건 시각 형식 오류" };
  }

  const hit = extractHit(kind, payload);
  if (!hit) {
    return { relevance: empty, demoteReason: "조회 결과에서 근거 좌표·시각을 찾지 못함" };
  }

  const query = obj(payload.query) ?? {};
  const radiusKm = Math.max(num(query.radiusKm) ?? DEFAULT_RADIUS_KM, MIN_RADIUS_KM[kind] ?? 0);
  const here = { lat: incident.place.lat, lng: incident.place.lng };

  let distanceKm: number | null = null;
  if (hit.lat != null && hit.lng != null) {
    distanceKm = haversineKm(here, { lat: hit.lat, lng: hit.lng });
  } else {
    const originLat = num(query.lat);
    const originLng = num(query.lng);
    if (originLat != null && originLng != null) {
      distanceKm =
        haversineKm(here, { lat: originLat, lng: originLng }) +
        (hit.distanceFromOriginKm ?? 0);
    }
  }
  if (distanceKm != null) distanceKm = Math.round(distanceKm * 10) / 10;

  let timeDeltaMinutes: number | null = null;
  const startMs = hit.startIso ? Date.parse(hit.startIso) : NaN;
  const endMs = hit.endIso ? Date.parse(hit.endIso) : NaN;
  if (Number.isFinite(startMs)) {
    timeDeltaMinutes = Math.round((startMs - incidentMs) / 60_000);
  }

  const parts: string[] = [];
  if (distanceKm != null) parts.push(`사건 지점에서 ${distanceKm}km`);
  if (timeDeltaMinutes != null) {
    parts.push(`주장 시각 ${formatTimeDeltaMinutes(timeDeltaMinutes)}`);
  }
  const relevance: EvidenceRelevance = {
    distanceKm,
    timeDeltaMinutes,
    summary: parts.length ? parts.join(", ") : empty.summary,
  };

  if (distanceKm == null) {
    return { relevance, demoteReason: "근거 위치 미상" };
  }
  if (distanceKm > radiusKm) {
    return {
      relevance,
      demoteReason: `사건 지점에서 ${distanceKm}km — 조회 반경 ${radiusKm}km 밖 (기준점 변경 시 재조회 필요)`,
    };
  }

  if (TIMELESS_KINDS.has(kind)) {
    return { relevance, demoteReason: null };
  }
  if (!Number.isFinite(startMs)) {
    return { relevance, demoteReason: "근거 시각 미상" };
  }
  const toleranceH = SENSOR_TIME_TOLERANCE_HOURS[kind] ?? FIRMS_TIME_WINDOW_HOURS;
  const toleranceMs = toleranceH * 3_600_000;
  const intervalEnd = Number.isFinite(endMs) ? Math.max(endMs, startMs) : startMs;
  if (incidentMs < startMs - toleranceMs || incidentMs > intervalEnd + toleranceMs) {
    return {
      relevance,
      demoteReason: `사건 시각 ±${toleranceH}h 밖`,
    };
  }

  return { relevance, demoteReason: null };
}

/**
 * 서버가 받은 위성 전후 장면 ↔ 현재 사건 기준점.
 * - 영상 영역(조회 원점 ± chipRadiusKm) 안에 사건 지점이 있어야 함
 * - 사건 시각이 전(before)과 후(after) 촬영 사이에 있어야 함
 * - 쌍이 없거나 구름에 가렸으면 판정에 쓰지 않음
 */
export function checkSatelliteRelevance(
  payload: ServerFrozenPayload,
  incident: CaseIncident,
): SensorRelevanceCheck {
  const empty: EvidenceRelevance = {
    distanceKm: null,
    timeDeltaMinutes: null,
    summary: "사건 기준점과 거리·시간 비교 불가",
  };
  if (!incident.place || !incident.occurredAt) {
    return { relevance: empty, demoteReason: "사건 위치·시각 미설정" };
  }
  const incidentMs = Date.parse(incident.occurredAt);
  const results = obj(payload.results) ?? {};
  const query = obj(payload.query) ?? {};
  const originLat = num(query.lat);
  const originLng = num(query.lng);
  const chipKm = num(results.chipRadiusKm) ?? num(query.radiusKm) ?? 2.5;
  const before = obj(results.before);
  const after = obj(results.after);
  const beforeMs = before ? Date.parse(str(before.datetime) ?? "") : NaN;
  const afterMs = after ? Date.parse(str(after.datetime) ?? "") : NaN;

  let distanceKm: number | null = null;
  if (originLat != null && originLng != null) {
    distanceKm =
      Math.round(
        haversineKm({ lat: incident.place.lat, lng: incident.place.lng }, { lat: originLat, lng: originLng }) * 10,
      ) / 10;
  }
  const timeDeltaMinutes = Number.isFinite(afterMs)
    ? Math.round((afterMs - incidentMs) / 60_000)
    : null;
  const parts: string[] = [];
  if (Number.isFinite(beforeMs) && Number.isFinite(afterMs)) {
    parts.push(
      `전 ${new Date(beforeMs).toISOString().slice(0, 10)} · 후 ${new Date(afterMs).toISOString().slice(0, 10)}`,
    );
  }
  if (distanceKm != null && distanceKm > 0) parts.push(`영상 중심에서 ${distanceKm}km`);
  const relevance: EvidenceRelevance = {
    distanceKm,
    timeDeltaMinutes,
    summary: parts.length ? parts.join(", ") : empty.summary,
  };

  if (results.mode === "none" || !Number.isFinite(beforeMs) || !Number.isFinite(afterMs)) {
    return {
      relevance,
      demoteReason: results.cloudBlocked ? "광학 영상 구름에 가림" : "전후 비교 장면 없음",
    };
  }
  if (distanceKm == null || distanceKm > chipKm * 0.8) {
    return { relevance, demoteReason: `사건 지점이 영상 영역(반경 ${chipKm}km) 밖 — 재조회 필요` };
  }
  if (!(beforeMs < incidentMs && incidentMs < afterMs)) {
    return { relevance, demoteReason: "사건 시각이 전후 촬영 사이가 아님 — 재조회 필요" };
  }
  return { relevance, demoteReason: null };
}

const OCCURRED_SOURCES: readonly OccurredAtSource[] = ["body", "article", "editor", "none"];
const PLACE_SOURCES: readonly CasePlace["source"][] = ["impact", "gazetteer", "editor", "none"];

/** 저장 직전 사건 기준점 형식 정리 — 범위 밖 좌표·해석 불가 시각은 버린다 */
export function normalizeIncident(raw: unknown): CaseIncident {
  const o = obj(raw);
  if (!o) return emptyIncident();

  let place: CasePlace | null = null;
  const p = obj(o.place);
  const lat = p ? num(p.lat) : null;
  const lng = p ? num(p.lng) : null;
  if (p && lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    const source = PLACE_SOURCES.includes(p.source as CasePlace["source"])
      ? (p.source as CasePlace["source"])
      : "editor";
    place = {
      label: str(p.label) ?? "지정 좌표",
      lat,
      lng,
      precision: str(p.precision) ?? "point",
      source,
    };
  }

  const occurredRaw = str(o.occurredAt);
  const occurredMs = occurredRaw ? Date.parse(occurredRaw) : NaN;
  const occurredAt = Number.isFinite(occurredMs) ? new Date(occurredMs).toISOString() : null;
  const occurredAtSource: OccurredAtSource = occurredAt
    ? OCCURRED_SOURCES.includes(o.occurredAtSource as OccurredAtSource) &&
      o.occurredAtSource !== "none"
      ? (o.occurredAtSource as OccurredAtSource)
      : "editor"
    : "none";

  return { place, occurredAt, occurredAtSource };
}
