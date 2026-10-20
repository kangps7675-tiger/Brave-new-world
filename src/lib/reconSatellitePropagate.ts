/**
 * 브라우저에서 TLE → 현재 위경도·고도 (satellite.js SGP4).
 * 서버는 TLE만 제공하고, 위치는 클라이언트 틱으로 계산한다.
 */

import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
} from "satellite.js";
import type { ReconTleSatellite } from "@/lib/reconSatelliteTypes";
import { horizonRadiusDeg, type ReconCountry } from "@/lib/reconSatellites";

export type ReconTleInput = ReconTleSatellite;

export type ReconSatelliteMarker = ReconTleInput & {
  markerId: string;
  displayKind: "recon-sat-html";
  /** SGP4 지상 궤적 (진실·호버·선택·지평선 링) */
  lat: number;
  lng: number;
  /**
   * 지도 마커용 좌표. 전역 뷰에서는 궤도 헤일로로 밀어 올린 위치,
   * 지도 줌에서는 lat/lng와 동일.
   */
  orbitLat: number;
  orbitLng: number;
  altKm: number;
  /** 이론상 지평선 가시권 반경(도) — 촬영 영역 아님 */
  horizonDeg: number;
  /** 지상 트랙 진행 방향(도, 북=0·시계방향). 실루엣 회전용 */
  headingDeg: number;
};

export function reconCountryAccent(country: ReconCountry): string {
  const map: Record<ReconCountry, string> = {
    us: "#60a5fa",
    china: "#f87171",
    russia: "#fb923c",
    israel: "#a78bfa",
    france: "#38bdf8",
    japan: "#f472b6",
    korea: "#34d399",
    india: "#fbbf24",
    germany: "#94a3b8",
    italy: "#4ade80",
    spain: "#facc15",
    uae: "#2dd4bf",
    uk: "#818cf8",
    other: "#cbd5e1",
  };
  return map[country] ?? map.other;
}

function haversineDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h))) * 180) / Math.PI;
}

/** 북=0·시계방향 방위각(도) */
function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(aLat);
  const φ2 = toRad(bLat);
  const Δλ = toRad(bLng - aLng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** 출발점에서 bearing·거리(도)만큼 이동한 지점 */
function destinationDeg(
  lat: number,
  lng: number,
  bearing: number,
  distanceDeg: number,
): { lat: number; lng: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const δ = toRad(distanceDeg);
  const θ = toRad(bearing);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const sinφ2 =
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)));
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return {
    lat: Math.max(-85, Math.min(85, toDeg(φ2))),
    lng: ((toDeg(λ2) + 540) % 360) - 180,
  };
}

/**
 * 카메라 고도 → 궤도 연출 강도 0..1.
 * 지도 위주(regional 이하)=0, 둥근 지구가 보이는 전역≈1.
 */
export function reconOrbitViewFactor(cameraAltitude: number): number {
  if (!Number.isFinite(cameraAltitude) || cameraAltitude <= 1.15) return 0;
  if (cameraAltitude >= 1.9) return 1;
  return (cameraAltitude - 1.15) / (1.9 - 1.15);
}

/**
 * MapLibre HTML 마커는 지표면에만 붙으므로, 전역 뷰에서는
 * 카메라 주시점→지상궤적 방향으로 고도만큼 각거리를 밀어
 * 지구 디스크 바깥(궤도 헤일로)처럼 보이게 한다.
 * 줌인(factor≈0)이면 지상 궤적 그대로.
 */
export function liftReconSatForOrbitView(
  sat: { lat: number; lng: number; altKm: number; headingDeg?: number },
  camera: { lat: number; lng: number; altitude: number },
): { lat: number; lng: number } {
  const f = reconOrbitViewFactor(camera.altitude);
  if (f <= 0.001) return { lat: sat.lat, lng: sat.lng };

  const dist = haversineDeg(camera.lat, camera.lng, sat.lat, sat.lng);
  // LEO~400km → ~3°, 고궤도일수록 더 바깥. 시각용 클램프.
  const altFrac = Math.max(0, sat.altKm) / 6371;
  const liftDeg = Math.min(16, 2.4 + altFrac * 20) * f;

  if (dist < 0.4) {
    // 주시점 직상공 — 진행 방향(없으면 북)으로만 밀어 점이 겹치지 않게
    const heading =
      sat.headingDeg != null && Number.isFinite(sat.headingDeg) ? sat.headingDeg : 0;
    return destinationDeg(camera.lat, camera.lng, heading, liftDeg);
  }

  const bearing = bearingDeg(camera.lat, camera.lng, sat.lat, sat.lng);
  return destinationDeg(camera.lat, camera.lng, bearing, dist + liftDeg);
}

