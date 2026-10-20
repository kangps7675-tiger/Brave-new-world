/**
 * 주간 함선 이동기 — 지구본 핀·링·추정 이동경로 빌더.
 * 경로는 기사·관측에서 같은 함정(vesselKey)이 찍힌 좌표를 시간순으로 이은 추정선.
 * 실제 AIS 항적이 아님.
 */

import type { TransportPath } from "@/data/geoTypes";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import {
  shipNavyFillColor,
  shipNavyPulseColor,
  shipNavyTrailColor,
} from "@/lib/shipMovements/navyColors";
import { warshipProfileIconSvg } from "@/lib/surfaceCombatantDeckIcon";
import { SURFACE_COMBATANT_PROFILE_SIZE } from "@/data/surfaceCombatantSilhouette";

export type ShipMovementHtmlMarker = {
  markerId: string;
  displayKind: "ship-movement-html";
  id: string;
  lat: number;
  lng: number;
  label: string;
  confidence: PublicShipObservation["confidence"];
  vesselConfidence: PublicShipObservation["vesselConfidence"];
  locationStatus: PublicShipObservation["locationStatus"];
  precisionKm: number | null;
  sourceUrl: string;
  navyLabel: string | null;
  navyCode: string | null;
};

export type ShipMovementPulseRing = {
  pulseKind: "ship-movement";
  id: string;
  lat: number;
  lng: number;
  radiusScale: number;
  color: string;
  markerId: string;
  label: string;
};

const NEAR_DEG = 0.08; // ~9km — 같은 장소 중복 제거

/** 좌표가 있고, 정밀/해협 승인 또는 광역 해역 추정으로 지도에 올릴 수 있는지 */
export function isMapDisplayableShipObservation(
  o: PublicShipObservation,
): boolean {
  if (
    o.lat == null ||
    o.lng == null ||
    !Number.isFinite(o.lat) ||
    !Number.isFinite(o.lng)
  ) {
    return false;
  }
  if (o.mapEligible) return true;
  // 구 DB: broad인데 mapEligible=0 이어도 해역 중심 좌표가 있으면 추정 표시
  return o.locationStatus === "broad";
}

export function mapEligibleShipObservations(
  observations: PublicShipObservation[],
): PublicShipObservation[] {
  return observations.filter(isMapDisplayableShipObservation);
}

export function shipMovementHtmlMarkers(
  observations: PublicShipObservation[],
): ShipMovementHtmlMarker[] {
  return mapEligibleShipObservations(observations).map((o) => ({
    markerId: `ship-move-${o.id}`,
    displayKind: "ship-movement-html" as const,
    id: o.id,
    lat: o.lat!,
    lng: o.lng!,
    label:
      [o.vesselName, o.hullNumber].filter(Boolean).join(" ") ||
      o.title ||
      o.id,
    confidence: o.confidence,
    vesselConfidence: o.vesselConfidence,
    locationStatus: o.locationStatus,
    precisionKm: o.precisionKm,
    sourceUrl: o.sourceUrl,
    navyLabel: o.navyLabel,
    navyCode: o.navyCode,
  }));
}

export function shipMovementPulseRings(
  observations: PublicShipObservation[],
): ShipMovementPulseRing[] {
  return mapEligibleShipObservations(observations).map((o) => {
    const km = o.precisionKm ?? 40;
    const broad = o.locationStatus === "broad";
    return {
      pulseKind: "ship-movement" as const,
      id: o.id,
      lat: o.lat!,
      lng: o.lng!,
      // 광역 해역: 더 큰 불확실 링
      radiusScale: Math.max(0.7, Math.min(broad ? 12 : 9, km / (broad ? 28 : 35))),
      color: shipNavyPulseColor(o.navyCode),
      markerId: `ship-move-ring-${o.id}`,
      label: o.locationLabel || o.title,
    };
  });
}

/** hull·함명으로도 묶여야 하는 경우 vesselKey 변형 흡수 */
export function trailGroupKey(o: PublicShipObservation): string {
  const hull = (o.hullNumber || "").replace(/\s+/g, "").toUpperCase();
  if (hull.length >= 3) return `hull:${hull}`;
  const name = (o.vesselName || "").trim().toLowerCase();
  if (name.length >= 4) return `name:${name}`;
  return `key:${o.vesselKey}`;
}

function nearDup(a: PublicShipObservation, b: PublicShipObservation): boolean {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return false;
  return Math.abs(a.lat - b.lat) < NEAR_DEG && Math.abs(a.lng - b.lng) < NEAR_DEG;
}

function routeLabel(
  sorted: PublicShipObservation[],
  vesselName: string,
  lang: "ko" | "en",
): string {
  const stops = sorted
    .map((o) => o.locationLabel?.trim())
    .filter((s): s is string => Boolean(s && s.length > 0));
  const uniqueStops: string[] = [];
  for (const s of stops) {
    if (uniqueStops[uniqueStops.length - 1] !== s) uniqueStops.push(s);
  }
  if (uniqueStops.length >= 2) {
    const chain = uniqueStops.slice(0, 4).join(" → ");
    return `${vesselName} · ${chain}`;
  }
  if (uniqueStops.length === 1) {
    return lang === "en"
      ? `${vesselName} · near ${uniqueStops[0]}`
      : `${vesselName} · ${uniqueStops[0]}`;
  }
  return lang === "en"
    ? `${vesselName} · estimated track`
    : `${vesselName} · 추정 이동경로`;
}

