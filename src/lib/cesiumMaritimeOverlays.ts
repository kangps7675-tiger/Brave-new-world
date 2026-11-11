/**
 * 愿痢?Cesium) ??吏?뺥븰怨?媛숈? UKMTO쨌NAVAREA 鍮쀪툑 + PortWatch 珥덊겕 留?
 * ?좊텇 援듦린??吏硫???m)???좎???以????꾩썐??留욎떠 ?붾㈃ ?쎌???蹂?쒕떎
 * (異??덈툕 援?꼍 `axisHubBorderWidthPx`? ?숈씪 諛⑹떇).
 */

import type { TransportPath } from "@/data/geoTypes";
import {
  NAVAREA_HATCH,
  NAVAREA_OUTLINE,
  navareaFeaturesToPaths,
  type NavareaFeaturePoint,
} from "@/lib/navareaHatch";
import {
  ukmtoIncidentToHatchPaths,
  type UkmtoIncidentPoint,
} from "@/lib/ukmtoHatch";
import {
  OBSERVE_CHOKE_RING,
  OBSERVE_CHOKE_RING_WIDTH_M,
  OBSERVE_NAVAREA_HATCH_WIDTH_M,
  OBSERVE_NAVAREA_OUTLINE_WIDTH_M,
  OBSERVE_UKMTO_HATCH,
  OBSERVE_UKMTO_HATCH_WIDTH_M,
  OBSERVE_UKMTO_OUTLINE,
  OBSERVE_UKMTO_OUTLINE_WIDTH_M,
} from "@/lib/observeSensorStyle";

export type CesiumChokeRingInput = {
  id: string;
  lat: number;
  lng: number;
  /** ?꾨룄 ??째) 諛섍꼍 ??MapLibre chokeGlowRingSeed.radiusScale 怨??숈씪 */
  radiusScale: number;
  color?: string;
};

export type MaritimeOverlaySegment = {
  /** GeometryInstance id ??怨좎쑀 */
  id: string;
  /** ?대┃ ??alertPins id ? 留욎텧 ??id (`alert:ukmto:??) */
  pickId: string;
  color: string;
  /** 吏硫???m) ??移대찓?쇨? 硫硫??붾㈃?먯꽌 ?뉗븘吏?*/
  widthM: number;
  points: { lat: number; lng: number }[];
};

const UKMTO_OUTLINE_WIDTH_M = OBSERVE_UKMTO_OUTLINE_WIDTH_M;
const UKMTO_HATCH_WIDTH_M = OBSERVE_UKMTO_HATCH_WIDTH_M;
const NAVAREA_OUTLINE_WIDTH_M = OBSERVE_NAVAREA_OUTLINE_WIDTH_M;
const NAVAREA_HATCH_WIDTH_M = OBSERVE_NAVAREA_HATCH_WIDTH_M;
const CHOKE_RING_WIDTH_M = OBSERVE_CHOKE_RING_WIDTH_M;
const CHOKE_RING_DEFAULT = OBSERVE_CHOKE_RING;
const CIRCLE_SEGMENTS = 48;

function pathToSegments(
  paths: TransportPath[],
  opts: {
    pickId: string;
    outlineWidthM: number;
    hatchWidthM: number;
    fallbackOutline: string;
    fallbackHatch: string;
    idPrefix: string;
  },
): MaritimeOverlaySegment[] {
  const out: MaritimeOverlaySegment[] = [];
  let hatchIdx = 0;
  for (const path of paths) {
    if (!path.points || path.points.length < 2) continue;
    const isHatch = path.kind === "conflict-hatch" || path.kind === "dispute-hatch";
    const color =
      (typeof path.accentColor === "string" && path.accentColor) ||
      (isHatch ? opts.fallbackHatch : opts.fallbackOutline);
    out.push({
      id: `${opts.idPrefix}:${path.id}`,
      pickId: opts.pickId,
      color,
      widthM: isHatch ? opts.hatchWidthM : opts.outlineWidthM,
      points: path.points,
    });
    if (isHatch) hatchIdx += 1;
    void hatchIdx;
  }
  return out;
}

function circleRingPoints(
  lat: number,
  lng: number,
  radiusDeg: number,
): { lat: number; lng: number }[] {
  const lngRadius = radiusDeg / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const theta = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    points.push({
      lat: lat + radiusDeg * Math.sin(theta),
      lng: lng + lngRadius * Math.cos(theta),
    });
  }
  return points;
}

/** 吏?뺥븰 MapLibre ? ?숈씪??寃쎈줈 ?앹꽦 ??Cesium ?좊텇 紐⑸줉 */
export function buildMaritimeOverlaySegments(input: {
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];
  chokeRings: CesiumChokeRingInput[];
  /** Intel ?댁옣 GPU ?鍮??몄뒪?댁뒪 ?곹븳 (嫄댁닔) */
  maxUkmto?: number;
  maxNavarea?: number;
}): MaritimeOverlaySegment[] {
  const segments: MaritimeOverlaySegment[] = [];
  const maxUkmto = input.maxUkmto ?? 12;
  const maxNavarea = input.maxNavarea ?? 12;

  const ukmto = input.ukmtoIncidents
    .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
    .slice(0, maxUkmto);
  for (const incident of ukmto) {
    const paths = ukmtoIncidentToHatchPaths(incident);
    segments.push(
      ...pathToSegments(paths, {
        pickId: `alert:ukmto:${incident.id}`,
        outlineWidthM: UKMTO_OUTLINE_WIDTH_M,
        hatchWidthM: UKMTO_HATCH_WIDTH_M,
        fallbackOutline: OBSERVE_UKMTO_OUTLINE,
        fallbackHatch: OBSERVE_UKMTO_HATCH,
        idPrefix: "maritime",
      }),
    );
  }

  const navarea = input.navareaFeatures.slice(0, maxNavarea);
  for (const feature of navarea) {
    const paths = navareaFeaturesToPaths([feature]);
    if (!paths.length) continue;
    segments.push(
      ...pathToSegments(paths, {
        pickId: `alert:navarea:${feature.id}`,
        outlineWidthM: NAVAREA_OUTLINE_WIDTH_M,
        hatchWidthM: NAVAREA_HATCH_WIDTH_M,
        fallbackOutline: NAVAREA_OUTLINE,
        fallbackHatch: NAVAREA_HATCH,
        idPrefix: "maritime",
      }),
    );
  }

  for (const ring of input.chokeRings) {
    if (!Number.isFinite(ring.lat) || !Number.isFinite(ring.lng)) continue;
    const radius = Math.max(0.08, ring.radiusScale || 0.35);
    segments.push({
      id: `maritime:choke-ring-${ring.id}`,
      pickId: `alert:portwatch:${ring.id}`,
      color: ring.color || CHOKE_RING_DEFAULT,
      widthM: CHOKE_RING_WIDTH_M,
      points: circleRingPoints(ring.lat, ring.lng, radius),
    });
  }

  return segments;
}


