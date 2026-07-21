/**
 * 수상전투함(구축함형) 다각도 실루엣.
 * 참고: Arleigh Burke / 이지스급 항공·측면 사진 —
 *   /assets/reference/ddg-aerial-bow-aft.png
 *   /assets/reference/ddg-arleigh-burke-profile.png
 *
 * 타원·알약형 금지. 俯視=날카로운 함수 + 평행 전폭 + 평평한 함미(트랜섬).
 * 측면=레이크 함수·포탑·계단식 함교·높은 마스트·연통·함미 비행갑판.
 */

export type SurfaceCombatantAspect =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export const SURFACE_COMBATANT_ASPECTS: readonly SurfaceCombatantAspect[] = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
] as const;

/** 정사각 캔버스 — 회전·방위 전환 시 중심 안정 */
export const SURFACE_COMBATANT_VIEWBOX = { width: 64, height: 64 } as const;

export const SURFACE_COMBATANT_REFERENCE = {
  aerialPath: "/assets/reference/ddg-aerial-bow-aft.png",
  profilePath: "/assets/reference/ddg-arleigh-burke-profile.png",
  description:
    "Aegis destroyer — sharp bow, flat transom, gun+VLS+radomes (top); rake bow + stepped bridge + mast (side)",
  sourceNote: "User-provided destroyer aerial + Arleigh Burke profile (2026)",
};

export type SurfaceCombatantIconSize = {
  width: number;
  height: number;
};

export const SURFACE_COMBATANT_MARKER_SIZE: SurfaceCombatantIconSize = {
  width: 52,
  height: 52,
};

export type SurfaceRadome = { cx: number; cy: number; r: number };

export type SurfaceAspectDrawing = {
  /** 헐·본체 — 날카로운 함수 / 평평한 함미 */
  hull: string;
  /** 디테일(함교·포·VLS·마스트 등) — 어두운 채움 */
  details: readonly string[];
  /** 밝은 하이라이트(포탑·레이더 면 등) */
  highlights?: readonly string[];
  /** 레이돔(구형) */
  radomes?: readonly SurfaceRadome[];
  /** 노란 진행축(선택) */
  axis?: string;
};

/**
 * 화면 상대 침로(도) → 8방위.
 * 0° = 화면 위쪽으로 항진(선수↑).
 */
export function surfaceCombatantAspectFromRelativeHeading(
  relativeHeadingDeg: number,
): SurfaceCombatantAspect {
  const h = ((relativeHeadingDeg % 360) + 360) % 360;
  const idx = Math.round(h / 45) % 8;
  return SURFACE_COMBATANT_ASPECTS[idx]!;
}

/** heading·bearing → 화면 상대 침로 */
export function surfaceCombatantRelativeHeading(
  headingDeg: number | null | undefined,
  mapBearingDeg: number | null | undefined,
): number {
  const heading = headingDeg != null && Number.isFinite(headingDeg) ? headingDeg : 0;
  const bearing = mapBearingDeg != null && Number.isFinite(mapBearingDeg) ? mapBearingDeg : 0;
  return ((heading - bearing) % 360 + 360) % 360;
}

/**
 * N: 俯視 선수↑
 * 바늘형 — 첨단 함수, 전폭 거의 일정, 함미 트랜섬(평평).
 */
