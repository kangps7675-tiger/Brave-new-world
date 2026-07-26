import type { FeatureCollection, LineString, Point, Polygon } from "geojson";

type Accessor<T, R> = (item: T) => R;

/** MapLibre paint/layout expression (zoom-aware sizing) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZoomExpr = any;

function asFn<T, R>(value: unknown, fallback: Accessor<T, R>): Accessor<T, R> {
  return typeof value === "function" ? (value as Accessor<T, R>) : fallback;
}

/**
 * 두 함수 다 2^zoom 항이라 상한이 없었음 — 화면을 세게 줌인하면(이동 중이 아니라
 * "실제로 도달한" 높은 zoom 값 자체로도) 값이 수백 px까지 커져서 점·선이 화면을
 * 뒤덮는 문제가 있었다. 의도된 "확대하면 좀 더 굵게" 느낌은 유지하되 화면을
 * 뒤덮는 사고는 나지 않도록 안전 상한을 둔다.
 */
export const MAX_ANGULAR_POINT_RADIUS_PX = 48;
export const MAX_ANGULAR_LINE_WIDTH_PX = 26;

/** 해저 케이블만 — 줌인 시 가늘어짐. 송유관·가스관은 일반 path (줌인해도 보이도록). */
const CABLE_KINDS = new Set(["submarine-cable"]);

/**
 * 해저 케이블 — 일반 path와 반대:
 * 줌아웃(멀리) → 굵게, 줌인(가까이) → ~0.1px로 가늘어짐.
 */
export function cableInverseLineWidth(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 2;
  const t = Math.max(0, Math.min(1, (z - 1.2) / 7.8));
  const farPx = 2.6;
  const nearPx = 0.1;
  return farPx + (nearPx - farPx) * t;
}

function angularToPixelRadius(angular: number, zoom: number): number {
  return Math.min(MAX_ANGULAR_POINT_RADIUS_PX, Math.max(2, angular * Math.pow(2, zoom - 0.5) * 14));
}

/** MapLibre paint — 줌 중에도 끊김 없이 점 크기 추적 (GeoJSON 재빌드 불필요) */
export const CIRCLE_RADIUS_BY_ZOOM: ZoomExpr = [
  "min",
  MAX_ANGULAR_POINT_RADIUS_PX,
  [
    "max",
    2,
    [
      "*",
      ["get", "angularRadius"],
      ["*", ["^", 2, ["-", ["zoom"], 0.5]], 14],
    ],
  ],
];

export const RING_RADIUS_BY_ZOOM: ZoomExpr = [
  "min",
  MAX_ANGULAR_POINT_RADIUS_PX,
  [
    "max",
    2,
    [
      "*",
      ["get", "angularRadius"],
      ["*", ["^", 2, ["-", ["zoom"], 0.5]], 14],
    ],
  ],
];

/** 일반 path 굵기 */
export const LINE_WIDTH_BY_ZOOM: ZoomExpr = [
  "min",
  MAX_ANGULAR_LINE_WIDTH_PX,
  [
    "max",
    0.35,
    [
      "*",
      ["get", "strokeAngular"],
      ["*", ["^", 2, ["-", ["zoom"], 2]], 5.5],
    ],
  ],
];

/** 케이블 — 멀리 굵고 가까이 가늘게 (줌인에서도 최소 굵기 유지) */
export const CABLE_LINE_WIDTH_BY_ZOOM: ZoomExpr = [
  "interpolate",
  ["linear"],
  ["zoom"],
  1.2,
  2.6,
  9,
  0.55,
];

export const PATH_LINE_WIDTH_BY_ZOOM: ZoomExpr = [
  "case",
  ["==", ["get", "widthMode"], "cable"],
  CABLE_LINE_WIDTH_BY_ZOOM,
  LINE_WIDTH_BY_ZOOM,
];

export const LABEL_TEXT_SIZE_BY_ZOOM: ZoomExpr = [
  "max",
  9,
  ["*", ["get", "baseSize"], ["^", 2, ["*", ["-", ["zoom"], 2], 0.12]]],
];

export const LABEL_DOT_RADIUS_BY_ZOOM: ZoomExpr = [
  "max",
  1.5,
  ["*", ["get", "baseDotRadius"], ["^", 2, ["*", ["-", ["zoom"], 2], 0.1]]],
];

/** FIRMS — 기준 배율 × 줌. 재빌드 없이 연속 스케일 */
export const FIRMS_ICON_SIZE_BY_ZOOM: ZoomExpr = [
  "min",
  0.72,
  [
    "max",
    0.22,
    [
      "*",
      ["get", "iconSizeFactor"],
      [
        "interpolate",
        ["linear"],
        ["zoom"],
        1.5,
        0.55,
        4,
        1,
        7,
        1.35,
        10,
        1.55,
      ],
    ],
  ],
];

export function buildPointsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    color: Accessor<T, string>;
    radius: Accessor<T, number>;
    kind?: Accessor<T, string | undefined>;
    icon?: Accessor<T, string | undefined>;
  },
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => {
      const kind = accessors.kind?.(item);
      const icon = accessors.icon?.(item);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [accessors.lng(item), accessors.lat(item)],
        },
        properties: {
          index,
          color: accessors.color(item),
          angularRadius: accessors.radius(item),
          ...(kind ? { kind } : {}),
          ...(icon ? { icon } : {}),
        },
      };
    }),
  };
}

