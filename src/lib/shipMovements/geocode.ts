/**
 * 지명+방위+거리 → 위경도 (결정론적).
 * LLM은 좌표를 만들지 않고 여기로 넘긴다.
 */

import {
  findGazetteerEntry,
  gazetteerLabel,
  type GazetteerEntry,
} from "@/data/westPacificGazetteer";
import type {
  ExtractedObservation,
  GeocodedObservation,
  LocationConfidence,
  LocationStatus,
} from "@/lib/shipMovements/types";

const EARTH_RADIUS_KM = 6371.0088;

const COMPASS_TO_DEG: Record<string, number> = {
  n: 0,
  north: 0,
  북: 0,
  北: 0,
  ne: 45,
  northeast: 45,
  "north-east": 45,
  북동: 45,
  北東: 45,
  e: 90,
  east: 90,
  동: 90,
  東: 90,
  se: 135,
  southeast: 135,
  "south-east": 135,
  남동: 135,
  南東: 135,
  s: 180,
  south: 180,
  남: 180,
  南: 180,
  sw: 225,
  southwest: 225,
  "south-west": 225,
  남서: 225,
  南西: 225,
  w: 270,
  west: 270,
  서: 270,
  西: 270,
  nw: 315,
  northwest: 315,
  "north-west": 315,
  북서: 315,
  北西: 315,
};

export function bearingFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (COMPASS_TO_DEG[t] != null) return COMPASS_TO_DEG[t];

  const m = t.match(
    /\b(north|south|east|west|northeast|northwest|southeast|southwest|n|s|e|w|ne|nw|se|sw)\b/i,
  );
  if (m?.[1]) {
    const key = m[1].toLowerCase();
    if (COMPASS_TO_DEG[key] != null) return COMPASS_TO_DEG[key];
  }

  const ko = t.match(/(북동|남동|남서|북서|북|남|동|서)/);
  if (ko?.[1] && COMPASS_TO_DEG[ko[1]] != null) return COMPASS_TO_DEG[ko[1]];

  const ja = t.match(/(北東|南東|南西|北西|北|南|東|西)/);
  if (ja?.[1] && COMPASS_TO_DEG[ja[1]] != null) return COMPASS_TO_DEG[ja[1]];

  return null;
}

/** 거리 문자열 → km (해리 포함) */
export function parseDistanceKm(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.replace(/,/g, "");
  const nm = t.match(/(\d+(?:\.\d+)?)\s*(?:nm|nmi|nautical\s*miles?|해리)/i);
  if (nm?.[1]) return Number(nm[1]) * 1.852;
  const miles = t.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
  if (miles?.[1]) return Number(miles[1]) * 1.60934;
  const km = t.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?|キロ|ｋｍ|km)/i);
  if (km?.[1]) return Number(km[1]);
  const bare = t.match(/약\s*(\d+(?:\.\d+)?)/) || t.match(/about\s+(\d+(?:\.\d+)?)/i);
  if (bare?.[1]) return Number(bare[1]);
  return null;
}

export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number,
): { lat: number; lng: number } {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: ((((λ2 * 180) / Math.PI + 540) % 360) - 180),
  };
}

function confidenceFor(entry: GazetteerEntry, status: LocationStatus): LocationConfidence {
  if (status === "precise") return "reported";
  if (status === "chokepoint") return "estimated";
  return "estimated";
}