const TOP_N: SurfaceAspectDrawing = {
  hull:
    "M 32,2 L 35.2,7 L 37,14 L 38.2,22 L 38.8,32 L 38.8,44 L 38,52 L 37.2,56 L 37.5,59 L 26.5,59 L 26.8,56 L 26,52 L 25.2,44 L 25.2,32 L 25.8,22 L 27,14 L 28.8,7 Z",
  details: [
    // 주포 포탑 + 포신(선수 방향)
    "M 30.2,11 L 33.8,11 L 34.2,15.5 L 33,16.5 L 31,16.5 L 29.8,15.5 Z",
    "M 31.5,8 L 32.5,8 L 32.5,11.2 L 31.5,11.2 Z",
    // 전방 VLS 격자
    "M 28.5,17.5 L 35.5,17.5 L 35.5,22.5 L 28.5,22.5 Z",
    "M 30.2,17.5 L 30.2,22.5 M 32,17.5 L 32,22.5 M 33.8,17.5 L 33.8,22.5 M 28.5,20 L 35.5,20",
    // 함교·상부구조 (각진 스텔스)
    "M 27,24 L 37,24 L 37.5,28 L 36.5,36 L 27.5,36 L 26.5,28 Z",
    "M 28.5,25.5 L 35.5,25.5 L 35.2,29 L 28.8,29 Z",
    // 마스트 기둥
    "M 31.3,24.5 L 32.7,24.5 L 32.4,18.8 L 31.6,18.8 Z",
    // 후방 연통·상부
    "M 28,37 L 36,37 L 35.5,44 L 28.5,44 Z",
    // 함미 비행갑판
    "M 27.5,46 L 36.5,46 L 36.2,56.5 L 27.8,56.5 Z",
    "M 29.5,49 L 34.5,49 M 32,47.5 L 32,55",
  ],
  highlights: [
    "M 30.4,12 L 33.6,12 L 33.8,14.8 L 30.2,14.8 Z",
    "M 29,26 L 35,26 L 34.8,28.2 L 29.2,28.2 Z",
  ],
  radomes: [
    { cx: 32, cy: 21.2, r: 1.7 },
    { cx: 32, cy: 33.5, r: 1.35 },
    { cx: 29.5, cy: 31.5, r: 0.9 },
    { cx: 34.5, cy: 31.5, r: 0.9 },
  ],
  axis: "M 32,4 L 32,57",
};

/** S: 俯視 선수↓ (함미가 화면 위) */
const TOP_S: SurfaceAspectDrawing = {
  hull:
    "M 32,62 L 35.2,57 L 37,50 L 38.2,42 L 38.8,32 L 38.8,20 L 38,12 L 37.2,8 L 37.5,5 L 26.5,5 L 26.8,8 L 26,12 L 25.2,20 L 25.2,32 L 25.8,42 L 27,50 L 28.8,57 Z",
  details: [
    "M 27.5,7.5 L 36.5,7.5 L 36.2,18 L 27.8,18 Z",
    "M 29.5,10.5 L 34.5,10.5 M 32,9 L 32,16.5",
    "M 28,20 L 36,20 L 35.5,27 L 28.5,27 Z",
    "M 27,28 L 37,28 L 37.5,36 L 36.5,40 L 27.5,40 L 26.5,36 Z",
    "M 28.5,35 L 35.5,35 L 35.2,38.5 L 28.8,38.5 Z",
    "M 31.3,39.5 L 32.7,39.5 L 32.4,45.2 L 31.6,45.2 Z",
    "M 28.5,41.5 L 35.5,41.5 L 35.5,46.5 L 28.5,46.5 Z",
    "M 30.2,46.5 L 30.2,51.5 M 32,46.5 L 32,51.5 M 33.8,46.5 L 33.8,51.5 M 28.5,49 L 35.5,49",
    "M 30.2,52.5 L 33.8,52.5 L 34.2,56 L 33,57 L 31,57 L 29.8,56 Z",
    "M 31.5,56.8 L 32.5,56.8 L 32.5,60 L 31.5,60 Z",
  ],
  highlights: [
    "M 29,36 L 35,36 L 34.8,38.2 L 29.2,38.2 Z",
    "M 30.4,53.2 L 33.6,53.2 L 33.8,55.5 L 30.2,55.5 Z",
  ],
  radomes: [
    { cx: 32, cy: 30.5, r: 1.35 },
    { cx: 32, cy: 42.8, r: 1.7 },
    { cx: 29.5, cy: 32.5, r: 0.9 },
    { cx: 34.5, cy: 32.5, r: 0.9 },
  ],
  axis: "M 32,7 L 32,60",
};

/**
 * E: 옆모습 선수→ (Burke급 프로필)
 * 레이크 함수 · 주포 · 계단 함교 · 높은 마스트 · 연통 2 · 함미 비행갑판
 */
