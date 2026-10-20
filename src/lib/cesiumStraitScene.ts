/**
 * 관측(Cesium) 해협 씬 — MapLibre 레이어판 복제 금지.
 * 밀도를 "레이어 수"가 아니라 한 해협 클로즈업으로 채운다.
 */

import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import { mapLibreZoomToAltitude } from "@/lib/mapLibreBasemap";
import { CINEMATIC_FLY } from "@/lib/globeCamera";

export type ObserveStraitId = "hormuz" | "red-sea-suez" | "malacca";

export type ObserveStraitPreset = {
  id: ObserveStraitId;
  /** LOGISTICS_RISK_POINTS id — 통항 배지·스트레스 */
  chokeIds: readonly string[];
  /** workers/cron-ingest aisZones 게이트 id */
  gateZoneIds: readonly string[];
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  /** globe.gl altitude (지구 반경 배수) */
  altitude: number;
  pitch: number;
  bearing: number;
  /** 정적 항로·케이블 viewport cull 반경(°) */
  staticRadiusDeg: number;
};

/** AIS 게이트 bbox — cron aisZones.ts 와 동기 (프론트 정적 복제, 통과 판정 아님) */
export const OBSERVE_GATE_BBOX: Record<
  string,
  { latMin: number; lngMin: number; latMax: number; lngMax: number }
> = {
  hormuz: { latMin: 26.3, lngMin: 56.0, latMax: 26.9, lngMax: 56.6 },
  "bab-el-mandeb": { latMin: 12.3, lngMin: 43.1, latMax: 12.9, lngMax: 43.6 },
  suez: { latMin: 29.9, lngMin: 32.2, latMax: 31.3, lngMax: 32.6 },
  malacca: { latMin: 1.0, lngMin: 100.5, latMax: 4.0, lngMax: 103.5 },
};

function chokeLookAt(chokeId: string): { lat: number; lng: number; altitude: number; pitch: number } {
  const point = LOGISTICS_RISK_POINTS.find((p) => p.id === chokeId);
  const lat = point?.lat ?? 26.58;
  const lng = point?.lng ?? 56.25;
  const zoom =
    typeof point?.meta?.cameraZoom === "number" ? point.meta.cameraZoom : 8.5;
  const pitch =
    typeof point?.meta?.cameraPitch === "number"
      ? point.meta.cameraPitch
      : CINEMATIC_FLY.pitch;
  // 클로즈업: meta zoom보다 한 단 가까이 (점 희소 방지)
  const altitude = Math.min(0.78, mapLibreZoomToAltitude(zoom) * 0.55);
  return { lat, lng, altitude, pitch };
}

const hormuzLook = chokeLookAt("choke-hormuz");
const babLook = chokeLookAt("choke-bab-el-mandeb");
const malaccaLook = chokeLookAt("choke-malacca");

/** 자동 순회 3곳 — 기본 시작은 호르무즈 */
export const OBSERVE_STRAIT_PRESETS: readonly ObserveStraitPreset[] = [
  {
    id: "hormuz",
    chokeIds: ["choke-hormuz"],
    gateZoneIds: ["hormuz"],
    nameKo: "호르무즈 해협",
    nameEn: "Strait of Hormuz",
    lat: hormuzLook.lat,
    lng: hormuzLook.lng,
    altitude: hormuzLook.altitude,
    pitch: hormuzLook.pitch,
    bearing: CINEMATIC_FLY.bearing,
    staticRadiusDeg: 2.4,
  },
  {
    id: "red-sea-suez",
    chokeIds: ["choke-bab-el-mandeb", "choke-suez"],
    gateZoneIds: ["bab-el-mandeb", "suez"],
    nameKo: "홍해·수에즈",
    nameEn: "Red Sea · Suez",
    // 홍해 관문(바브) 클로즈업 — 수에즈 게이트/배지는 같은 씬 오버레이로 유지
    lat: babLook.lat,
    lng: babLook.lng,
    altitude: Math.max(babLook.altitude, 0.72),
    pitch: babLook.pitch,
    bearing: -22,
    staticRadiusDeg: 3.2,
  },
  {
    id: "malacca",
    chokeIds: ["choke-malacca"],
    gateZoneIds: ["malacca"],
    nameKo: "말라카 해협",
    nameEn: "Strait of Malacca",
    lat: malaccaLook.lat,
    lng: malaccaLook.lng,
    altitude: malaccaLook.altitude,
    pitch: malaccaLook.pitch,
    bearing: CINEMATIC_FLY.bearing,
    staticRadiusDeg: 3.0,
  },
] as const;