function buildLabels(
  entry: GazetteerEntry | null,
  distanceKm: number | null,
  bearingDeg: number | null,
  directionText: string | null,
  status: LocationStatus,
): { ko: string | null; en: string | null } {
  if (!entry) {
    if (status === "missing") {
      return { ko: "위치 공개 관측 없음", en: "No public location fix" };
    }
    if (status === "unresolved") {
      return { ko: "지명 미해석", en: "Unresolved place name" };
    }
    if (status === "ambiguous") {
      return { ko: "위치 애매", en: "Ambiguous location" };
    }
    return { ko: null, en: null };
  }

  const placeKo = gazetteerLabel(entry, "ko");
  const placeEn = gazetteerLabel(entry, "en");
  if (distanceKm != null && bearingDeg != null) {
    const dirKo = directionText || `${Math.round(bearingDeg)}°`;
    const dirEn = directionText || `${Math.round(bearingDeg)}°`;
    return {
      ko: `${placeKo} ${dirKo} 약 ${Math.round(distanceKm)}km`,
      en: `about ${Math.round(distanceKm)} km ${dirEn} of ${placeEn}`,
    };
  }
  return { ko: placeKo, en: placeEn };
}

function looksAmbiguousLocation(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const seas = [
    ...raw.matchAll(
      /\b(Philippine Sea|South China Sea|East China Sea|Yellow Sea|Sea of Japan|East Sea|남중국해|동중국해|필리핀해|황해)\b/gi,
    ),
  ];
  const unique = new Set(seas.map((m) => (m[1] || "").toLowerCase()));
  if (unique.size >= 2) return true;
  // 거리 단위 불명 + 숫자만
  if (/\b\d+(?:\.\d+)?\s+(?:from|of)\b/i.test(raw) && !/\b(km|nm|nmi|miles?|mi|キロ)\b/i.test(raw)) {
    return true;
  }
  return false;
}

/**
 * 추출된 관측 한 건을 좌표·품질 상태로 변환.
 * 애매하면 좌표 null — 억지 핀 금지.
 */
export function geocodeObservation(
  obs: ExtractedObservation,
  opts?: { sourceConfidence?: LocationConfidence },
): GeocodedObservation {
  if (looksAmbiguousLocation(obs.location.raw)) {
    const labels = buildLabels(null, null, null, null, "ambiguous");
    return {
      ...obs,
      locationStatus: "ambiguous",
      mapEligible: false,
      confidence: "estimated",
      method: "none",
      lat: null,
      lng: null,
      precisionKm: null,
      locationLabelKo: labels.ko,
      locationLabelEn: labels.en,
      placeId: null,
    };
  }

  const place = obs.location.placeName;
  const entry = findGazetteerEntry(place);
  const bearing =
    obs.location.bearingDeg != null && Number.isFinite(obs.location.bearingDeg)
      ? obs.location.bearingDeg
      : bearingFromText(obs.location.directionText);
  const distanceKm =
    obs.location.distanceKm != null && Number.isFinite(obs.location.distanceKm)
      ? obs.location.distanceKm
      : parseDistanceKm(obs.location.raw);

  if (!place && !entry) {
    const labels = buildLabels(null, null, null, null, "missing");
    return {
      ...obs,
      locationStatus: "missing",
      mapEligible: false,
      confidence: "estimated",
      method: "none",
      lat: null,
      lng: null,
      precisionKm: null,
      locationLabelKo: labels.ko,
      locationLabelEn: labels.en,
      placeId: null,
    };
  }

  if (!entry) {
    const labels = buildLabels(null, null, null, null, "unresolved");
    return {
      ...obs,
      locationStatus: "unresolved",
      mapEligible: false,
      confidence: "estimated",
      method: "none",
      lat: null,
      lng: null,
      precisionKm: null,
      locationLabelKo: labels.ko,
      locationLabelEn: labels.en,
      placeId: null,
    };
  }

  if (entry.kind === "sea") {
    const labels = buildLabels(entry, null, null, null, "broad");
    return {
      ...obs,
      locationStatus: "broad",
      // 해역 중심점 추정 표시 — 정밀 핀이 아니라 넓은 불확실 영역
      mapEligible: true,
      confidence: "estimated",
      method: "gazetteer-sea",
      lat: entry.lat,
      lng: entry.lng,
      precisionKm: entry.defaultPrecisionKm,
      locationLabelKo: labels.ko,
      locationLabelEn: labels.en,
      placeId: entry.id,
    };
  }

  if (distanceKm != null && bearing != null) {
    const dest = destinationPoint(entry.lat, entry.lng, bearing, distanceKm);
    const labels = buildLabels(entry, distanceKm, bearing, obs.location.directionText, "precise");
    const precisionKm = Math.max(12, Math.min(40, distanceKm * 0.15 + entry.defaultPrecisionKm));
    return {
      ...obs,
      locationStatus: "precise",
      mapEligible: true,
      confidence: opts?.sourceConfidence ?? confidenceFor(entry, "precise"),
      method: "relative-bearing",
      lat: dest.lat,
      lng: dest.lng,
      precisionKm,
      locationLabelKo: labels.ko,
      locationLabelEn: labels.en,
      placeId: entry.id,
    };
  }

  if (entry.kind === "axis") {
    const labels = buildLabels(entry, null, null, null, "chokepoint");
    return {
      ...obs,
      locationStatus: "chokepoint",
      mapEligible: true,
      confidence: "estimated",
      method: "gazetteer-axis",
      lat: entry.lat,
      lng: entry.lng,
      precisionKm: entry.defaultPrecisionKm,
      locationLabelKo: labels.ko,
      locationLabelEn: labels.en,
      placeId: entry.id,
    };
  }

  // 지명만 있고 거리/방위 없음 — 섬/기지는 거친 추정, 지도 후보지만 불확실성 큼
  const labels = buildLabels(entry, null, null, null, "chokepoint");
  return {
    ...obs,
    locationStatus: "chokepoint",
    mapEligible: true,
    confidence: "estimated",
    method: "gazetteer-point",
    lat: entry.lat,
    lng: entry.lng,
    precisionKm: Math.max(entry.defaultPrecisionKm, 30),
    locationLabelKo: labels.ko,
    locationLabelEn: labels.en,
    placeId: entry.id,
  };
}

