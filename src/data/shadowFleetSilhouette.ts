/**
 * 위장·다크플리트 선박 — Farnborough Q-ship / 상선 옆모습 실루엣 통일.
 * 긴 플러시 갑판 · 전·후 마스트+데릭 · 중앙 함교·굴뚝 · 갑판 화물.
 *
 * 참고: 사용자 제공 Farnborough “as she appeared when disguised” 실루엣
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

/** 옆모습 위주 — 가로로 긴 마커 */
export const SHADOW_FLEET_MARKER_SIZE = { width: 56, height: 40 } as const;

export const SHADOW_FLEET_REFERENCE = {
  description:
    "Camouflage / Q-ship merchant profile — flush deck, twin masts with derricks, central funnel & bridge, deck cargo",
  sourceNote: "Farnborough disguised-merchant silhouette (user reference, 2026)",
};

export type ShadowFleetDrawing = {
  /** 본체 헐 */
  hull: string;
  /** 마스트·데릭·함교·굴뚝·갑판화물·잭스태프 */
  details: readonly string[];
  /** 마스트 사이 안테나 등 가는 선 */
  wires?: readonly string[];
};

/**
 * E: 선수→ (좌→우) — Farnborough 위장 상선 옆모습.
 * 잭스태프 · 전마스트+데릭 · 중앙 함교/굴뚝 · 후마스트+데릭 · 갑판화물.
 */
const SIDE_E: ShadowFleetDrawing = {
  hull:
    "M 2,44 L 4,37 L 7,33 L 12,30.5 L 20,29 L 44,29 L 52,29.5 L 57,31.5 L 60.5,35 L 62,40 L 61.5,46.5 L 58,49.5 L 42,50.5 L 22,50 L 10,48.5 L 4,46.5 L 2,45 Z",
  details: [
    // 잭스태프 (선수)
    "M 6.2,29.5 L 7,29.5 L 6.7,18 L 6.1,18 Z",
    // 전방 갑판화물
    "M 10,26.5 L 15.5,26.5 L 15.5,29.2 L 10,29.2 Z",
    "M 12,24 L 14.5,24 L 14.5,26.5 L 12,26.5 Z",
    // 전마스트
    "M 17.2,29 L 18.4,29 L 18.1,8 L 17.5,8 Z",
    // 전마스트 데릭 (Y/대각)
    "M 17.8,14 L 12,22 L 12.8,23 L 18.2,16 Z",
    "M 18,14 L 24.5,22.5 L 23.7,23.5 L 17.8,16 Z",
    "M 17.8,18 L 14,26 L 14.8,26.8 L 18.2,20 Z",
    "M 18,18 L 22.5,26 L 21.7,26.8 L 17.8,20 Z",
    // 중부 어닝·스탠션 (짧은 기둥들)
    "M 25,26 L 25.7,26 L 25.5,29 L 24.8,29 Z",
    "M 27.5,25.5 L 28.2,25.5 L 28,29 L 27.3,29 Z",
    "M 30,26 L 30.7,26 L 30.5,29 L 29.8,29 Z",
    // 중앙 함교 블록
    "M 32,22 L 42,22 L 42.5,29.2 L 31.5,29.2 Z",
    "M 33.5,18.5 L 40.5,18.5 L 40.8,22 L 33.2,22 Z",
    // 주 굴뚝
    "M 35.5,10 L 39.2,10 L 39,18.5 L 35.7,18.5 Z",
    "M 36,8.5 L 38.7,8.5 L 38.5,10 L 36.2,10 Z",
    // 도니키 보일러 소형 굴뚝
    "M 40.5,15 L 42.2,15 L 42,20 L 40.7,20 Z",
    // 벤틸레이터
    "M 33.2,15.5 L 34.6,15.5 L 34.4,18.5 L 33.4,18.5 Z",
    // 후마스트
    "M 48.2,29.2 L 49.4,29.2 L 49.1,9 L 48.5,9 Z",
    // 후마스트 데릭
    "M 48.8,14 L 43.5,23 L 44.3,24 L 49.2,16 Z",
    "M 49,14 L 55,23.5 L 54.2,24.5 L 48.8,16 Z",
    "M 48.8,18 L 45.5,27 L 46.3,27.8 L 49.2,20 Z",
    "M 49,18 L 53,27 L 52.2,27.8 L 48.8,20 Z",
    // 선미 갑판화물
    "M 52.5,25.5 L 58,25.5 L 58,29.2 L 52.5,29.2 Z",
    "M 54,23 L 57,23 L 57,25.5 L 54,25.5 Z",
  ],
  wires: [
    // 마스트 사이 안테나
    "M 18,9.5 L 48.8,10.5",
  ],
};

