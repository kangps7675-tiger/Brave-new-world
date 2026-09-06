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
/** 축 연결 호 — 전 줌에서 최소 굵기 유지 */
const FLOW_ARC_KINDS = new Set(["axis-link"]);
/** DFC·BRI — 일반 path와 비슷한 얇은 실선 */
const CORRIDOR_KINDS = new Set(["bri-trade", "us-dfc-supply"]);

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

/** DFC·BRI 코리도어 — 반투명 폴리곤 띠처럼 보이도록 굵게 */
export const CORRIDOR_LINE_WIDTH_BY_ZOOM: ZoomExpr = [
  "interpolate",
  ["linear"],
  ["zoom"],
  1,
  7.5,
  3,
  9.5,
  6,
  12,
  10,
  10,
];

/** 축 연결 — 멀리서도 안 사라지게 바닥 굵기 */
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
/** DFC·BRI — 선처럼 얇게 (예전 7.5–12px 띠 → ~1/5–1/6) */
const CORRIDOR_TABLE: Array<[number, number]> = [
  [1, 1.4],
  [3, 1.8],
  [6, 2.1],
  [10, 1.8],
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
 * 케이블·flow·corridor·pipeline은 feature 속성과 무관한 순수 줌 함수라 JS에서 미리 평가해
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
      ["==", ["get", "widthMode"], "corridor"],
      lerpTable(CORRIDOR_TABLE, z),
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
    /** true면 이 feature가 호버 시 map-paths-glint-* 레이어의 글린트 대상이 된다 */
    glint?: Accessor<T, boolean | undefined>;
    /** 같은 회랑/축 관계에 속한 leg들을 하나로 묶는 키 — 호버·선택 시 이 값이 같으면 같이 반응한다 */
    groupId?: Accessor<T, string | undefined>;
    /** 다구간(육로↔해상 등) 회랑에서 이 feature가 몇 번째 leg인지 (없으면 0 = 단일 구간) */
    legIndex?: Accessor<T, number | undefined>;
    /** axis-link 전용 — 호버 시 기본색(국가색) 대신 드러날 관계 성격 색(군수=빨강 등) */
    hoverColor?: Accessor<T, string | undefined>;
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
            : kind && CORRIDOR_KINDS.has(kind)
              ? "corridor"
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
            glint: Boolean(accessors.glint?.(item)),
            groupId: accessors.groupId?.(item) ?? "",
            legIndex: accessors.legIndex?.(item) ?? 0,
            hoverColor: accessors.hoverColor?.(item) ?? "",
          },
        },
      ];
    }),
  };
}

/**
 * 실측 회랑(axis-link 오버라이드) 전용 "글린트" 애니메이션 그라디언트.
 *
 * `line-gradient`는 GeoJSON 소스에 `lineMetrics: true`가 있어야 하고,
 * `["line-progress"]`는 위 zoom 규칙과 동일하게 최상위 interpolate의
 * 직접 입력으로만 써야 한다.
 *
 * phase(0~1)에 따라 밝은 하이라이트 밴드가 선을 따라 흐르듯 이동한다.
 * 밴드 중심을 [0.12, 0.88] 안쪽으로만 움직여, 밴드가 선의 양 끝(0 또는 1)에
 * 닿아 interpolate 스톱이 겹치거나 역전되는 것(→ "input values must be
 * strictly ascending" 런타임 에러로 레이어 전체가 죽음)을 원천 차단한다.
 */
const GLINT_TRANSPARENT = "rgba(255, 255, 255, 0)";
const GLINT_GLOW = "rgba(255, 226, 170, 0.55)";
const GLINT_CORE = "rgba(255, 255, 255, 0.98)";
const GLINT_HALF_WIDTH = 0.035;
const GLINT_CENTER_MIN = 0.12;
const GLINT_CENTER_MAX = 0.88;

export function buildCorridorGlintGradient(phase: number): ZoomExpr {
  const p = Number.isFinite(phase) ? Math.max(0, Math.min(1, phase)) : 0;
  const center = GLINT_CENTER_MIN + p * (GLINT_CENTER_MAX - GLINT_CENTER_MIN);
  const s0 = center - GLINT_HALF_WIDTH * 2;
  const s1 = center - GLINT_HALF_WIDTH;
  const s3 = center + GLINT_HALF_WIDTH;
  const s4 = center + GLINT_HALF_WIDTH * 2;
  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0, GLINT_TRANSPARENT,
    s0, GLINT_TRANSPARENT,
    s1, GLINT_GLOW,
    center, GLINT_CORE,
    s3, GLINT_GLOW,
    s4, GLINT_TRANSPARENT,
    1, GLINT_TRANSPARENT,
  ];
}

/** 파도가 아직 도달하지 않았거나 이미 지나간 leg — 완전 투명(구간 자체는 solid/dashed 베이스 레이어로 이미 보임) */
export function buildCorridorGlintOffGradient(): ZoomExpr {
  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0, GLINT_TRANSPARENT,
    1, GLINT_TRANSPARENT,
  ];
}

/**
 * 호버 중인 회랑이 가질 수 있는 최대 leg 수 — 이 개수만큼 map-paths-glint-N
 * 레이어를 미리 만들어두고, 실제 leg가 몇 개든(1개짜리 단일 경로 포함) 그 안에서
 * legIndex로 필터링해 쓴다. 현재 데이터의 최대 leg 수(4, INSTC)보다 여유를 둠.
 */
export const CORRIDOR_GLINT_MAX_LEGS = 6;

/** 한 바퀴(선 시작→끝) 도는 데 걸리는 시간 */
export const CORRIDOR_GLINT_PERIOD_MS = 3200;
/** setInterval 틱 — island-chains 애니메이션과 동일 주기(내장 GPU 친화) */
export const CORRIDOR_GLINT_TICK_MS = 100;

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