/** 본문에서 상대위치 패턴을 규칙으로 뽑는다 (LLM 없이도 동작). */
export function extractRelativeLocationFromText(text: string): {
  placeName: string | null;
  bearingDeg: number | null;
  distanceKm: number | null;
  directionText: string | null;
  raw: string;
} | null {
  const en = text.match(
    /(\d+(?:\.\d+)?)\s*(km|kilometers?|kilometres?|nm|nmi|miles?|mi)\s+(north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+([A-Za-z][A-Za-z\s\-']{2,40})/i,
  );
  if (en) {
    const distRaw = `${en[1]} ${en[2]}`;
    const dir = en[3];
    const place = en[4].replace(/\s+/g, " ").trim();
    return {
      placeName: place,
      bearingDeg: bearingFromText(dir),
      distanceKm: parseDistanceKm(distRaw),
      directionText: dir.toLowerCase(),
      raw: en[0],
    };
  }

  const approxEn = text.match(
    /approximately\s+(\d+(?:\.\d+)?)\s*(km|kilometers?|nm|miles?)\s+(north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+([A-Za-z][A-Za-z\s\-']{2,40})/i,
  );
  if (approxEn) {
    const distRaw = `${approxEn[1]} ${approxEn[2]}`;
    const dir = approxEn[3];
    return {
      placeName: approxEn[4].replace(/\s+/g, " ").trim(),
      bearingDeg: bearingFromText(dir),
      distanceKm: parseDistanceKm(distRaw),
      directionText: dir.toLowerCase(),
      raw: approxEn[0],
    };
  }

  const ja = text.match(
    /([^\s、。]{2,12})(?:の)?\s*(北|南|東|西|北東|南東|南西|北西)\s*(?:約)?\s*(\d+(?:\.\d+)?)\s*(?:km|キロ|ｋｍ)/,
  );
  if (ja) {
    return {
      placeName: ja[1],
      bearingDeg: bearingFromText(ja[2]),
      distanceKm: Number(ja[3]),
      directionText: ja[2],
      raw: ja[0],
    };
  }

  return null;
}