export function buildPathsGeoJson<T>(
  items: T[],
  accessors: {
    points: Accessor<T, { lat: number; lng: number; alt?: number }[]>;
    color: Accessor<T, string>;
    stroke: Accessor<T, number>;
    dashLength: Accessor<T, number>;
    dashGap: Accessor<T, number>;
    kind?: Accessor<T, string | undefined>;
  },
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      const pts = accessors.points(item);
      if (!pts || pts.length < 2) return [];
      const kind = accessors.kind?.(item);
      const widthMode = kind && CABLE_KINDS.has(kind) ? "cable" : "angular";
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: pts.map((p) => [p.lng, p.lat]),
          },
          properties: {
            index,
            color: accessors.color(item),
            strokeAngular: accessors.stroke(item),
            widthMode,
            dashLength: accessors.dashLength(item),
            dashGap: accessors.dashGap(item),
          },
        },
      ];
    }),
  };
}

export function buildPolygonsGeoJson<T extends { geometry: unknown }>(
  items: T[],
  accessors: {
    geometry: Accessor<T, GeoJSON.Geometry>;
    fillColor: Accessor<T, string>;
    strokeColor: Accessor<T, string>;
    fillOpacity?: Accessor<T, number>;
  },
): FeatureCollection<Polygon | GeoJSON.MultiPolygon> {
  const fillOpacity = accessors.fillOpacity ?? (() => 0.72);
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      const geometry = accessors.geometry(item);
      if (!geometry) return [];
      const type = (geometry as { type?: string }).type;
      if (type !== "Polygon" && type !== "MultiPolygon") return [];
      return [
        {
          type: "Feature" as const,
          geometry: geometry as Polygon | GeoJSON.MultiPolygon,
          properties: {
            index,
            fill: accessors.fillColor(item),
            stroke: accessors.strokeColor(item),
            fillOpacity: fillOpacity(item),
          },
        },
      ];
    }),
  };
}

export function buildRingsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    color: Accessor<T, string>;
    maxRadius: Accessor<T, number>;
  },
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        color: accessors.color(item),
        angularRadius: accessors.maxRadius(item) * 0.35,
      },
    })),
  };
}

/** NASA FIRMS — 불꽃·연기 symbol (크기는 줌 표현식) */
export function buildFirmsFiresGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    cause: Accessor<T, string>;
    frp: Accessor<T, number | null | undefined>;
    angularRadius: Accessor<T, number>;
    iconId: Accessor<T, string>;
  },
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => {
      const frp = accessors.frp(item) ?? 0;
      const intensity = frp >= 50 ? 1.2 : frp >= 20 ? 1.08 : 1;
      const angular = accessors.angularRadius(item);
      /** zoom≈4 근처에서 이전 baked 크기와 비슷한 기준 배율 */
      const iconSizeFactor = Math.min(0.55, Math.max(0.18, (angular * 14 * intensity) / 22));
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [accessors.lng(item), accessors.lat(item)],
        },
        properties: {
          index,
          cause: accessors.cause(item),
          phase: index % 3,
          icon: accessors.iconId(item),
          iconSizeFactor,
          iconOpacity: Math.min(0.82, 0.58 + intensity * 0.1),
        },
      };
    }),
  };
}

export function buildLabelsGeoJson<T>(
  items: T[],
  accessors: {
    lat: Accessor<T, number>;
    lng: Accessor<T, number>;
    text: Accessor<T, string>;
    size: Accessor<T, number>;
    color: Accessor<T, string>;
    dotRadius: Accessor<T, number>;
  },
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [accessors.lng(item), accessors.lat(item)],
      },
      properties: {
        index,
        label: accessors.text(item),
        baseSize: accessors.size(item),
        color: accessors.color(item),
        baseDotRadius: accessors.dotRadius(item),
      },
    })),
  };
}

export function buildHeatmapGeoJson(
  layers: { points: { lat: number; lng: number; weight: number }[]; tier: string }[],
): FeatureCollection<Point>[] {
  return layers.map((layer) => ({
    type: "FeatureCollection",
    features: layer.points.map((point, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
      properties: {
        index,
        weight: point.weight,
        tier: layer.tier,
      },
    })),
  }));
}

export { asFn, angularToPixelRadius };

export type GlobeLayerProps = Record<string, unknown>;

export function extractLayerAccessors<T>(props: GlobeLayerProps, prefix: string) {
  return {
    lat: asFn<T, number>(props[`${prefix}Lat`], () => 0),
    lng: asFn<T, number>(props[`${prefix}Lng`], () => 0),
    color: asFn<T, string>(props[`${prefix}Color`], () => "rgba(148,163,184,0.8)"),
    radius: asFn<T, number>(props[`${prefix}Radius`], () => 0.15),
    text: asFn<T, string>(props[`${prefix}Text`], () => ""),
    size: asFn<T, number>(props[`${prefix}Size`], () => 0.5),
    dotRadius: asFn<T, number>(props[`${prefix}DotRadius`], () => 0.08),
    points: asFn<T, { lat: number; lng: number; alt?: number }[]>(props[`${prefix}Points`], () => []),
    stroke: asFn<T, number>(props[`${prefix}Stroke`], () => 0.5),
    dashLength: asFn<T, number>(props[`${prefix}DashLength`], () => 0),
    dashGap: asFn<T, number>(props[`${prefix}DashGap`], () => 0),
    maxRadius: asFn<T, number>(props[`${prefix}MaxRadius`], () => 1),
    geometry: asFn<T, GeoJSON.Geometry>(props[`${prefix}GeoJsonGeometry`], () => ({
      type: "Polygon",
      coordinates: [],
    })),
    fillColor: asFn<T, string>(props[`${prefix}CapColor`], () => "rgba(0,0,0,0)"),
    strokeColor: asFn<T, string>(props[`${prefix}StrokeColor`], () => "rgba(0,0,0,0)"),
  };
}
