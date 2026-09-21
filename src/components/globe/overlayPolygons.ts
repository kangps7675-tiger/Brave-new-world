import type { GeoJsonGeometry, TransportPath } from "@/data/geoTypes";
import type { GlobeLodTier } from "@/lib/globeLod";
import type { PolygonLayerFeature } from "@/components/globe/types";

type BlocCountryPolygonLayer = "allied-bloc" | "geoecon-bloc" | "axis-hub";

export function isBlocCountryPolygonLayer(
  layer: PolygonLayerFeature["polygonLayer"],
): layer is BlocCountryPolygonLayer {
  return layer === "allied-bloc" || layer === "geoecon-bloc" || layer === "axis-hub";
}

/** MapLibre-only bloc fills have `iso`; globe.gl polygons have `id`. */
export function polygonFeatureKey(feature: PolygonLayerFeature): string {
  switch (feature.polygonLayer) {
    case "allied-bloc":
    case "geoecon-bloc":
    case "axis-hub":
      return feature.iso;
    case "history-polity":
      return `history:${feature.source ?? "polity"}:${feature.name}`;
    default:
      return feature.id;
  }
}

/** Bloc hover features have no globe.gl geometry. */
export function polygonFeatureGeometry(
  feature: PolygonLayerFeature,
): GeoJsonGeometry | null {
  switch (feature.polygonLayer) {
    case "allied-bloc":
    case "geoecon-bloc":
    case "axis-hub":
    case "history-polity":
      return null;
    default:
      return feature.geometry;
  }
}

export function overlayPolygonSignature(polygons: PolygonLayerFeature[]) {
  return polygons
    .map((feature) => `${polygonFeatureKey(feature)}:${feature.polygonLayer}`)
    .join("|");
}

export function overlayPolygonsEqual(
  a: PolygonLayerFeature[],
  b: PolygonLayerFeature[],
) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return overlayPolygonSignature(a) === overlayPolygonSignature(b);
}

export function isUkraineViinaPolygonLayer(
  layer?: PolygonLayerFeature["polygonLayer"],
): layer is "ukraine-ru" | "ukraine-ua" | "ukraine-contested" {
  return (
    layer === "ukraine-ru" || layer === "ukraine-ua" || layer === "ukraine-contested"
  );
}

export function ukraineThinOutlineStroke(tier: GlobeLodTier): number {
  switch (tier) {
    case "village":
      return 0.55;
    case "near":
      return 0.45;
    case "regional":
      return 0.35;
    case "continent":
      return 0.26;
    default:
      return 0.2;
  }
}

export function ukraineHatchStroke(tier: GlobeLodTier): number {
  switch (tier) {
    case "village":
      return 0.32;
    case "near":
      return 0.28;
    case "regional":
      return 0.24;
    default:
      return 0.2;
  }
}

export function ukraineCombatZoneStroke(tier: GlobeLodTier): number {
  switch (tier) {
    case "village":
      return 1.05;
    case "near":
      return 0.82;
    case "regional":
      return 0.52;
    case "continent":
      return 0.38;
    default:
      return 0.28;
  }
}

export function neptunPathsGeometryEqual(a: TransportPath[], b: TransportPath[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left.id !== right.id || left.kind !== right.kind) return false;
    if (left.points.length !== right.points.length) return false;
    const l0 = left.points[0];
    const r0 = right.points[0];
    const ln = left.points[left.points.length - 1];
    const rn = right.points[right.points.length - 1];
    if (
      !l0 ||
      !r0 ||
      !ln ||
      !rn ||
      l0.lat !== r0.lat ||
      l0.lng !== r0.lng ||
      (l0.alt ?? 0) !== (r0.alt ?? 0) ||
      ln.lat !== rn.lat ||
      ln.lng !== rn.lng ||
      (ln.alt ?? 0) !== (rn.alt ?? 0)
    ) {
      return false;
    }
  }
  return true;
}
