import type { AxisHubId } from "@/data/axisNetwork";
import type { FeatureCollection, Geometry } from "geojson";

/** 축 관계망 4허브 — 중국·러시아·북한·이란 */
export const AXIS_HUB_ISOS: readonly AxisHubId[] = ["CHN", "RUS", "PRK", "IRN"];

export const AXIS_HUB_FILL = "#dc2626";
export const AXIS_HUB_FILL_OPACITY = 0.28;
export const AXIS_HUB_ACTIVE_FILL_OPACITY = 0.38;
export const AXIS_HUB_STROKE = "rgba(248, 113, 113, 0.9)";

/** 세슘 국경선 색. 위성 영상 위에서 읽히는 빨강. */
export const AXIS_HUB_BORDER_COLOR = "#ff2a2a";

/**
 * 국경선이 지면에서 차지하는 폭(m).
 * 화면 픽셀 = 이 폭 / 미터당 픽셀이라서, 카메라를 두 배 멀리하면 선도 절반으로 얇아진다.
 */
export const AXIS_HUB_BORDER_WIDTH_M = 28_000;

/** Cesium GroundPolyline width는 unsigned byte. 1 미만이면 선이 사라진다. */
const BORDER_PX_MIN = 1;
const BORDER_PX_MAX = 255;

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

export type LngLatRing = number[][];

/**
 * 허브 4국(중국·러시아·북한·이란) 바깥 링.
 * 세슘 국경 테두리는 이 링을 지면 폴리라인으로 그린다.
 */
export function collectAxisHubBorderRings(
  source: FeatureCollection | null | undefined,
): LngLatRing[] {
  if (!source?.features?.length) return [];

  const rings: LngLatRing[] = [];
  for (const feature of source.features) {
    const props = feature.properties ?? {};
    const isoRaw = props.iso ?? props.ISO_A3 ?? props.ADM0_A3 ?? feature.id;
    if (!isAxisHubIso(isoRaw)) continue;
    const geometry = feature.geometry;
    if (!geometry) continue;

    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates
          : [];

    for (const polygon of polygons) {
      const outer = polygon[0];
      if (!outer || outer.length < 4) continue;
      rings.push(outer);
    }
  }
  return rings;
}

/**
 * 줌에 비례하는 국경 픽셀 굵기.
 * 카메라 고도가 2배가 되면(같은 화면·시야각) 픽셀 굵기는 절반이 된다.
 */
export function axisHubBorderWidthPx(options: {
  cameraHeightM: number;
  canvasHeightPx: number;
  fovyRad: number;
  widthM?: number;
}): number {
  const widthM = options.widthM ?? AXIS_HUB_BORDER_WIDTH_M;
  const height = Math.max(options.cameraHeightM, 1);
  const canvas = Math.max(options.canvasHeightPx, 1);
  const fovy =
    Number.isFinite(options.fovyRad) && options.fovyRad > 0
      ? options.fovyRad
      : Math.PI / 3;
  const metersPerPixel = (2 * height * Math.tan(fovy / 2)) / canvas;
  const px = widthM / Math.max(metersPerPixel, 1e-6);
  return Math.min(BORDER_PX_MAX, Math.max(BORDER_PX_MIN, Math.round(px)));
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