const SIDE_E: SurfaceAspectDrawing = {
  hull:
    "M 3,44 L 6,38 L 11,33 L 16,30.5 L 22,29.5 L 30,29 L 42,28.5 L 52,29 L 58,30.5 L 61,34 L 62,40 L 61,45 L 56,47 L 40,48 L 22,48 L 12,47 L 6,46 L 3,45 Z",
  details: [
    // 주포
    "M 17,29.5 L 21,29.5 L 21.5,33.5 L 20,34.5 L 18,34.5 L 16.5,33.5 Z",
    "M 14.5,30.5 L 17.2,30.5 L 17.2,32 L 14.5,32 Z",
    // 전방 상부(브릿지 앞단)
    "M 22,29.2 L 26,24 L 29,23.5 L 31,29",
    // 함교·이지스 면 (각진 블록)
    "M 26,29 L 31,22 L 38,20.5 L 42,22.5 L 43,29.2",
    "M 28.5,24.5 L 36.5,23 L 36.8,26.5 L 29,27.5 Z",
    // 주마스트 (높이 강조)
    "M 34.2,20.5 L 36,20.5 L 35.6,8 L 34.6,8 Z",
    "M 33.2,11 L 37,11 L 36.7,13.5 L 33.5,13.5 Z",
    "M 34.8,8 L 35.4,8 L 35.2,5.5 L 35,5.5 Z",
    // 연통 1·2
    "M 38.5,22 L 42.5,21.5 L 43,28.5 L 39,29 Z",
    "M 45,23.5 L 49,23 L 49.5,29 L 45.5,29.2 Z",
    // 후부 상부·비행갑판 라인
    "M 50,29.2 L 58,30 L 58,34 L 50,33.5 Z",
    "M 52,31 L 57,31.5",
  ],
  highlights: [
    "M 29,24.2 L 36,22.8 L 36.2,25.2 L 29.3,26.2 Z",
    "M 39.2,23 L 42,22.6 L 42.3,25.5 L 39.5,25.8 Z",
  ],
  radomes: [
    { cx: 35.1, cy: 9.8, r: 1.6 },
    { cx: 35.1, cy: 15.5, r: 1.1 },
    { cx: 40.5, cy: 20.8, r: 0.85 },
  ],
  axis: "M 5,41 L 60,41",
};

/** W: 옆모습 선수← */
const SIDE_W: SurfaceAspectDrawing = {
  hull:
    "M 61,44 L 58,38 L 53,33 L 48,30.5 L 42,29.5 L 34,29 L 22,28.5 L 12,29 L 6,30.5 L 3,34 L 2,40 L 3,45 L 8,47 L 24,48 L 42,48 L 52,47 L 58,46 L 61,45 Z",
  details: [
    "M 47,29.5 L 43,29.5 L 42.5,33.5 L 44,34.5 L 46,34.5 L 47.5,33.5 Z",
    "M 49.5,30.5 L 46.8,30.5 L 46.8,32 L 49.5,32 Z",
    "M 42,29.2 L 38,24 L 35,23.5 L 33,29",
    "M 38,29 L 33,22 L 26,20.5 L 22,22.5 L 21,29.2",
    "M 35.5,24.5 L 27.5,23 L 27.2,26.5 L 35,27.5 Z",
    "M 29.8,20.5 L 28,20.5 L 28.4,8 L 29.4,8 Z",
    "M 30.8,11 L 27,11 L 27.3,13.5 L 30.5,13.5 Z",
    "M 29.2,8 L 28.6,8 L 28.8,5.5 L 29,5.5 Z",
    "M 25.5,22 L 21.5,21.5 L 21,28.5 L 25,29 Z",
    "M 19,23.5 L 15,23 L 14.5,29 L 18.5,29.2 Z",
    "M 14,29.2 L 6,30 L 6,34 L 14,33.5 Z",
    "M 12,31 L 7,31.5",
  ],
  highlights: [
    "M 35,24.2 L 28,22.8 L 27.8,25.2 L 34.7,26.2 Z",
    "M 24.8,23 L 22,22.6 L 21.7,25.5 L 24.5,25.8 Z",
  ],
  radomes: [
    { cx: 28.9, cy: 9.8, r: 1.6 },
    { cx: 28.9, cy: 15.5, r: 1.1 },
    { cx: 23.5, cy: 20.8, r: 0.85 },
  ],
  axis: "M 59,41 L 4,41",
};

