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

/** 해저 케이블만 — 줌인 시 가늘어짐. */
const CABLE_KINDS = new Set(["submarine-cable"]);
/** 송유·가스·해저관 — 줌아웃 0.1 · 줌인 ≤0.6 */
const PIPELINE_KINDS = new Set([
  "oil-pipeline",
  "gas-pipeline",
  "subsea-pipeline",
]);
/** DFC·BRI 등 경제 연결 호 — 전 줌에서 최소 굵기 유지 */
const FLOW_ARC_KINDS = new Set(["bri-trade", "us-dfc-supply", "axis-link"]);

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

/**
 * ⚠️ MapLibre 표현식 규칙 (실측으로 발견한 버그, 2026-07-29)
 *
 * `["zoom"]`은 **최상위 `interpolate`/`step`의 직접 입력**으로만 쓸 수 있다.
 * 산술식 안에 중첩하면 `addLayer`가 검증에서 던지고 **레이어가 지도에 아예
 * 올라가지 않는다.** 프로덕션 콘솔에 이 에러가 반복 기록되고 있었다:
 *
 *   layers.map-paths.paint.line-width: "zoom" expression may only be used as
 *   input to a top-level "step" or "interpolate" expression.
 *
 * 이전 코드는 `["*", ["^", 2, ["-", ["zoom"], 0.5]], 14]`처럼 zoom을 중첩해서
 * 썼다. TypeScript는 `ZoomExpr = any`라 못 잡고, tsc·vitest·build도 전부
 * 통과한다 — **런타임 스타일 검증에서만 드러난다.**
 *
 * ── 수정 방식 ──────────────────────────────────────────────────────
 * 최상위 `interpolate`로 바꾸고, **각 줌 스톱의 출력값**에서 feature 속성
 * (`angularRadius` 등)과 클램프를 계산한다. 스톱을 정수 줌마다 두면
 * 원래 곡선(2^zoom 지수 증가 + min/max 클램프)을 사실상 그대로 재현한다.
 *
 * 클램프를 interpolate **밖**에 두면(`["min", MAX, [interpolate…]]`) zoom이
 * 최상위가 아니게 되어 **같은 에러가 난다.** 반드시 스톱 안쪽에 둘 것.
 */

/** 줌 스톱 — 지구본에서 실제로 쓰이는 범위 */
const ZOOM_STOPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22];

/**
 * `clamp(min, max, featureProp × k × 2^(zoom − offset))`를
 * 스펙에 맞는 최상위 interpolate로 만든다.
 */
function angularScaleByZoom(
  featureProp: string,
  k: number,
  offset: number,
  floor: number,
  ceil: number,
): ZoomExpr {
  const stops: unknown[] = [];
  for (const z of ZOOM_STOPS) {
    const factor = k * Math.pow(2, z - offset);
    stops.push(z, [
      "min",
      ceil,
      ["max", floor, ["*", ["get", featureProp], factor]],
    ]);
  }
  return ["interpolate", ["linear"], ["zoom"], ...stops];
}

/** MapLibre paint — 줌 중에도 끊김 없이 점 크기 추적 (GeoJSON 재빌드 불필요) */
export const CIRCLE_RADIUS_BY_ZOOM: ZoomExpr = angularScaleByZoom(
  "angularRadius",
  14,
  0.5,
  2,
  MAX_ANGULAR_POINT_RADIUS_PX,
);

export const RING_RADIUS_BY_ZOOM: ZoomExpr = angularScaleByZoom(
  "angularRadius",
  14,
  0.5,
  2,
  MAX_ANGULAR_POINT_RADIUS_PX,
);

/** 일반 path 굵기 */
export const LINE_WIDTH_BY_ZOOM: ZoomExpr = angularScaleByZoom(
  "strokeAngular",
  5.5,
  2,
  0.35,
  MAX_ANGULAR_LINE_WIDTH_PX,
);

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

/** DFC·BRI·축 연결 — 멀리서도 안 사라지게 바닥 굵기 */
export const FLOW_ARC_LINE_WIDTH_BY_ZOOM: ZoomExpr = [
  "interpolate",
  ["linear"],
  ["zoom"],
  1,
  2.4,
  3,
  2.8,
  6,
  3.4,
  10,
  2.6,
];

/** 위 두 테이블을 JS에서 평가 — 스톱 안쪽에 상수로 박기 위해 */
function lerpTable(stops: Array<[number, number]>, z: number): number {
  if (z <= stops[0]![0]) return stops[0]![1];
  const last = stops[stops.length - 1]!;
  if (z >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [z0, v0] = stops[i]!;
    const [z1, v1] = stops[i + 1]!;
    if (z >= z0 && z <= z1) {
      const t = z1 === z0 ? 0 : (z - z0) / (z1 - z0);
      return v0 + (v1 - v0) * t;
    }
  }
  return last[1];
}

