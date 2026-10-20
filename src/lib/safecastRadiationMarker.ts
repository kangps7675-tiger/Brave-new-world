import type { FeatureCollection, Point } from "geojson";
import {
  SAFECAST_ATTRIBUTION,
  safecastLevelColor,
  safecastLevelLabel,
  type SafecastSiteReading,
} from "@/lib/safecast";

export const SAFECAST_SOURCE_ID = "safecast-gauges-source";
export const SAFECAST_CIRCLE_LAYER_ID = "safecast-gauges-circle";
export const SAFECAST_LABEL_LAYER_ID = "safecast-gauges-label";

export type SafecastGaugeFeatureProps = {
  index: number;
  siteId: string;
  siteName: string;
  usvPerH: number | null;
  usvLabel: string;
  level: string;
  levelLabel: string;
  color: string;
  capturedAt: string | null;
  attribution: string;
};

export function formatSafecastUsvLabel(usvPerH: number | null): string {
  if (usvPerH == null) return "— µSv/h";
  const n = usvPerH < 0.01 ? usvPerH.toFixed(3) : usvPerH.toFixed(2);
  return `${n} µSv/h`;
}

/**
 * Safecast near-nuclear gauges as MapLibre GeoJSON (circle + symbol).
 * HTML Marker 대신 WebGL로 그려 카메라 회전 시 DOM transform/occlusion 비용을 제거한다.
 */
export function buildSafecastGaugesGeoJson(
  readings: SafecastSiteReading[],
  lang: "ko" | "en" = "ko",
): FeatureCollection<Point, SafecastGaugeFeatureProps> {
  const ko = lang !== "en";
  return {
    type: "FeatureCollection",
    features: readings
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.usvPerH != null)
      .map((r, index) => ({
        type: "Feature" as const,
        properties: {
          index,
          siteId: r.siteId,
          siteName: r.siteName,
          usvPerH: r.usvPerH,
          usvLabel: formatSafecastUsvLabel(r.usvPerH),
          level: r.level,
          levelLabel: safecastLevelLabel(r.level, ko),
          color: safecastLevelColor(r.level),
          capturedAt: r.capturedAt,
          attribution: SAFECAST_ATTRIBUTION,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [r.lng, r.lat],
        },
      })),
  };
}

/** @deprecated HTML badge — symbol 레이어로 이전됨. 테스트·폴백용으로만 유지. */
export function createSafecastGaugeBadge(
  reading: Pick<SafecastSiteReading, "siteName" | "usvPerH" | "level">,
  lang: "ko" | "en" = "ko",
): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "safecast-gauge-marker pointer-events-auto";
  root.style.cssText =
    "transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; gap: 2px;";

  const ko = lang !== "en";
  const color = safecastLevelColor(reading.level);
  const usv = formatSafecastUsvLabel(reading.usvPerH).replace(" µSv/h", "");
  const level = safecastLevelLabel(reading.level, ko);

  const chip = document.createElement("div");
  chip.style.cssText = [
    "min-width: 4.5rem",
    "padding: 4px 8px",
    "border-radius: 999px",
    `border: 1px solid ${color}99`,
    "background: rgba(8,12,18,0.88)",
    "font: 600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
    `color: ${color}`,
    "text-align: center",
    "white-space: nowrap",
  ].join(";");
  chip.innerHTML = `<div style="opacity:.75;font-size:8px;letter-spacing:.06em;text-transform:uppercase">${
    ko ? "방사능" : "RAD"
  }</div><div style="font-size:12px;margin-top:1px">${usv} <span style="opacity:.7;font-size:9px">µSv/h</span></div><div style="opacity:.8;font-size:8px;margin-top:1px">${level}</div>`;

  const pin = document.createElement("div");
  pin.style.cssText = [
    "width: 0",
    "height: 0",
    "border-left: 5px solid transparent",
    "border-right: 5px solid transparent",
    `border-top: 6px solid ${color}`,
    "opacity: 0.85",
  ].join(";");

  root.appendChild(chip);
  root.appendChild(pin);
  root.title = `${reading.siteName} · ${usv} µSv/h · Safecast`;
  return root;
}
