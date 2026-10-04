/**
 * 관측(Cesium) 실사 센서 시각 계약.
 * 지정학 MapLibre 다크 잉크를 복제하지 않고, Google Photorealistic 위에서 읽히는
 * 고대비 stroke + 어두운 halo / 얇은 면 / 등급 링만 정의한다.
 */

import type { DisplayGrade } from "@/lib/intelContract/types";

/** 통제면 — outline 우선, fill은 낮게 */
export const OBSERVE_CONTROL_FILL = "#b45309";
export const OBSERVE_CONTROL_FILL_ALPHA = 0.38;
export const OBSERVE_CONTROL_OUTLINE = "#fbbf24";
export const OBSERVE_CONTROL_OUTLINE_ALPHA = 0.95;

/** 축 허브 강조 국경 */
export const OBSERVE_AXIS_BORDER = "#ff2a2a";
export const OBSERVE_AXIS_BORDER_HALO = "rgba(0,0,0,0.75)";

/** 전 세계 admin-0 윤곽 — 실사 위 얇은 중립선 */
export const OBSERVE_WORLD_BORDER = "rgba(226, 232, 240, 0.72)";
export const OBSERVE_WORLD_BORDER_WIDTH_M = 14_000;

/** 해상 오버레이 — photoreal에서 더 얇고 대비 높게 */
export const OBSERVE_UKMTO_OUTLINE_WIDTH_M = 1_600;
export const OBSERVE_UKMTO_HATCH_WIDTH_M = 850;
export const OBSERVE_NAVAREA_OUTLINE_WIDTH_M = 1_500;
export const OBSERVE_NAVAREA_HATCH_WIDTH_M = 800;
export const OBSERVE_CHOKE_RING_WIDTH_M = 2_000;
export const OBSERVE_UKMTO_OUTLINE = "rgba(248, 250, 252, 0.92)";
export const OBSERVE_UKMTO_HATCH = "rgba(15, 23, 42, 0.62)";
export const OBSERVE_CHOKE_RING = "rgba(251, 191, 36, 0.92)";

/** 해협 씬 — 통항 게이트·정적 밀도 (MapLibre 레이어판 복제 아님) */
export const OBSERVE_STRAIT_GATE = "rgba(125, 211, 252, 0.95)";
export const OBSERVE_STRAIT_GATE_WIDTH_M = 2_400;
export const OBSERVE_STRAIT_CONGESTION = "rgba(251, 191, 36, 0.55)";
export const OBSERVE_STRAIT_CONGESTION_WIDTH_M = 1_100;
export const OBSERVE_STRAIT_SHIPPING = "rgba(56, 189, 248, 0.72)";
export const OBSERVE_STRAIT_SHIPPING_WIDTH_M = 900;
export const OBSERVE_STRAIT_CABLE = "rgba(167, 139, 250, 0.78)";
export const OBSERVE_STRAIT_CABLE_WIDTH_M = 700;
export const OBSERVE_STRAIT_PIPELINE = "rgba(251, 146, 60, 0.78)";
export const OBSERVE_STRAIT_PIPELINE_WIDTH_M = 750;
export const OBSERVE_STRAIT_PORT = "#f8fafc";
export const OBSERVE_STRAIT_LNG = "#67e8f9";
export const OBSERVE_STRAIT_BADGE_FILL = "#f0fdfa";
export const OBSERVE_STRAIT_BADGE_OUTLINE = "rgba(2, 18, 24, 0.92)";
export const OBSERVE_STRAIT_CALLOUT_FILL = "#ecfeff";
export const OBSERVE_STRAIT_CALLOUT_OUTLINE = "rgba(2, 18, 24, 0.9)";

/** 지명 라벨 */
export const OBSERVE_PLACE_LABEL_FILL = "#f8fafc";
export const OBSERVE_PLACE_LABEL_OUTLINE = "rgba(2, 6, 23, 0.92)";
export const OBSERVE_PLACE_LABEL_SCALE = 0.85;

/** conflict-events billboard 상한 (FIRMS 80 패턴) */
export const OBSERVE_CONFLICT_PIN_MAX = 80;

/** displayGrade → 링 스케일·채도 (상세 카피는 IntelGradeBadge) */
export const OBSERVE_GRADE_RING: Record<
  DisplayGrade,
  { scale: number; alpha: number; pulse: boolean; stroke: string }
> = {
  high: { scale: 1.35, alpha: 0.95, pulse: true, stroke: "#34d399" },
  std: { scale: 1.15, alpha: 0.9, pulse: false, stroke: "#38bdf8" },
  low: { scale: 1.0, alpha: 0.8, pulse: false, stroke: "#fbbf24" },
  hold: { scale: 0.9, alpha: 0.65, pulse: false, stroke: "#a8a29e" },
  drop: { scale: 0.75, alpha: 0.4, pulse: false, stroke: "#fb7185" },
};

export function observeGradeStyle(grade: DisplayGrade | undefined | null) {
  return OBSERVE_GRADE_RING[grade && grade in OBSERVE_GRADE_RING ? grade : "low"];
}

/** 카테고리 accent → SVG 링/점 색 */
export const OBSERVE_CATEGORY_HEX: Record<string, string> = {
  red: "#f87171",
  orange: "#fb923c",
  cyan: "#22d3ee",
  blue: "#60a5fa",
  white: "#e2e8f0",
};

/** 범례 스와치 — ObserveLayerLegend와 Cesium 엔티티 색 맞춤 */
export const OBSERVE_LEGEND = {
  tracks: "#38bdf8",
  firms: "#fb923c",
  missile: "#f472b6",
  neptun: "#a78bfa",
  liveuaPin: OBSERVE_CHOKE_RING,
} as const;
