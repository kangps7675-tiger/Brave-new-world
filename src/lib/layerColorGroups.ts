/**
 * 레이어 색 — 시설군(5) 단위 통일.
 * idle 지구는 채도를 낮춰 정보국 무드, 세부 구분은 아이콘·호버에 맡긴다.
 *
 * 밝은 베이스맵(지형 벡터)에서는 같은 색군의 저명도 버전을 써서 대비를 유지한다.
 */

import { activeBasemapTone, type BasemapTone } from "@/lib/basemapTone";

export type LayerColorGroup =
  | "crisis"
  | "military"
  | "infra"
  | "energy"
  | "digital";

/** 군별 기준색 (hex) — 어두운 베이스맵 */
export const LAYER_GROUP_HEX: Record<LayerColorGroup, string> = {
  /** 경보·분쟁·제재 신호 */
  crisis: "#e85d4c",
  /** 군사·통제 — 브랜드 시안 */
  military: "#45f3ff",
  /** 공항·항만·항로·물류 — 회청 */
  infra: "#8ba3b8",
  /** 에너지·광물·파이프 — 앰버 */
  energy: "#d4a017",
  /** 통신·디지털 — 뮤트 바이올렛 */
  digital: "#9b8ec4",
};

/** 밝은 베이스맵용 — 같은 색상환, 채도·대비를 올려 지형 위에 또렷하게 */
export const LAYER_GROUP_HEX_LIGHT: Record<LayerColorGroup, string> = {
  crisis: "#9f1239",
  military: "#0f766e",
  infra: "#1e3a5f",
  energy: "#92400e",
  digital: "#5b21b6",
};

export function groupHex(
  group: LayerColorGroup,
  tone: BasemapTone = activeBasemapTone(),
): string {
  return tone === "light" ? LAYER_GROUP_HEX_LIGHT[group] : LAYER_GROUP_HEX[group];
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 밝은 배경에서는 반투명이 배경에 씻겨 나가므로 불투명도를 올린다 */
function toneAlpha(alpha: number, tone: BasemapTone): number {
  return tone === "light" ? Math.min(1, alpha + 0.1) : alpha;
}

export function groupRgba(
  group: LayerColorGroup,
  alpha: number,
  tone: BasemapTone = activeBasemapTone(),
): string {
  return hexToRgba(groupHex(group, tone), toneAlpha(alpha, tone));
}

/** 정적 포인트 kind → 색군 */
export function staticKindColorGroup(
  kind: string,
): LayerColorGroup {
  if (kind.startsWith("gem-")) {
    if (
      kind === "gem-steel" ||
      kind === "gem-cement" ||
      kind === "gem-iron-ore" ||
      kind === "gem-chemical"
    ) {
      return "energy";
    }
    return "energy";
  }

  switch (kind) {
    case "ucdp-event":
    case "refugee-camp":
    case "sanctions-entity":
      return "crisis";
    case "military-base":
    case "space-launch":
    case "missile-silo":
    case "strategic-missile-base":
    case "missile-test-site":
      return "military";
    case "airport":
    case "port":
    case "chokepoint":
    case "logistics-hub":
    case "submarine-tunnel":
    case "economic-center":
    case "critical-node":
      return "infra";
    case "resource":
    case "nuclear-site":
    case "lng-terminal":
      return "energy";
    case "cable-landing":
    case "internet-exchange":
    case "ai-data-center":
      return "digital";
    default:
      return "infra";
  }
}

/** 경로 kind → 색군 */
export function pathKindColorGroup(
  kind: "shipping-lane" | "submarine-cable" | "oil-pipeline" | "gas-pipeline" | "subsea-pipeline" | string,
): LayerColorGroup {
  switch (kind) {
    case "shipping-lane":
      return "infra";
    case "submarine-cable":
      return "digital";
    case "oil-pipeline":
    case "gas-pipeline":
    case "subsea-pipeline":
      return "energy";
    default:
      return "infra";
  }
}

/** 군 내 미세 밝기 차 — 완전 동일하면 겹칠 때 구분이 너무 없어서 ± */
const KIND_ALPHA: Record<string, number> = {
  // crisis
  "ucdp-event": 0.82,
  "refugee-camp": 0.78,
  "sanctions-entity": 0.8,
  // military
  "military-base": 0.88,
  "space-launch": 0.82,
  // infra
  airport: 0.78,
  port: 0.82,
  chokepoint: 0.9,
  "logistics-hub": 0.86,
  "submarine-tunnel": 0.84,
  "economic-center": 0.8,
  "critical-node": 0.88,
  // energy
  resource: 0.86,
  "nuclear-site": 0.9,
  "lng-terminal": 0.88,
  "gem-nuclear": 0.9,
  "gem-oil-gas-plant": 0.86,
  "gem-oil-gas-extraction": 0.84,
  "gem-coal-plant": 0.72,
  "gem-coal-mine": 0.68,
  "gem-coal-terminal": 0.7,
  "gem-solar": 0.8,
  "gem-wind": 0.78,
  "gem-hydro": 0.8,
  "gem-geothermal": 0.78,
  "gem-bioenergy": 0.76,
  "gem-iron-ore": 0.8,
  "gem-cement": 0.74,
  "gem-steel": 0.78,
  "gem-chemical": 0.8,
  // digital
  "cable-landing": 0.84,
  "internet-exchange": 0.8,
  "ai-data-center": 0.86,
};

export function staticKindRgba(
  kind: string,
  tone: BasemapTone = activeBasemapTone(),
): string {
  const group = staticKindColorGroup(kind);
  const alpha = KIND_ALPHA[kind] ?? 0.84;
  return groupRgba(group, alpha, tone);
}

export function pathKindRgba(
  kind: string,
  alpha = 0.86,
  tone: BasemapTone = activeBasemapTone(),
): string {
  return groupRgba(pathKindColorGroup(kind), alpha, tone);
}

export function markerPaletteForGroup(
  group: LayerColorGroup,
  tone: BasemapTone = activeBasemapTone(),
): {
  fill: string;
  glow: string;
  ink: string;
  rim: string;
} {
  const hex = groupHex(group, tone);
  if (tone === "light") {
    // 밝은 지도 위 배지: 진한 칩 + 흰 글자 + 흰 링으로 지도와 분리
    return {
      fill: hexToRgba(hex, group === "military" ? 0.82 : 0.95),
      glow: "rgba(255, 255, 255, 0.85)",
      ink: "rgba(255, 255, 255, 0.98)",
      rim: "rgba(255, 255, 255, 0.9)",
    };
  }
  return {
    fill: hexToRgba(hex, group === "military" ? 0.32 : 0.88),
    glow: hexToRgba(hex, 0.42),
    ink: "rgba(255, 255, 255, 0.96)",
    rim: hexToRgba(hex, 0.55),
  };
}