const CABLE_TABLE: Array<[number, number]> = [
  [1.2, 2.6],
  [9, 0.55],
];
const FLOW_TABLE: Array<[number, number]> = [
  [1, 2.4],
  [3, 2.8],
  [6, 3.4],
  [10, 2.6],
];
/** 파이프 — 멀리 0.1 · 가까이 ≤0.6 */
const PIPELINE_TABLE: Array<[number, number]> = [
  [1.2, 0.1],
  [4, 0.22],
  [7, 0.4],
  [10, 0.6],
];

/**
 * ⚠️ 중첩 순서가 중요하다.
 *
 * 이전 코드는 `case` **안에** zoom interpolate를 넣었다:
 *   ["case", …, CABLE_LINE_WIDTH_BY_ZOOM, …]   ← zoom이 최상위가 아님 = 위반
 *
 * 그래서 `interpolate`를 밖으로 빼고 각 줌 스톱 **안에서** `case`로 분기한다.
 * 케이블·flow·pipeline은 feature 속성과 무관한 순수 줌 함수라 JS에서 미리 평가해
 * 스칼라로 박고, 기본 path만 feature 속성(`strokeAngular`)을 쓴다.
 */
export const PATH_LINE_WIDTH_BY_ZOOM: ZoomExpr = (() => {
  const stops: unknown[] = [];
  for (const z of ZOOM_STOPS) {
    const defaultFactor = 5.5 * Math.pow(2, z - 2);
    stops.push(z, [
      "case",
      ["==", ["get", "widthMode"], "cable"],
      lerpTable(CABLE_TABLE, z),
      ["==", ["get", "widthMode"], "flow"],
      lerpTable(FLOW_TABLE, z),
      ["==", ["get", "widthMode"], "pipeline"],
      lerpTable(PIPELINE_TABLE, z),
      [
        "min",
        MAX_ANGULAR_LINE_WIDTH_PX,
        ["max", 0.35, ["*", ["get", "strokeAngular"], defaultFactor]],
      ],
    ]);
  }
  return ["interpolate", ["linear"], ["zoom"], ...stops];
})();

export const LABEL_TEXT_SIZE_BY_ZOOM: ZoomExpr = [
  "interpolate",
  ["linear"],
  ["zoom"],
  // baseSize는 예전 globe °(≈0.06–0.15) — px로 환산하지 않으면 max(9,…)에 항상 걸림
  2,
  ["max", 12, ["*", ["get", "baseSize"], 100]],
  6,
  ["max", 14, ["*", ["get", "baseSize"], 120]],
  10,
  ["max", 16, ["*", ["get", "baseSize"], 145]],
  13,
  ["max", 18, ["*", ["get", "baseSize"], 165]],
];

/** 도시 라벨 점 — zoom이 `^`/`*` 안에 있어 같은 위반이었다 (위 주석 참조) */
export const LABEL_DOT_RADIUS_BY_ZOOM: ZoomExpr = (() => {
  const stops: unknown[] = [];
  for (const z of ZOOM_STOPS) {
    const factor = Math.pow(2, (z - 2) * 0.1);
    stops.push(z, ["max", 1.5, ["*", ["get", "baseDotRadius"], factor]]);
  }
  return ["interpolate", ["linear"], ["zoom"], ...stops];
})();

/**
 * FIRMS — 기준 배율 × 줌.
 * 이전 코드는 zoom interpolate를 `*`/`max`/`min` **안에** 넣어 위반이었다.
 * 줌 계수는 feature와 무관하므로 JS에서 평가해 스톱에 상수로 박는다.
 */
const FIRMS_ZOOM_TABLE: Array<[number, number]> = [
  [1.5, 0.55],
  [4, 1],
  [7, 1.35],
  [10, 1.55],
];

export const FIRMS_ICON_SIZE_BY_ZOOM: ZoomExpr = (() => {
  const stops: unknown[] = [];
  for (const z of ZOOM_STOPS) {
    const factor = lerpTable(FIRMS_ZOOM_TABLE, z);
    stops.push(z, [
      "min",
      0.72,
      ["max", 0.22, ["*", ["get", "iconSizeFactor"], factor]],
    ]);
  }
  return ["interpolate", ["linear"], ["zoom"], ...stops];
})();

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
      const widthMode =
        kind && CABLE_KINDS.has(kind)
          ? "cable"
          : kind && PIPELINE_KINDS.has(kind)
            ? "pipeline"
            : kind && FLOW_ARC_KINDS.has(kind)
              ? "flow"
              : "angular";
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
            kind: kind ?? "",
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