/** W: SIDE_E 좌우 반전 (x' = 64 - x) */
const SIDE_W: ShadowFleetDrawing = {
  hull:
    "M 62,44 L 60,37 L 57,33 L 52,30.5 L 44,29 L 20,29 L 12,29.5 L 7,31.5 L 3.5,35 L 2,40 L 2.5,46.5 L 6,49.5 L 22,50.5 L 42,50 L 54,48.5 L 60,46.5 L 62,45 Z",
  details: [
    "M 57.8,29.5 L 57,29.5 L 57.3,18 L 57.9,18 Z",
    "M 54,26.5 L 48.5,26.5 L 48.5,29.2 L 54,29.2 Z",
    "M 52,24 L 49.5,24 L 49.5,26.5 L 52,26.5 Z",
    "M 46.8,29 L 45.6,29 L 45.9,8 L 46.5,8 Z",
    "M 46.2,14 L 52,22 L 51.2,23 L 45.8,16 Z",
    "M 46,14 L 39.5,22.5 L 40.3,23.5 L 46.2,16 Z",
    "M 46.2,18 L 50,26 L 49.2,26.8 L 45.8,20 Z",
    "M 46,18 L 41.5,26 L 42.3,26.8 L 46.2,20 Z",
    "M 39,26 L 38.3,26 L 38.5,29 L 39.2,29 Z",
    "M 36.5,25.5 L 35.8,25.5 L 36,29 L 36.7,29 Z",
    "M 34,26 L 33.3,26 L 33.5,29 L 34.2,29 Z",
    "M 32,22 L 22,22 L 21.5,29.2 L 32.5,29.2 Z",
    "M 30.5,18.5 L 23.5,18.5 L 23.2,22 L 30.8,22 Z",
    "M 28.5,10 L 24.8,10 L 25,18.5 L 28.3,18.5 Z",
    "M 28,8.5 L 25.3,8.5 L 25.5,10 L 27.8,10 Z",
    "M 23.5,15 L 21.8,15 L 22,20 L 23.3,20 Z",
    "M 30.8,15.5 L 29.4,15.5 L 29.6,18.5 L 30.6,18.5 Z",
    "M 15.8,29.2 L 14.6,29.2 L 14.9,9 L 15.5,9 Z",
    "M 15.2,14 L 20.5,23 L 19.7,24 L 14.8,16 Z",
    "M 15,14 L 9,23.5 L 9.8,24.5 L 15.2,16 Z",
    "M 15.2,18 L 18.5,27 L 17.7,27.8 L 14.8,20 Z",
    "M 15,18 L 11,27 L 11.8,27.8 L 15.2,20 Z",
    "M 11.5,25.5 L 6,25.5 L 6,29.2 L 11.5,29.2 Z",
    "M 10,23 L 7,23 L 7,25.5 L 10,25.5 Z",
  ],
  wires: ["M 46,9.5 L 15.2,10.5"],
};

/**
 * 방위는 침로용으로만 쓰고, 표지는 옆모습(E/W)으로 통일.
 * N/NE/E/SE → E, S/SW/W/NW → W
 */
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

/** 침로 기준 좌/우 옆모습만 */
export function shadowFleetFacingFromRelativeHeading(relativeDeg: number): "e" | "w" {
  const r = ((relativeDeg % 360) + 360) % 360;
  return r > 180 ? "w" : "e";
}