/** NE: 대각 3/4 — 첨단 함수 + 트랜섬 암시 */
const QUARTER_NE: SurfaceAspectDrawing = {
  hull:
    "M 42,5 L 50,12 L 53,22 L 52,34 L 48,46 L 42,54 L 32,57 L 22,54 L 16,44 L 15,32 L 18,20 L 26,10 Z",
  details: [
    "M 36,12 L 43,14 L 43.5,19 L 38,20.5 L 34.5,17 Z",
    "M 34,14.5 L 36.5,14.5 L 36.5,12 L 34,12 Z",
    "M 30,21 L 46,25 L 44.5,34 L 28.5,30 Z",
    "M 32,23.5 L 42,26 L 41.5,29 L 32.5,26.5 Z",
    "M 35.5,22 L 37,22 L 37.5,14 L 36,14 Z",
    "M 26,36 L 42,40 L 40.5,50 L 26.5,46 Z",
    "M 30,42 L 38,44 M 34,40 L 34,48",
  ],
  highlights: ["M 37,15 L 42,16.5 L 42,18.5 L 37.5,17.5 Z"],
  radomes: [
    { cx: 36.5, cy: 18.5, r: 1.4 },
    { cx: 34, cy: 28, r: 1.1 },
  ],
};

/** NW: 대각 3/4 선수 좌상 */
const QUARTER_NW: SurfaceAspectDrawing = {
  hull:
    "M 22,5 L 14,12 L 11,22 L 12,34 L 16,46 L 22,54 L 32,57 L 42,54 L 48,44 L 49,32 L 46,20 L 38,10 Z",
  details: [
    "M 28,12 L 21,14 L 20.5,19 L 26,20.5 L 29.5,17 Z",
    "M 30,14.5 L 27.5,14.5 L 27.5,12 L 30,12 Z",
    "M 34,21 L 18,25 L 19.5,34 L 35.5,30 Z",
    "M 32,23.5 L 22,26 L 22.5,29 L 31.5,26.5 Z",
    "M 28.5,22 L 27,22 L 26.5,14 L 28,14 Z",
    "M 38,36 L 22,40 L 23.5,50 L 37.5,46 Z",
    "M 34,42 L 26,44 M 30,40 L 30,48",
  ],
  highlights: ["M 27,15 L 22,16.5 L 22,18.5 L 26.5,17.5 Z"],
  radomes: [
    { cx: 27.5, cy: 18.5, r: 1.4 },
    { cx: 30, cy: 28, r: 1.1 },
  ],
};

/** SE: 대각 3/4 선수 우하 */
const QUARTER_SE: SurfaceAspectDrawing = {
  hull:
    "M 42,59 L 50,52 L 53,42 L 52,30 L 48,18 L 42,10 L 32,7 L 22,10 L 16,20 L 15,32 L 18,44 L 26,54 Z",
  details: [
    "M 26,14 L 40,10 L 42,16 L 30,20 Z",
    "M 28,20 L 44,24 L 42.5,34 L 26.5,30 Z",
    "M 34,32 L 36,32 L 36.5,42 L 34.5,42 Z",
    "M 34,44 L 42,46 L 41,52 L 34,50 Z",
    "M 30,48 L 38,50 M 34,46 L 34,54",
  ],
  highlights: ["M 30,12 L 38,10 L 38.5,13 L 30.5,14.5 Z"],
  radomes: [
    { cx: 34, cy: 26, r: 1.1 },
    { cx: 36, cy: 36, r: 1.3 },
  ],
};

/** SW: 대각 3/4 선수 좌하 */
const QUARTER_SW: SurfaceAspectDrawing = {
  hull:
    "M 22,59 L 14,52 L 11,42 L 12,30 L 16,18 L 22,10 L 32,7 L 42,10 L 48,20 L 49,32 L 46,44 L 38,54 Z",
  details: [
    "M 38,14 L 24,10 L 22,16 L 34,20 Z",
    "M 36,20 L 20,24 L 21.5,34 L 37.5,30 Z",
    "M 30,32 L 28,32 L 27.5,42 L 29.5,42 Z",
    "M 30,44 L 22,46 L 23,52 L 30,50 Z",
    "M 34,48 L 26,50 M 30,46 L 30,54",
  ],
  highlights: ["M 34,12 L 26,10 L 25.5,13 L 33.5,14.5 Z"],
  radomes: [
    { cx: 30, cy: 26, r: 1.1 },
    { cx: 28, cy: 36, r: 1.3 },
  ],
};

export const SURFACE_COMBATANT_ASPECT_DRAWINGS: Record<
  SurfaceCombatantAspect,
  SurfaceAspectDrawing
> = {
  n: TOP_N,
  ne: QUARTER_NE,
  e: SIDE_E,
  se: QUARTER_SE,
  s: TOP_S,
  sw: QUARTER_SW,
  w: SIDE_W,
  nw: QUARTER_NW,
};