/**
 * 같은 함정의 연속 공개 관측 좌표 → 추정 이동경로(폴리라인).
 * 기사에서 “함명 + 어디를 항해”로 잡힌 지점을 시간순으로 이음.
 */
export function shipMovementTrailPaths(
  observations: PublicShipObservation[],
  lang: "ko" | "en",
): TransportPath[] {
  const eligible = mapEligibleShipObservations(observations);
  const byVessel = new Map<string, PublicShipObservation[]>();
  for (const o of eligible) {
    const g = trailGroupKey(o);
    const list = byVessel.get(g) ?? [];
    list.push(o);
    byVessel.set(g, list);
  }

  const paths: TransportPath[] = [];
  for (const [, list] of byVessel) {
    const sortedRaw = [...list].sort((a, b) =>
      (a.observedAt || a.weekStart || "").localeCompare(b.observedAt || b.weekStart || ""),
    );
    // 근접 중복 제거 (같은 주·같은 해역 반복 보도)
    const sorted: PublicShipObservation[] = [];
    for (const o of sortedRaw) {
      const prev = sorted[sorted.length - 1];
      if (prev && nearDup(prev, o)) {
        // 더 높은 신뢰도로 교체
        const rank = (c: PublicShipObservation["confidence"]) =>
          c === "observed" ? 2 : c === "reported" ? 1 : 0;
        if (rank(o.confidence) >= rank(prev.confidence)) sorted[sorted.length - 1] = o;
        continue;
      }
      sorted.push(o);
    }
    if (sorted.length < 2) continue;

    const vesselName =
      [sorted[0]!.vesselName, sorted[0]!.hullNumber].filter(Boolean).join(" ") ||
      sorted[0]!.vesselKey;
    const allObserved = sorted.every((o) => o.confidence === "observed");
    const navyCode = sorted[0]!.navyCode;
    const lats = sorted.map((o) => o.lat!);
    const lngs = sorted.map((o) => o.lng!);
    const stopNote = sorted
      .map((o) => {
        const when = (o.observedAt || o.weekStart || "").slice(0, 10);
        const where = o.locationLabel || "?";
        return `${when}: ${where}`;
      })
      .join(" · ");

    paths.push({
      id: `ship-trail-${sorted[0]!.id}-${sorted[sorted.length - 1]!.id}`,
      kind: "ship-movement-trail",
      name: routeLabel(sorted, vesselName, lang),
      scalerank: 1,
      lengthKm: null,
      accentColor: shipNavyTrailColor(navyCode, !allObserved),
      bbox: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      },
      points: sorted.map((o) => ({
        lat: o.lat!,
        lng: o.lng!,
        alt: 0.003,
      })),
      meta: {
        dashed: allObserved ? 0 : 1,
        note:
          lang === "en"
            ? `Article-based estimated track — not live AIS. ${stopNote}`
            : `기사·관측 근거 추정 경로 — 실시간 AIS 아님. ${stopNote}`,
        vesselKey: sorted[0]!.vesselKey,
        stopCount: sorted.length,
        navyCode: navyCode ?? null,
      },
    });
  }
  return paths;
}

export function createShipMovementPinElement(
  label: string,
  confidence: PublicShipObservation["confidence"],
  vesselUncertain: boolean,
  onClick?: () => void,
  navyCode?: string | null,
  locationStatus?: PublicShipObservation["locationStatus"],
): HTMLElement {
  const root = document.createElement("div");
  root.className = "ship-movement-pin";
  const broad = locationStatus === "broad";
  root.style.cssText = [
    "transform:translate(-50%,-70%)",
    "pointer-events:auto",
    "cursor:pointer",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "gap:2px",
  ].join(";");
  if (onClick) {
    root.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  const fill = shipNavyFillColor(navyCode);
  const icon = document.createElement("span");
  icon.className = "ship-movement-pin__icon";
  icon.style.cssText = [
    `width:${SURFACE_COMBATANT_PROFILE_SIZE.width}px`,
    `height:${SURFACE_COMBATANT_PROFILE_SIZE.height}px`,
    "display:block",
    `filter:drop-shadow(0 1px 3px rgba(0,0,0,0.85)) drop-shadow(0 0 6px ${fill}88)`,
    broad || confidence === "estimated" ? "opacity:0.72" : "opacity:1",
  ].join(";");
  icon.innerHTML = warshipProfileIconSvg(fill, SURFACE_COMBATANT_PROFILE_SIZE, "e");

  const tag = document.createElement("div");
  const prefix = broad ? "≈ " : vesselUncertain ? "? " : "";
  tag.textContent = `${prefix}${label}`;
  tag.style.cssText = [
    "max-width:148px",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "white-space:nowrap",
    "font-size:10px",
    "font-weight:600",
    "color:#fff8ed",
    "text-shadow:0 1px 3px rgba(0,0,0,0.85)",
    "background:rgba(15,23,42,0.82)",
    `border:1px ${broad || confidence !== "observed" ? "dashed" : "solid"} ${fill}99`,
    "border-radius:6px",
    "padding:1px 6px",
  ].join(";");

  root.append(icon, tag);
  return root;
}
