/** NEPTUN (neptun.in.ua) — 우크라이나 공중 위협·공식 경보 오픈 API 타입 */

export type NeptunThreatType =
  | "uav"
  | "recon"
  | "missile"
  | "ballistic"
  | "kab"
  | "mig31k"
  | "unknown";

export type NeptunConfidence = "low" | "medium" | "high";

export type NeptunThreatStatus = "active" | "stale" | "resolved";

export type NeptunTrailPoint = {
  lat: number;
  lon: number;
  t: string;
};

export type NeptunThreat = {
  id: string;
  type: NeptunThreatType;
  title: string;
  region: string;
  district: string;
  locality: string;
  lat: number;
  lon: number;
  heading: number | null;
  confidenceLevel: NeptunConfidence;
  sourceCount: number;
  count?: number;
  updatedAt: string;
  status: NeptunThreatStatus;
  explanationShort?: string;
  velocity?: { bearingDeg: number; speedKmh: number };
  confirmedAt?: string;
  uncertaintyKm?: number;
  positionQuality?: string;
  trail?: NeptunTrailPoint[];
  lifecycle?: string;
};

export type NeptunAlertRegion = {
  key: string;
  name: string;
  oblast: string;
  since: string;
};

export type NeptunAlerts = {
  raions: NeptunAlertRegion[];
  oblasts: NeptunAlertRegion[];
};

export type NeptunThreatsResponse = {
  serverTime: string;
  threats: NeptunThreat[];
};

export type NeptunPayload = {
  fetchedAt: string;
  serverTime: string;
  live: boolean;
  threats: NeptunThreat[];
  alerts: NeptunAlerts;
  /** 데모·스텁용 — 이미 사라진 위협의 보존 궤적 */
  archivedThreats?: NeptunArchivedThreat[];
  stub?: boolean;
  error?: string;
};

export type NeptunTypeMeta = {
  label: string;
  shortLabel: string;
  color: string;
  severity: number;
};

export type NeptunPredicted = {
  lat: number;
  lon: number;
  heading: number | null;
  flying: boolean;
};

export type NeptunLiveThreat = NeptunThreat & {
  predictedLat: number;
  predictedLon: number;
  predictedHeading: number | null;
  flying: boolean;
};

/** WebSocket remove·snapshot delta로 사라진 위협의 보존 궤적 */
export type NeptunArchivedThreat = NeptunThreat & {
  archivedAt: string;
};

/** NEPTUN SDK THREAT_TYPES 색상·라벨과 동기화 */
const TYPE_META: Record<NeptunThreatType, NeptunTypeMeta> = {
  uav: { label: "UAV / Shahed", shortLabel: "БпЛА", color: "#f0820e", severity: 2 },
  recon: { label: "정찰 UAV", shortLabel: "Розвідка", color: "#1f9bd8", severity: 1 },
  missile: { label: "순항 미사일", shortLabel: "Ракети", color: "#e2384f", severity: 3 },
  ballistic: { label: "탄도 미사일", shortLabel: "Балістика", color: "#b21e6b", severity: 3 },
  kab: { label: "유도 폭탄 (KAB)", shortLabel: "КАБ", color: "#d9531e", severity: 2 },
  mig31k: { label: "MiG-31K 발사", shortLabel: "Авіація", color: "#7c4dff", severity: 3 },
  unknown: { label: "공중 위협", shortLabel: "Невідомі", color: "#6b7790", severity: 1 },
};

const TYPE_META_EN: Record<NeptunThreatType, string> = {
  uav: "UAV / Shahed",
  recon: "Recon UAV",
  missile: "Cruise missile",
  ballistic: "Ballistic missile",
  kab: "Guided bomb (KAB)",
  mig31k: "MiG-31K launch",
  unknown: "Air threat",
};

export function getNeptunTypeMeta(type: string): NeptunTypeMeta {
  return TYPE_META[type as NeptunThreatType] ?? TYPE_META.unknown;
}

export function getNeptunTypeLabel(type: string, lang: "ko" | "en" = "ko"): string {
  const key = (type as NeptunThreatType) in TYPE_META ? (type as NeptunThreatType) : "unknown";
  if (lang === "en") return TYPE_META_EN[key];
  return TYPE_META[key].label;
}

const EARTH_RADIUS_KM = 6371;

/** 추측항법 최대 경과(시간) — 스텁·끊긴 피드가 지구 반대편으로 날아가는 것 방지 */
const MAX_PREDICT_HOURS: Record<NeptunThreatType, number> = {
  ballistic: 5 / 60,
  missile: 25 / 60,
  uav: 40 / 60,
  recon: 40 / 60,
  kab: 8 / 60,
  mig31k: 15 / 60,
  unknown: 25 / 60,
};

const MAX_PREDICT_KM = 380;

/**
 * NEPTUN 작전 박스 (우크라·흑해·접경).
 * 이 밖 좌표는 표시·추측항법에서 제외.
 */
export function isInNeptunOpsBox(lat: number, lon: number): boolean {
  return lat >= 42 && lat <= 54.5 && lon >= 20 && lon <= 43.5;
}

/**
 * NATO 동부 접경 감시 박스 — 핀란드 등 ops box 밖 UAV/recon 월경 판정용.
 * (표시 필터와 별개; `isNeptunThreatVisible`에서 uav/recon만 예외 허용)
 */
export function isInNatoPerimeterWatchBox(lat: number, lon: number): boolean {
  return lat >= 41.5 && lat <= 70.2 && lon >= 12 && lon <= 45;
}

