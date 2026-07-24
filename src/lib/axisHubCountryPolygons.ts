import type { AxisHubId } from "@/data/axisNetwork";
import type { FeatureCollection, Geometry } from "geojson";

/** 축 관계망 4허브 — 중국·러시아·북한·이란 */
export const AXIS_HUB_ISOS: readonly AxisHubId[] = ["CHN", "RUS", "PRK", "IRN"];

export const AXIS_HUB_FILL = "#dc2626";
export const AXIS_HUB_FILL_OPACITY = 0.28;
export const AXIS_HUB_ACTIVE_FILL_OPACITY = 0.38;
export const AXIS_HUB_STROKE = "rgba(248, 113, 113, 0.9)";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

const HUB_ISO_SET = new Set<string>(AXIS_HUB_ISOS);

function isAxisHubIso(value: unknown): value is AxisHubId {
  return typeof value === "string" && HUB_ISO_SET.has(value);
}

/**
 * NE 10m 고정밀 FeatureCollection에 허브 fill/stroke 페인트.
 * (구) countries.json 소수 2자리·링 샘플링 경로 폐기 — 어긋남 원인.
 */
export function paintAxisHubCountriesGeoJson(
  source: FeatureCollection | null | undefined,
  options?: { activeIso?: AxisHubId | null },
): FeatureCollection {
  if (!source?.features?.length) return EMPTY_FC;

  const features = source.features.flatMap((feature) => {
    const props = feature.properties ?? {};
    const isoRaw = props.iso ?? props.ISO_A3 ?? props.ADM0_A3 ?? feature.id;
    if (!isAxisHubIso(isoRaw)) return [];
    if (!feature.geometry) return [];

    const isActive = options?.activeIso === isoRaw;
    return [
      {
        type: "Feature" as const,
        id: isoRaw,
        geometry: feature.geometry as Geometry,
        properties: {
          iso: isoRaw,
          name: typeof props.name === "string" ? props.name : isoRaw,
          fill: AXIS_HUB_FILL,
          fillOpacity: isActive ? AXIS_HUB_ACTIVE_FILL_OPACITY : AXIS_HUB_FILL_OPACITY,
          stroke: AXIS_HUB_STROKE,
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}

/** @deprecated paintAxisHubCountriesGeoJson 사용 — 하위 호환 래퍼 */
export function buildAxisHubCountriesGeoJson(
  _countries: unknown,
  options?: { activeIso?: AxisHubId | null },
): FeatureCollection {
  void _countries;
  void options;
  return EMPTY_FC;
}
