/**
 * 잠수함 8방위 실루엣 — 시가형 헐·세일(코닝타워)·함미 십자타.
 * 참조: public/assets/reference/submarine-underwater-aerial.png
 *
 * 방위 타입·상대침로 계산은 수상전투함과 동일 헬퍼 재사용.
 */

import type { SurfaceCombatantAspect } from "@/data/surfaceCombatantSilhouette";

export type { SurfaceCombatantAspect as SubmarineAspect };

export const SUBMARINE_VIEWBOX = { width: 64, height: 64 } as const;

export const SUBMARINE_REFERENCE = {
  imagePath: "/assets/reference/submarine-underwater-aerial.png",
  description: "SSN/SSBN cigar hull — sail, fairwater planes, cruciform stern",
  sourceNote: "User-provided underwater submarine references (2026)",
};

export type SubmarineIconSize = {
  width: number;
  height: number;
};

export const SUBMARINE_MARKER_SIZE: SubmarineIconSize = {
  width: 48,
  height: 48,
};

/** AIS 지도 — 옆모습 크롭 비율 */
export const SUBMARINE_PROFILE_SIZE: SubmarineIconSize = {
  width: 52,
  height: 28,
};

export type SubmarineAspectDrawing = {
  hull: string;
  details: readonly string[];
  axis?: string;
};

/** N: 俯視 선수↑ — 세일·함미타 */
const TOP_N: SubmarineAspectDrawing = {
  hull:
    "M 32,6 C 40,8 44,16 44,28 C 44,42 40,52 32,58 C 24,52 20,42 20,28 C 20,16 24,8 32,6 Z",
  details: [
    "M 28,18 L 36,18 L 36,28 L 28,28 Z",
    "M 24,24 L 28,24 L 28,26 L 24,26 Z",
    "M 36,24 L 40,24 L 40,26 L 36,26 Z",
    "M 30,52 L 34,52 L 34,58 L 30,58 Z",
    "M 26,54 L 38,54 L 38,56 L 26,56 Z",
  ],
  axis: "M 32,8 L 32,56",
};

/** S: 俯視 선수↓ */
const TOP_S: SubmarineAspectDrawing = {
  hull:
    "M 32,58 C 40,56 44,48 44,36 C 44,22 40,12 32,6 C 24,12 20,22 20,36 C 20,48 24,56 32,58 Z",
  details: [
    "M 28,36 L 36,36 L 36,46 L 28,46 Z",
    "M 24,40 L 28,40 L 28,42 L 24,42 Z",
    "M 36,40 L 40,40 L 40,42 L 36,42 Z",
    "M 30,6 L 34,6 L 34,12 L 30,12 Z",
    "M 26,8 L 38,8 L 38,10 L 26,10 Z",
  ],
  axis: "M 32,56 L 32,10",
};

/** E: 옆모습 선수→ — 시가형 헐 · 세일 · 함미타 */
const SIDE_E: SubmarineAspectDrawing = {
  hull:
    "M 4,38 L 7,32 L 14,28.5 L 28,27 L 42,27.5 L 52,29.5 L 58,33 L 60,37 L 58.5,41 L 52,43.5 L 36,44.5 L 18,44 L 8,41.5 L 4,38.5 Z",
  details: [
    // 세일(코닝타워)
    "M 26,16 L 34,16 L 34.5,28 L 25.5,28 Z",
    "M 27.5,12 L 32.5,12 L 32.8,16 L 27.2,16 Z",
    // 페어워터 플레인
    "M 22,24 L 38,24 L 37.5,26 L 22.5,26 Z",
    // 함미 십자타 / 프로펠 영역
    "M 54,30 L 61,28 L 62,37 L 61,42 L 54,40 Z",
    "M 56,26 L 58,26 L 58,44 L 56,44 Z",
  ],
};

/** W: 옆모습 선수← */
const SIDE_W: SubmarineAspectDrawing = {
  hull:
    "M 60,38 L 57,32 L 50,28.5 L 36,27 L 22,27.5 L 12,29.5 L 6,33 L 4,37 L 5.5,41 L 12,43.5 L 28,44.5 L 46,44 L 56,41.5 L 60,38.5 Z",
  details: [
    "M 38,16 L 30,16 L 29.5,28 L 38.5,28 Z",
    "M 36.5,12 L 31.5,12 L 31.2,16 L 36.8,16 Z",
    "M 42,24 L 26,24 L 26.5,26 L 41.5,26 Z",
    "M 10,30 L 3,28 L 2,37 L 3,42 L 10,40 Z",
    "M 8,26 L 6,26 L 6,44 L 8,44 Z",
  ],
};

/** NE: 3/4 선수 우상 */
const QUARTER_NE: SubmarineAspectDrawing = {
  hull:
    "M 38,10 C 48,16 52,26 50,38 C 48,50 40,56 28,54 C 18,50 14,40 16,28 C 18,16 28,10 38,10 Z",
  details: [
    "M 30,18 L 38,20 L 37,30 L 29,28 Z",
    "M 24,26 L 30,28 L 29,31 L 24,29 Z",
    "M 34,48 L 42,50 L 40,56 L 32,54 Z",
    "M 36,50 L 44,48 L 46,52 L 38,54 Z",
  ],
};

/** NW: 3/4 선수 좌상 */
const QUARTER_NW: SubmarineAspectDrawing = {
  hull:
    "M 26,10 C 16,16 12,26 14,38 C 16,50 24,56 36,54 C 46,50 50,40 48,28 C 46,16 36,10 26,10 Z",
  details: [
    "M 34,18 L 26,20 L 27,30 L 35,28 Z",
    "M 40,26 L 34,28 L 35,31 L 40,29 Z",
    "M 30,48 L 22,50 L 24,56 L 32,54 Z",
    "M 28,50 L 20,48 L 18,52 L 26,54 Z",
  ],
};

/** SE: 3/4 선수 우하 */
const QUARTER_SE: SubmarineAspectDrawing = {
  hull:
    "M 38,54 C 48,48 52,38 50,26 C 48,14 40,8 28,10 C 18,14 14,24 16,36 C 18,48 28,54 38,54 Z",
  details: [
    "M 28,34 L 36,36 L 35,46 L 27,44 Z",
    "M 22,38 L 28,40 L 27,43 L 22,41 Z",
    "M 34,12 L 42,14 L 40,20 L 32,18 Z",
    "M 36,14 L 44,12 L 46,16 L 38,18 Z",
  ],
};

/** SW: 3/4 선수 좌하 */
const QUARTER_SW: SubmarineAspectDrawing = {
  hull:
    "M 26,54 C 16,48 12,38 14,26 C 16,14 24,8 36,10 C 46,14 50,24 48,36 C 46,48 36,54 26,54 Z",
  details: [
    "M 36,34 L 28,36 L 29,46 L 37,44 Z",
    "M 42,38 L 36,40 L 37,43 L 42,41 Z",
    "M 30,12 L 22,14 L 24,20 L 32,18 Z",
    "M 28,14 L 20,12 L 18,16 L 26,18 Z",
  ],
};

export const SUBMARINE_ASPECT_DRAWINGS: Record<SurfaceCombatantAspect, SubmarineAspectDrawing> = {
  n: TOP_N,
  ne: QUARTER_NE,
  e: SIDE_E,
  se: QUARTER_SE,
  s: TOP_S,
  sw: QUARTER_SW,
  w: SIDE_W,
  nw: QUARTER_NW,
};