/** ECI 위치+속도 → 대략적인 지상 진행 방향(도) */
function headingFromEciVelocity(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  gmst: number,
): number {
  const dt = 30; // 초 — 짧은 전방 샘플
  const ahead = {
    x: position.x + velocity.x * dt,
    y: position.y + velocity.y * dt,
    z: position.z + velocity.z * dt,
  };
  const geo0 = eciToGeodetic(position, gmst);
  const geo1 = eciToGeodetic(ahead, gmst);
  const lat0 = degreesLat(geo0.latitude);
  const lng0 = degreesLong(geo0.longitude);
  const lat1 = degreesLat(geo1.latitude);
  const lng1 = degreesLong(geo1.longitude);
  const dLat = lat1 - lat0;
  let dLng = lng1 - lng0;
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  const rad = Math.atan2(dLng * Math.cos((lat0 * Math.PI) / 180), dLat);
  return ((rad * 180) / Math.PI + 360) % 360;
}

/** 단일 TLE → 현재 위치. 실패/감쇠면 null */
export function propagateReconSatellite(
  sat: ReconTleInput,
  when: Date = new Date(),
): ReconSatelliteMarker | null {
  try {
    const satrec = twoline2satrec(sat.line1, sat.line2);
    const pv = propagate(satrec, when);
    if (!pv?.position || typeof pv.position === "boolean") return null;
    const gmst = gstime(when);
    const geo = eciToGeodetic(pv.position, gmst);
    const lat = degreesLat(geo.latitude);
    const lng = degreesLong(geo.longitude);
    const altKm = geo.height;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(altKm)) return null;
    if (altKm < 80 || altKm > 80_000) return null;
    const id = sat.line1.slice(2, 7).trim() || sat.name;
    const headingDeg =
      pv.velocity && typeof pv.velocity !== "boolean"
        ? headingFromEciVelocity(pv.position, pv.velocity, gmst)
        : 0;
    return {
      ...sat,
      markerId: `recon-sat-${id}`,
      displayKind: "recon-sat-html",
      lat,
      lng,
      orbitLat: lat,
      orbitLng: lng,
      altKm,
      horizonDeg: horizonRadiusDeg(altKm),
      headingDeg,
    };
  } catch {
    return null;
  }
}

/**
 * 선택 위성의 향후 지상 궤적(약 1궤도). 상시 표시 금지 — 선택 시에만 호출.
 * dateline 끊김은 점 간격으로 완화(경로 렌더러가 직선 연결).
 */
export function sampleReconOrbitTrack(
  sat: ReconTleInput,
  when: Date = new Date(),
  opts?: { durationMin?: number; stepSec?: number },
): { lat: number; lng: number; alt?: number }[] {
  const durationMin = opts?.durationMin ?? 95;
  const stepSec = opts?.stepSec ?? 90;
  const points: { lat: number; lng: number; alt?: number }[] = [];
  try {
    const satrec = twoline2satrec(sat.line1, sat.line2);
    const start = when.getTime();
    const end = start + durationMin * 60_000;
    for (let t = start; t <= end; t += stepSec * 1000) {
      const at = new Date(t);
      const pv = propagate(satrec, at);
      if (!pv?.position || typeof pv.position === "boolean") continue;
      const geo = eciToGeodetic(pv.position, gstime(at));
      const lat = degreesLat(geo.latitude);
      const lng = degreesLong(geo.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      points.push({ lat, lng, alt: Math.min(0.08, Math.max(0.02, geo.height / 6371)) });
    }
  } catch {
    return [];
  }
  return points;
}

export function propagateReconSatellites(
  sats: ReconTleInput[],
  when: Date = new Date(),
): ReconSatelliteMarker[] {
  const out: ReconSatelliteMarker[] = [];
  for (const sat of sats) {
    const pos = propagateReconSatellite(sat, when);
    if (pos) out.push(pos);
  }
  return out;
}

/** 뷰포트 중심 근처 우선, MAX 상한 */
export function cullReconSatellites(
  markers: ReconSatelliteMarker[],
  center: { lat: number; lng: number },
  maxVisible: number,
  keepId?: string | null,
): ReconSatelliteMarker[] {
  if (markers.length <= maxVisible) return markers;
  const scored = markers.map((m) => ({
    m,
    d: haversineDeg(center.lat, center.lng, m.lat, m.lng),
  }));
  scored.sort((a, b) => a.d - b.d);
  const picked = scored.slice(0, maxVisible).map((s) => s.m);
  if (keepId && !picked.some((p) => p.markerId === keepId)) {
    const keep = markers.find((m) => m.markerId === keepId);
    if (keep) {
      picked[picked.length - 1] = keep;
    }
  }
  return picked;
}

/** 컬링 이후 — 카메라에 맞춰 orbitLat/Lng만 갱신 (lat/lng 지상궤적은 유지) */
export function applyReconOrbitLift(
  markers: ReconSatelliteMarker[],
  camera: { lat: number; lng: number; altitude: number },
): ReconSatelliteMarker[] {
  if (markers.length === 0) return markers;
  if (reconOrbitViewFactor(camera.altitude) <= 0.001) {
    return markers.map((m) =>
      m.orbitLat === m.lat && m.orbitLng === m.lng
        ? m
        : { ...m, orbitLat: m.lat, orbitLng: m.lng },
    );
  }
  return markers.map((m) => {
    const lifted = liftReconSatForOrbitView(m, camera);
    return { ...m, orbitLat: lifted.lat, orbitLng: lifted.lng };
  });
}