export const OBSERVE_STRAIT_DEFAULT_ID: ObserveStraitId = "hormuz";

export function observeStraitPreset(
  id: ObserveStraitId = OBSERVE_STRAIT_DEFAULT_ID,
): ObserveStraitPreset {
  return (
    OBSERVE_STRAIT_PRESETS.find((p) => p.id === id) ?? OBSERVE_STRAIT_PRESETS[0]!
  );
}

/** CesiumSatelliteGlobe initial (height m) — 호르무즈 클로즈업 */
export function observeStraitInitialCamera(id: ObserveStraitId = OBSERVE_STRAIT_DEFAULT_ID): {
  lat: number;
  lng: number;
  heightM: number;
} {
  const p = observeStraitPreset(id);
  const EARTH_RADIUS_M = 6_371_000;
  return {
    lat: p.lat,
    lng: p.lng,
    heightM: p.altitude * EARTH_RADIUS_M,
  };
}

export const OBSERVE_STRAIT_TOUR_DWELL_MS = 14_000;
export const OBSERVE_STRAIT_TOUR_FLY_MS = 3_200;

/** 게이트 bbox 짧은 축을 가로지르는 통항선 (교통 방향에 수직에 가깝게) */
export function gateLinePoints(zoneId: string): { lat: number; lng: number }[] | null {
  const box = OBSERVE_GATE_BBOX[zoneId];
  if (!box) return null;
  const dLat = box.latMax - box.latMin;
  const dLng = box.lngMax - box.lngMin;
  const midLat = (box.latMin + box.latMax) / 2;
  const midLng = (box.lngMin + box.lngMax) / 2;
  // 짧은 축을 게이트 선으로 — 호르무즈·말라카는 대략 N–S, 수에즈는 E–W에 가깝다
  if (dLng >= dLat) {
    return [
      { lat: box.latMin, lng: midLng },
      { lat: box.latMax, lng: midLng },
    ];
  }
  return [
    { lat: midLat, lng: box.lngMin },
    { lat: midLat, lng: box.lngMax },
  ];
}

/** 혼잡 구간 틴트용 bbox 폴리곤 (닫힌 링) */
export function gateCongestionRing(zoneId: string): { lat: number; lng: number }[] | null {
  const box = OBSERVE_GATE_BBOX[zoneId];
  if (!box) return null;
  return [
    { lat: box.latMin, lng: box.lngMin },
    { lat: box.latMin, lng: box.lngMax },
    { lat: box.latMax, lng: box.lngMax },
    { lat: box.latMax, lng: box.lngMin },
    { lat: box.latMin, lng: box.lngMin },
  ];
}

export function gateBadgeAnchor(zoneId: string): { lat: number; lng: number } | null {
  const box = OBSERVE_GATE_BBOX[zoneId];
  if (!box) return null;
  return {
    lat: (box.latMin + box.latMax) / 2,
    lng: (box.lngMin + box.lngMax) / 2,
  };
}

/** choke id ↔ gate zone id */
export function chokeIdForGateZone(zoneId: string): string | null {
  switch (zoneId) {
    case "hormuz":
      return "choke-hormuz";
    case "bab-el-mandeb":
      return "choke-bab-el-mandeb";
    case "suez":
      return "choke-suez";
    case "malacca":
      return "choke-malacca";
    default:
      return null;
  }
}

export function nextStraitId(current: ObserveStraitId): ObserveStraitId {
  const idx = OBSERVE_STRAIT_PRESETS.findIndex((p) => p.id === current);
  const next = OBSERVE_STRAIT_PRESETS[(idx + 1) % OBSERVE_STRAIT_PRESETS.length];
  return next!.id;
}
