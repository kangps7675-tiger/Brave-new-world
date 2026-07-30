/**
 * 위장·다크플리트 — Farnborough Q-ship 위장 상선 옆모습 (솔리드 실루엣).
 * 함수(잭스태프) · 플러시 갑판 · 전/후 마스트+데릭 · 중앙 함교·굴뚝 · 함미 갑판화물.
 *
 * 참고: 사용자 제공 Farnborough “as she appeared when disguised”
 */

import type { SurfaceCombatantAspect } from "@/data/surfaceCombatantSilhouette";
import {
  SURFACE_COMBATANT_ASPECTS,
  surfaceCombatantAspectFromRelativeHeading,
  surfaceCombatantRelativeHeading,
} from "@/data/surfaceCombatantSilhouette";

export type ShadowFleetAspect = SurfaceCombatantAspect;

export {
  surfaceCombatantAspectFromRelativeHeading as shadowFleetAspectFromRelativeHeading,
  surfaceCombatantRelativeHeading as shadowFleetRelativeHeading,
  SURFACE_COMBATANT_ASPECTS as SHADOW_FLEET_ASPECTS,
};

export const SHADOW_FLEET_VIEWBOX = { width: 64, height: 64 } as const;

/** 옆모습 — 가늘고 긴 상선 비율 */
export const SHADOW_FLEET_MARKER_SIZE = { width: 64, height: 36 } as const;

export const SHADOW_FLEET_REFERENCE = {
  description:
    "Farnborough disguised merchant — sharp bow/stern, flush deck, twin masts+derricks, mid funnel/bridge, deck cargo",
  sourceNote: "Farnborough disguised-merchant silhouette (user reference, 2026)",
};

export type ShadowFleetDrawing = {
  /** 헐만 (날카로운 함수·평 함미 · 낮은 흘수) */
  hull: string;
  /** 마스트·데릭·함교·굴뚝·화물·잭스태프 — 헐과 동일 채움(솔리드 실루엣) */
  details: readonly string[];
  wires?: readonly string[];
};

/**
 * E: 선수→좌 / 함미→우
 * Farnborough 위장형 — 풍선형 금지, 긴 직사각형 헐 + 갑판 상부구조.
 */
const SIDE_E: ShadowFleetDrawing = {
  // 날카로운 함수 → 평갑판 → 거의 수직 함미 · 낮은 흘수(풍선 타원 금지)
  hull:
    "M 1.5,41 L 3,34 L 6,30 L 11,28 L 18,27.5 L 46,27.5 L 54,28 L 58.5,29.5 L 61,33 L 62,38 L 61.5,43 L 58,45 L 48,45.5 L 20,45.5 L 10,44.5 L 4,43 L 1.5,41.5 Z",
  details: [
    // 잭스태프
    "M 5.5,27.5 L 6.3,27.5 L 6.05,16 L 5.35,16 Z",
    // 전방 갑판화물 스택
    "M 9,24 L 15,24 L 15,27.5 L 9,27.5 Z",
    "M 10.5,21.5 L 13.5,21.5 L 13.5,24 L 10.5,24 Z",
    // 전마스트 (가늘고 높게)
    "M 17.15,27.5 L 18.05,27.5 L 17.85,6 L 17.35,6 Z",
    // 전마스트 데릭 (Y / topped)
    "M 17.6,11 L 11.5,20.5 L 12.4,21.3 L 17.85,13 Z",
    "M 17.7,11 L 24.2,21 L 23.3,21.8 L 17.6,13 Z",
    "M 17.6,15 L 14,24.5 L 14.9,25.2 L 17.85,17 Z",
    "M 17.7,15 L 21.8,24.5 L 20.9,25.2 L 17.6,17 Z",
    // 어닝 스탠션 (짧은 기둥)
    "M 25.2,24.5 L 25.85,24.5 L 25.7,27.5 L 25.05,27.5 Z",
    "M 27.6,24 L 28.25,24 L 28.1,27.5 L 27.45,27.5 Z",
    "M 30,24.5 L 30.65,24.5 L 30.5,27.5 L 29.85,27.5 Z",
    // 중앙 함교 (블록 · 다층)
    "M 31.5,20 L 42.2,20 L 42.5,27.5 L 31.2,27.5 Z",
    "M 32.8,16.5 L 40.8,16.5 L 41,20 L 32.6,20 Z",
    // 주 굴뚝 (두껍고 높게)
    "M 35.2,8 L 39.3,8 L 39.1,16.5 L 35.4,16.5 Z",
    "M 35.6,6.2 L 38.9,6.2 L 38.7,8 L 35.8,8 Z",
    // 도니키 보일러 소형 굴뚝
    "M 40.6,13.5 L 42.3,13.5 L 42.15,19.5 L 40.75,19.5 Z",
    // 벤틸레이터
    "M 33,13.8 L 34.5,13.8 L 34.35,16.5 L 33.15,16.5 Z",
    // 후마스트
    "M 48.15,27.5 L 49.05,27.5 L 48.85,7 L 48.35,7 Z",
    // 후마스트 데릭
    "M 48.6,12 L 43,21.5 L 43.9,22.3 L 48.85,14 Z",
    "M 48.7,12 L 55,21.5 L 54.1,22.3 L 48.6,14 Z",
    "M 48.6,16 L 45.2,25 L 46.1,25.7 L 48.85,18 Z",
    "M 48.7,16 L 52.8,25 L 51.9,25.7 L 48.6,18 Z",
    // 함미 갑판화물
    "M 52,23.5 L 58.5,23.5 L 58.5,27.5 L 52,27.5 Z",
    "M 53.5,20.5 L 57,20.5 L 57,23.5 L 53.5,23.5 Z",
    // 함미 작은 깃대
    "M 59.2,27.5 L 59.9,27.5 L 59.7,22 L 59.1,22 Z",
  ],
  wires: ["M 17.7,7.2 L 48.7,8"],
};

