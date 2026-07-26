/**
 * 주간 함선 이동기 — 지구본 핀·링·연결선 빌더.
 * 승인 + mapEligible + 좌표만 지도에 올린다.
 */

import type { TransportPath } from "@/data/geoTypes";
import type { PublicShipObservation } from "@/lib/shipMovements/types";

export type ShipMovementHtmlMarker = {
  markerId: string;
  displayKind: "ship-movement-html";
  id: string;
  lat: number;
  lng: number;
  label: string;
  confidence: PublicShipObservation["confidence"];
  vesselConfidence: PublicShipObservation["vesselConfidence"];
  precisionKm: number | null;
  sourceUrl: string;
  navyLabel: string | null;
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

const CONFIDENCE_COLOR: Record<PublicShipObservation["confidence"], string> = {
  observed: "rgba(34, 211, 238, 0.72)",
  reported: "rgba(125, 211, 252, 0.55)",
  estimated: "rgba(148, 163, 184, 0.48)",
};

export function mapEligibleShipObservations(
  observations: PublicShipObservation[],
): PublicShipObservation[] {
  return observations.filter(
    (o) =>
      o.mapEligible &&
      o.lat != null &&
      o.lng != null &&
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lng),
  );
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
    precisionKm: o.precisionKm,
    sourceUrl: o.sourceUrl,
    navyLabel: o.navyLabel,
  }));
}

export function shipMovementPulseRings(
  observations: PublicShipObservation[],
): ShipMovementPulseRing[] {
  return mapEligibleShipObservations(observations).map((o) => {
    const km = o.precisionKm ?? 40;
    return {
      pulseKind: "ship-movement" as const,
      id: o.id,
      lat: o.lat!,
      lng: o.lng!,
      radiusScale: Math.max(0.7, Math.min(9, km / 35)),
      color: CONFIDENCE_COLOR[o.confidence],
      markerId: `ship-move-ring-${o.id}`,
      label: o.locationLabel || o.title,
    };
  });
}

/**
 * 같은 vesselKey의 연속 관측 중 양 끝 모두 좌표일 때만 연결선.
 * 실제 항적이 아닌 공개 관측 연결선.
 */
export function shipMovementTrailPaths(
  observations: PublicShipObservation[],
  lang: "ko" | "en",
): TransportPath[] {
  const eligible = mapEligibleShipObservations(observations);
  const byVessel = new Map<string, PublicShipObservation[]>();
  for (const o of eligible) {
    const list = byVessel.get(o.vesselKey) ?? [];
    list.push(o);
    byVessel.set(o.vesselKey, list);
  }

  const paths: TransportPath[] = [];
  for (const [vesselKey, list] of byVessel) {
    const sorted = [...list].sort((a, b) =>
      (a.observedAt || "").localeCompare(b.observedAt || ""),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) continue;
      const solid = a.confidence === "observed" && b.confidence === "observed";
      const name =
        [a.vesselName, a.hullNumber].filter(Boolean).join(" ") ||
        vesselKey;
      paths.push({
        id: `ship-trail-${a.id}-${b.id}`,
        kind: "ship-movement-trail",
        name,
        scalerank: 2,
        lengthKm: null,
        accentColor: solid
          ? "rgba(34, 211, 238, 0.78)"
          : "rgba(125, 211, 252, 0.55)",
        bbox: {
          minLat: Math.min(a.lat, b.lat),
          maxLat: Math.max(a.lat, b.lat),
          minLng: Math.min(a.lng, b.lng),
          maxLng: Math.max(a.lng, b.lng),
        },
        points: [
          { lat: a.lat, lng: a.lng, alt: 0.002 },
          { lat: b.lat, lng: b.lng, alt: 0.002 },
        ],
        meta: {
          dashed: solid ? 0 : 1,
          note:
            lang === "en"
              ? "Public observation link — not an actual track"
              : "공개 관측 연결선 — 실제 항적 아님",
        },
      });
    }
  }
  return paths;
}

export function createShipMovementPinElement(
  label: string,
  confidence: PublicShipObservation["confidence"],
  vesselUncertain: boolean,
  onClick?: () => void,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "ship-movement-pin";
  root.style.cssText = [
    "transform:translate(-50%,-50%)",
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

  const dot = document.createElement("div");
  const color =
    confidence === "observed"
      ? "#22d3ee"
      : confidence === "reported"
        ? "#7dd3fc"
        : "#94a3b8";
  const border = confidence === "observed" ? "solid" : "dashed";
  dot.style.cssText = [
    `width:12px`,
    `height:12px`,
    `border-radius:999px`,
    `background:${color}`,
    `border:2px ${border} rgba(255,255,255,0.85)`,
    `box-shadow:0 0 10px ${color}`,
  ].join(";");

  const tag = document.createElement("div");
  tag.textContent = vesselUncertain ? `? ${label}` : label;
  tag.style.cssText = [
    "max-width:140px",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "white-space:nowrap",
    "font-size:10px",
    "font-weight:600",
    "color:#ecfeff",
    "text-shadow:0 1px 3px rgba(0,0,0,0.85)",
    "background:rgba(8,47,73,0.72)",
    "border:1px solid rgba(103,232,249,0.35)",
    "border-radius:6px",
    "padding:1px 6px",
  ].join(";");

  root.append(dot, tag);
  return root;
}