/** 위도·경도·방위·거리(km)로 목적지 좌표 계산 */
export function neptunDest(lat: number, lon: number, bearingDeg: number, km: number) {
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const d = km / EARTH_RADIUS_KM;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

/** NEPTUN SDK와 동일한 dead-reckon 추측항법 (경과·거리·작전박스 상한 적용) */
export function neptunPredict(threat: NeptunThreat, nowMs = Date.now()): NeptunPredicted {
  const anchor = {
    lat: threat.lat,
    lon: threat.lon,
    heading: threat.heading,
    flying: false,
  };

  if (!Number.isFinite(threat.lat) || !Number.isFinite(threat.lon)) {
    return anchor;
  }
  const inOps = isInNeptunOpsBox(threat.lat, threat.lon);
  const perimeterUav =
    (threat.type === "uav" || threat.type === "recon") &&
    isInNatoPerimeterWatchBox(threat.lat, threat.lon);
  if (!inOps && !perimeterUav) {
    return anchor;
  }

  const speed = threat.velocity?.speedKmh ?? 0;
  if (speed <= 0) {
    return { ...anchor, flying: false };
  }

  const anchorIso = threat.confirmedAt || threat.updatedAt;
  const anchorMs = anchorIso ? Date.parse(anchorIso) : nowMs;
  if (!Number.isFinite(anchorMs)) {
    return anchor;
  }

  const typeKey = (TYPE_META[threat.type] ? threat.type : "unknown") as NeptunThreatType;
  const maxHours = MAX_PREDICT_HOURS[typeKey] ?? MAX_PREDICT_HOURS.unknown;
  const elapsedH = Math.min(maxHours, Math.max(0, (nowMs - anchorMs) / 3_600_000));
  const km = Math.min(MAX_PREDICT_KM, speed * elapsedH);
  const bearing = threat.velocity?.bearingDeg ?? threat.heading ?? 0;
  const pos = neptunDest(threat.lat, threat.lon, bearing, km);

  if (!isInNeptunOpsBox(pos.lat, pos.lon) && !isInNatoPerimeterWatchBox(pos.lat, pos.lon)) {
    return anchor;
  }

  return {
    lat: pos.lat,
    lon: pos.lon,
    heading: bearing,
    flying: km > 0.01,
  };
}

export function isNeptunThreatVisible(threat: NeptunThreat): boolean {
  if (threat.status !== "active") return false;
  if (!Number.isFinite(threat.lat) || !Number.isFinite(threat.lon)) return false;
  if (isInNeptunOpsBox(threat.lat, threat.lon)) return true;
  /** 핀란드 등 — UAV/정찰만 접경 감시 박스에서 스트림 유지 */
  if (
    (threat.type === "uav" || threat.type === "recon") &&
    isInNatoPerimeterWatchBox(threat.lat, threat.lon)
  ) {
    return true;
  }
  return false;
}

export function formatNeptunLocation(threat: NeptunThreat): string {
  return [threat.locality, threat.district, threat.region].filter(Boolean).join(" · ");
}

function shiftIso(iso: string | undefined, deltaMs: number): string | undefined {
  if (!iso) return iso;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms + deltaMs).toISOString();
}

/**
 * 스텁 시드의 고정 시각을 "방금 전"으로 밀어 데모 궤적이 아시아로 표류하지 않게 함.
 */
export function rebaseNeptunStubPayload(payload: NeptunPayload, nowMs = Date.now()): NeptunPayload {
  const stamps: number[] = [];
  const collect = (iso?: string) => {
    if (!iso) return;
    const ms = Date.parse(iso);
    if (Number.isFinite(ms)) stamps.push(ms);
  };

  for (const threat of payload.threats ?? []) {
    collect(threat.confirmedAt);
    collect(threat.updatedAt);
    for (const point of threat.trail ?? []) collect(point.t);
  }
  for (const threat of payload.archivedThreats ?? []) {
    collect(threat.confirmedAt);
    collect(threat.updatedAt);
    collect(threat.archivedAt);
    for (const point of threat.trail ?? []) collect(point.t);
  }
  collect(payload.serverTime);
  collect(payload.fetchedAt);

  if (stamps.length === 0) {
    return {
      ...payload,
      fetchedAt: new Date(nowMs).toISOString(),
      serverTime: new Date(nowMs).toISOString(),
      live: false,
      stub: true,
    };
  }

  const newest = Math.max(...stamps);
  // 최신 관측이 약 90초 전이 되도록 이동
  const deltaMs = nowMs - 90_000 - newest;

  const rebaseThreat = <T extends NeptunThreat>(threat: T): T => ({
    ...threat,
    updatedAt: shiftIso(threat.updatedAt, deltaMs) ?? threat.updatedAt,
    confirmedAt: shiftIso(threat.confirmedAt, deltaMs),
    trail: threat.trail?.map((point) => ({
      ...point,
      t: shiftIso(point.t, deltaMs) ?? point.t,
    })),
  });

  return {
    ...payload,
    fetchedAt: new Date(nowMs).toISOString(),
    serverTime: new Date(nowMs).toISOString(),
    live: false,
    stub: true,
    threats: (payload.threats ?? []).map(rebaseThreat),
    archivedThreats: (payload.archivedThreats ?? []).map((threat) => ({
      ...rebaseThreat(threat),
      archivedAt: shiftIso(threat.archivedAt, deltaMs) ?? threat.archivedAt,
    })),
  };
}

export const NEPTUN_ATTRIBUTION_URL = "https://neptun.in.ua/";
export const NEPTUN_API_BASE = "https://neptun.in.ua";
export const NEPTUN_WS_URL = "wss://neptun.in.ua/api/v1/stream";