/** W: SIDE_E 좌우 반전 (x' = 64 − x) */
const SIDE_W: ShadowFleetDrawing = {
  hull:
    "M 62.5,41 L 61,34 L 58,30 L 53,28 L 46,27.5 L 18,27.5 L 10,28 L 5.5,29.5 L 3,33 L 2,38 L 2.5,43 L 6,45 L 16,45.5 L 44,45.5 L 54,44.5 L 60,43 L 62.5,41.5 Z",
  details: [
    "M 58.5,27.5 L 57.7,27.5 L 57.95,16 L 58.65,16 Z",
    "M 55,24 L 49,24 L 49,27.5 L 55,27.5 Z",
    "M 53.5,21.5 L 50.5,21.5 L 50.5,24 L 53.5,24 Z",
    "M 46.85,27.5 L 45.95,27.5 L 46.15,6 L 46.65,6 Z",
    "M 46.4,11 L 52.5,20.5 L 51.6,21.3 L 46.15,13 Z",
    "M 46.3,11 L 39.8,21 L 40.7,21.8 L 46.4,13 Z",
    "M 46.4,15 L 50,24.5 L 49.1,25.2 L 46.15,17 Z",
    "M 46.3,15 L 42.2,24.5 L 43.1,25.2 L 46.4,17 Z",
    "M 38.8,24.5 L 38.15,24.5 L 38.3,27.5 L 38.95,27.5 Z",
    "M 36.4,24 L 35.75,24 L 35.9,27.5 L 36.55,27.5 Z",
    "M 34,24.5 L 33.35,24.5 L 33.5,27.5 L 34.15,27.5 Z",
    "M 32.5,20 L 21.8,20 L 21.5,27.5 L 32.8,27.5 Z",
    "M 31.2,16.5 L 23.2,16.5 L 23,20 L 31.4,20 Z",
    "M 28.8,8 L 24.7,8 L 24.9,16.5 L 28.6,16.5 Z",
    "M 28.4,6.2 L 25.1,6.2 L 25.3,8 L 28.2,8 Z",
    "M 23.4,13.5 L 21.7,13.5 L 21.85,19.5 L 23.25,19.5 Z",
    "M 31,13.8 L 29.5,13.8 L 29.65,16.5 L 30.85,16.5 Z",
    "M 15.85,27.5 L 14.95,27.5 L 15.15,7 L 15.65,7 Z",
    "M 15.4,12 L 21,21.5 L 20.1,22.3 L 15.15,14 Z",
    "M 15.3,12 L 9,21.5 L 9.9,22.3 L 15.4,14 Z",
    "M 15.4,16 L 18.8,25 L 17.9,25.7 L 15.15,18 Z",
    "M 15.3,16 L 11.2,25 L 12.1,25.7 L 15.4,18 Z",
    "M 12,23.5 L 5.5,23.5 L 5.5,27.5 L 12,27.5 Z",
    "M 10.5,20.5 L 7,20.5 L 7,23.5 L 10.5,23.5 Z",
    "M 4.8,27.5 L 4.1,27.5 L 4.3,22 L 4.9,22 Z",
  ],
  wires: ["M 46.3,7.2 L 15.3,8"],
};

export const SHADOW_FLEET_ASPECT_DRAWINGS: Record<ShadowFleetAspect, ShadowFleetDrawing> = {
  n: SIDE_E,
  ne: SIDE_E,
  e: SIDE_E,
  se: SIDE_E,
  s: SIDE_W,
  sw: SIDE_W,
  w: SIDE_W,
  nw: SIDE_W,
};

export function shadowFleetFacingFromRelativeHeading(relativeDeg: number): "e" | "w" {
  const r = ((relativeDeg % 360) + 360) % 360;
  return r > 180 ? "w" : "e";
}
