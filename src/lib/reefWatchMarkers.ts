import type {
  ReefWatchFeatureStatus,
  ReefWatchTrafficObservation,
} from "@/lib/reefWatch";

export type ReefWatchFeatureHtmlMarker = {
  markerId: string;
  displayKind: "reefwatch-feature-html";
  id: string;
  lat: number;
  lng: number;
  name: string;
  claimant: string;
  priority: 1 | 2 | 3;
  hasAirport: boolean;
  recentTraffic24h: number;
  tags: string[];
};

export type ReefWatchTrafficHtmlMarker = {
  markerId: string;
  displayKind: "reefwatch-traffic-html";
  id: string;
  lat: number;
  lng: number;
  callsign: string | null;
  featureName: string;
  distanceKm: number;
  altitudeM: number | null;
  originCountry: string | null;
};

const CLAIMANT_COLOR: Record<string, string> = {
  China: "#ef4444",
  Vietnam: "#f59e0b",
  Philippines: "#3b82f6",
  Malaysia: "#22c55e",
  Taiwan: "#22d3ee",
};

export function reefWatchFeatureHtmlMarkers(
  features: ReefWatchFeatureStatus[],
): ReefWatchFeatureHtmlMarker[] {
  return features.map((feature) => ({
    markerId: `reefwatch-feature-${feature.key}`,
    displayKind: "reefwatch-feature-html" as const,
    id: feature.id,
    lat: feature.lat,
    lng: feature.lng,
    name: feature.name,
    claimant: feature.claimant,
    priority: feature.priority,
    hasAirport: feature.hasAirport,
    recentTraffic24h: feature.recentTraffic24h,
    tags: feature.tags,
  }));
}

export function reefWatchTrafficHtmlMarkers(
  traffic: ReefWatchTrafficObservation[],
): ReefWatchTrafficHtmlMarker[] {
  return traffic.map((obs) => ({
    markerId: `reefwatch-traffic-${obs.id}`,
    displayKind: "reefwatch-traffic-html" as const,
    id: obs.id,
    lat: obs.position.lat,
    lng: obs.position.lng,
    callsign: obs.identity.callsign,
    featureName: obs.featureName,
    distanceKm: obs.distanceKm,
    altitudeM: obs.position.altitudeM,
    originCountry: obs.identity.originCountry,
  }));
}

export function createReefWatchFeatureMarkerElement(
  marker: ReefWatchFeatureHtmlMarker,
  onClick?: () => void,
): HTMLElement {
  const color = CLAIMANT_COLOR[marker.claimant] ?? "#67e8f9";
  const size = marker.priority === 1 ? 18 : marker.priority === 2 ? 14 : 10;
  const active = marker.recentTraffic24h > 0;
  const root = document.createElement("button");
  root.type = "button";
  root.className = "reefwatch-feature-marker";
  root.title = [
    marker.name,
    marker.claimant,
    marker.hasAirport ? "airstrip" : null,
    active ? `traffic×${marker.recentTraffic24h}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  root.setAttribute("aria-label", root.title);
  root.style.cssText = [
    "transform:translate(-50%,-50%)",
    `width:${size}px`,
    `height:${size}px`,
    marker.hasAirport ? "border-radius:3px" : "border-radius:999px",
    `border:2px solid ${color}`,
    active ? `background:${color}` : "background:rgba(2,6,23,0.88)",
    active
      ? `box-shadow:0 0 8px ${color},0 0 16px ${color}88`
      : `box-shadow:0 0 4px ${color}66`,
    "pointer-events:auto",
    "cursor:pointer",
    "padding:0",
  ].join(";");
  if (onClick) {
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
  }
  return root;
}

export function createReefWatchTrafficMarkerElement(
  marker: ReefWatchTrafficHtmlMarker,
  onClick?: () => void,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "reefwatch-traffic-marker";
  const label =
    marker.callsign ||
    marker.originCountry ||
    `${marker.distanceKm.toFixed(1)} km`;
  root.title = [
    label,
    marker.featureName,
    marker.altitudeM != null ? `${Math.round(marker.altitudeM)} m` : null,
    `${marker.distanceKm.toFixed(1)} km`,
  ]
    .filter(Boolean)
    .join(" · ");
  root.setAttribute("aria-label", root.title);
  root.style.cssText = [
    "transform:translate(-50%,-50%)",
    "width:16px",
    "height:16px",
    "border-radius:2px",
    "border:1.5px solid #f8fafc",
    "background:rgba(14,165,233,0.92)",
    "box-shadow:0 0 8px #38bdf8,0 0 14px #0ea5e988",
    "color:#f8fafc",
    "font-size:9px",
    "font-weight:800",
    "line-height:1",
    "display:grid",
    "place-items:center",
    "pointer-events:auto",
    "cursor:pointer",
    "padding:0",
  ].join(";");
  root.textContent = "✈";
  if (onClick) {
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
  }
  return root;
}
