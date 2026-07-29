/**
 * 수상전투함 다각도 실루엣 — 호위함과 동일 세트, 구축·초계·순양·미분류 군함 공용.
 * (잠수함·항모 제외)
 *
 * 설계: 전 방위가 “가늘고 긴 함형” — 날카로운 함수·평 함미.
 * 대각(NE/NW/SE/SW)은 blob 타원이 아니라 45° 투영 헐.
 *
 * 참고:
 *   /assets/reference/ddg-aerial-bow-aft.png
 *   /assets/reference/ddg-arleigh-burke-profile.png
 *   /assets/reference/rok-ddg-surface-combatant-aerial.png
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
  rokAerialPath: "/assets/reference/rok-ddg-surface-combatant-aerial.png",
  description:
    "Surface combatant — sharp bow, flat transom, gun+VLS+radome mast (top); rake bow + Aegis bridge + lattice mast (side)",
  sourceNote: "User aerial + USS Ralph Johnson (DDG-114) profile · ROK DDG aerial (2026)",
};

export type SurfaceCombatantIconSize = {
  width: number;
  height: number;
};

export const SURFACE_COMBATANT_MARKER_SIZE: SurfaceCombatantIconSize = {
  width: 56,
  height: 56,
};

/** 주간 함정 이동기·리스트용 — 옆모습 고정 */
export const SURFACE_COMBATANT_PROFILE_SIZE: SurfaceCombatantIconSize = {
  width: 52,
  height: 36,
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
  /** 노란 갑판 안전선·진행축 */
  axis?: string;
  /** 수면·웨이크 선 (옆모습 아이콘) */
  waves?: readonly string[];
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
 * N: 俯視 선수↑ — 가늘고 긴 스텔스 헐 (함수 첨예·함미 평)
 */
const TOP_N: SurfaceAspectDrawing = {
  hull:
    "M 32,1 L 35.2,7 L 36.8,14 L 37.5,24 L 37.8,34 L 37.4,44 L 36.6,52 L 35.6,57.5 L 35.2,60.5 L 28.8,60.5 L 28.4,57.5 L 27.4,52 L 26.6,44 L 26.2,34 L 26.5,24 L 27.2,14 L 28.8,7 Z",
  details: [
    "M 30,9 L 34,9 L 34.4,13.5 L 33,14.6 L 31,14.6 L 29.6,13.5 Z",
    "M 31.4,5.5 L 32.6,5.5 L 32.6,9.2 L 31.4,9.2 Z",
    "M 28.6,15.8 L 35.4,15.8 L 35.4,21 L 28.6,21 Z",
    "M 30.2,15.8 L 30.2,21 M 32,15.8 L 32,21 M 33.8,15.8 L 33.8,21 M 28.6,18.4 L 35.4,18.4",
    "M 27.4,22.5 L 36.6,22.5 L 37,27 L 36,36.5 L 28,36.5 L 27,27 Z",
    "M 29,24 L 35,24 L 34.8,28.5 L 29.2,28.5 Z",
    "M 31.3,22.8 L 32.7,22.8 L 32.5,14.2 L 31.5,14.2 Z",
    "M 30,31 L 34,31 L 34,34 L 30,34 Z",
    "M 28.2,37.2 L 35.8,37.2 L 35.4,45 L 28.6,45 Z",
    "M 28,46.5 L 36,46.5 L 35.6,58 L 28.4,58 Z",
    "M 30,50 L 34,50 M 32,48 L 32,56.5",
  ],
  highlights: [
    "M 30.4,10 L 33.6,10 L 33.8,12.8 L 30.2,12.8 Z",
    "M 29.4,24.8 L 34.6,24.8 L 34.4,27.5 L 29.6,27.5 Z",
  ],
  radomes: [
    { cx: 32, cy: 16.8, r: 1.7 },
    { cx: 32, cy: 20.2, r: 1.05 },
    { cx: 29.5, cy: 29.5, r: 0.85 },
    { cx: 34.5, cy: 29.5, r: 0.85 },
    { cx: 32, cy: 33, r: 1 },
  ],
  axis: "M 29,7.5 L 29,58 M 35,7.5 L 35,58 M 32,3 L 32,59.5",
};

/** S: 俯視 선수↓ */
const TOP_S: SurfaceAspectDrawing = {
  hull:
    "M 32,63 L 35.2,57 L 36.8,50 L 37.5,40 L 37.8,30 L 37.4,20 L 36.6,12 L 35.6,6.5 L 35.2,3.5 L 28.8,3.5 L 28.4,6.5 L 27.4,12 L 26.6,20 L 26.2,30 L 26.5,40 L 27.2,50 L 28.8,57 Z",
  details: [
    "M 28,6 L 36,6 L 35.6,17.5 L 28.4,17.5 Z",
    "M 30,10 L 34,10 M 32,8 L 32,16",
    "M 28.2,19 L 35.8,19 L 35.4,26.8 L 28.6,26.8 Z",
    "M 30,30 L 34,30 L 34,33 L 30,33 Z",
    "M 27.4,27.5 L 36.6,27.5 L 37,36 L 36,41.5 L 28,41.5 L 27,36 Z",
    "M 29,35.5 L 35,35.5 L 34.8,40 L 29.2,40 Z",
    "M 31.3,41.2 L 32.7,41.2 L 32.5,49.8 L 31.5,49.8 Z",
    "M 28.6,43 L 35.4,43 L 35.4,48.2 L 28.6,48.2 Z",
    "M 30.2,48.2 L 30.2,53.5 M 32,48.2 L 32,53.5 M 33.8,48.2 L 33.8,53.5 M 28.6,50.8 L 35.4,50.8",
    "M 30,54.5 L 34,54.5 L 34.4,58.5 L 33,59.6 L 31,59.6 L 29.6,58.5 Z",
    "M 31.4,59 L 32.6,59 L 32.6,62.5 L 31.4,62.5 Z",
  ],
  highlights: [
    "M 29.4,36.5 L 34.6,36.5 L 34.4,39 L 29.6,39 Z",
    "M 30.4,55.5 L 33.6,55.5 L 33.8,58 L 30.2,58 Z",
  ],
  radomes: [
    { cx: 32, cy: 31, r: 1 },
    { cx: 32, cy: 43.5, r: 1.7 },
    { cx: 29.5, cy: 34.5, r: 0.85 },
    { cx: 34.5, cy: 34.5, r: 0.85 },
    { cx: 32, cy: 47, r: 1.05 },
  ],
  axis: "M 29,6 L 29,56.5 M 35,6 L 35,56.5 M 32,4.5 L 32,61",
};

/**
 * E: 아이콘형 옆모습 선수→ — 흑백 구축함 실루엣(수면·웨이크 포함)
 * 작은 마커에서도 군함으로 읽히도록 마스트·포탑·수선을 과장.
 */
const SIDE_E: SurfaceAspectDrawing = {
  hull:
    "M 2,44 L 5,38 L 11,33 L 18,30.5 L 28,29 L 40,28.5 L 50,29 L 56,30.5 L 60,34 L 61.5,39 L 61,44 L 56,46 L 40,47 L 22,46.5 L 10,45.5 L 4,44.5 Z",
  details: [
    "M 14,30 L 19,30 L 19.5,34 L 17.5,35.2 L 15.2,35.2 L 14,34 Z",
    "M 16.2,28 L 17.4,28 L 17.4,30.2 L 16.2,30.2 Z",
    "M 20,29.2 L 26,29 L 26.2,33.5 L 20.2,33.8 Z",
    "M 26.5,22 L 33,20.5 L 36,21 L 37.5,28.8 L 26.8,29.5 Z",
    "M 28.5,23.5 L 34.5,22.2 L 35,26.5 L 29,27.5 Z",
    "M 33.5,20.8 L 36.2,20.5 L 36.5,8 L 33.8,8.2 Z",
    "M 32.2,12 L 38,11.5 L 37.8,14.5 L 32.5,15 Z",
    "M 32.8,16 L 37.5,15.6 L 37.3,18.2 L 33,18.5 Z",
    "M 38,24 L 46,23 L 48,28.8 L 39,29.5 Z",
    "M 48,29 L 56,31 L 56.5,35 L 48.5,33.5 Z",
    "M 50.5,26 L 54,25.5 L 54.5,29 L 51,29.2 Z",
  ],
  highlights: [
    "M 28.8,23.8 L 34.2,22.6 L 34.6,25 L 29.2,26 Z",
    "M 34.2,9.5 L 36,9.3 L 36.1,11.2 L 34.3,11.4 Z",
  ],
  radomes: [
    { cx: 35, cy: 6.2, r: 2.1 },
    { cx: 35, cy: 10.8, r: 1.15 },
    { cx: 35, cy: 15.2, r: 0.9 },
  ],
  waves: [
    "M 3,49 Q 12,46.5 22,49 Q 32,51.5 42,49 Q 52,46.5 61,49",
    "M 6,53 Q 16,50.5 28,53 Q 40,55.5 52,53 Q 58,51.5 62,53",
    "M 10,56.5 Q 22,54.5 34,56.5 Q 46,58.5 56,56.5",
  ],
};

/** W: 옆모습 선수← — SIDE_E 거울 */
const SIDE_W: SurfaceAspectDrawing = {
  hull:
    "M 62,44 L 59,38 L 53,33 L 46,30.5 L 36,29 L 24,28.5 L 14,29 L 8,30.5 L 4,34 L 2.5,39 L 3,44 L 8,46 L 24,47 L 42,46.5 L 54,45.5 L 60,44.5 Z",
  details: [
    "M 50,30 L 45,30 L 44.5,34 L 46.5,35.2 L 48.8,35.2 L 50,34 Z",
    "M 47.8,28 L 46.6,28 L 46.6,30.2 L 47.8,30.2 Z",
    "M 44,29.2 L 38,29 L 37.8,33.5 L 43.8,33.8 Z",
    "M 37.5,22 L 31,20.5 L 28,21 L 26.5,28.8 L 37.2,29.5 Z",
    "M 35.5,23.5 L 29.5,22.2 L 29,26.5 L 35,27.5 Z",
    "M 30.5,20.8 L 27.8,20.5 L 27.5,8 L 30.2,8.2 Z",
    "M 31.8,12 L 26,11.5 L 26.2,14.5 L 31.5,15 Z",
    "M 31.2,16 L 26.5,15.6 L 26.7,18.2 L 31,18.5 Z",
    "M 26,24 L 18,23 L 16,28.8 L 25,29.5 Z",
    "M 16,29 L 8,31 L 7.5,35 L 15.5,33.5 Z",
    "M 13.5,26 L 10,25.5 L 9.5,29 L 13,29.2 Z",
  ],
  highlights: [
    "M 35.2,23.8 L 29.8,22.6 L 29.4,25 L 34.8,26 Z",
    "M 29.8,9.5 L 28,9.3 L 27.9,11.2 L 29.7,11.4 Z",
  ],
  radomes: [
    { cx: 29, cy: 6.2, r: 2.1 },
    { cx: 29, cy: 10.8, r: 1.15 },
    { cx: 29, cy: 15.2, r: 0.9 },
  ],
  waves: [
    "M 61,49 Q 52,46.5 42,49 Q 32,51.5 22,49 Q 12,46.5 3,49",
    "M 58,53 Q 48,50.5 36,53 Q 24,55.5 12,53 Q 6,51.5 2,53",
    "M 54,56.5 Q 42,54.5 30,56.5 Q 18,58.5 8,56.5",
  ],
};

/**
 * NE: 3/4 — 선수↗ · 가늘고 긴 45° 헐 (blob 금지)
 * 중심선 ≈ (20,52)→(50,8), 반폭 ~4.5
 */
const QUARTER_NE: SurfaceAspectDrawing = {
  hull:
    "M 51,3.5 L 54.5,8.5 L 55,16 L 53.5,28 L 50,40 L 45,49 L 40,54.5 L 35.5,56.5 L 32,54 L 30.5,46 L 31.5,32 L 34.5,20 L 39,11 L 44.5,5.5 Z",
  details: [
    "M 44,9 L 50,11.5 L 50.2,16 L 45.5,17.2 L 42.5,14 Z",
    "M 43,11.5 L 45.5,11.5 L 45.5,9 L 43,9 Z",
    "M 37,19 L 51,24.5 L 49.5,33 L 36,27.5 Z",
    "M 39.5,22 L 47.5,25 L 47,28 L 40,25.2 Z",
    "M 42.5,19.5 L 44,19.5 L 44.5,12 L 43,12 Z",
    "M 34,36 L 47.5,41 L 45.5,49.5 L 33,44.5 Z",
    "M 37.5,41 L 43.5,43.5 M 40,38.5 L 40,47",
  ],
  highlights: ["M 44.5,12 L 49,13.5 L 49,15.5 L 45,14.5 Z"],
  radomes: [
    { cx: 43.5, cy: 14.5, r: 1.35 },
    { cx: 41.5, cy: 24.5, r: 1 },
    { cx: 39.5, cy: 29, r: 0.8 },
  ],
  axis: "M 36,48 L 49,10",
};

/** NW: 선수↖ — NE의 X 대칭 */
const QUARTER_NW: SurfaceAspectDrawing = {
  hull:
    "M 13,3.5 L 9.5,8.5 L 9,16 L 10.5,28 L 14,40 L 19,49 L 24,54.5 L 28.5,56.5 L 32,54 L 33.5,46 L 32.5,32 L 29.5,20 L 25,11 L 19.5,5.5 Z",
  details: [
    "M 20,9 L 14,11.5 L 13.8,16 L 18.5,17.2 L 21.5,14 Z",
    "M 21,11.5 L 18.5,11.5 L 18.5,9 L 21,9 Z",
    "M 27,19 L 13,24.5 L 14.5,33 L 28,27.5 Z",
    "M 24.5,22 L 16.5,25 L 17,28 L 24,25.2 Z",
    "M 21.5,19.5 L 20,19.5 L 19.5,12 L 21,12 Z",
    "M 30,36 L 16.5,41 L 18.5,49.5 L 31,44.5 Z",
    "M 26.5,41 L 20.5,43.5 M 24,38.5 L 24,47",
  ],
  highlights: ["M 19.5,12 L 15,13.5 L 15,15.5 L 19,14.5 Z"],
  radomes: [
    { cx: 20.5, cy: 14.5, r: 1.35 },
    { cx: 22.5, cy: 24.5, r: 1 },
    { cx: 24.5, cy: 29, r: 0.8 },
  ],
  axis: "M 28,48 L 15,10",
};

/** SE: 선수↘ — NE의 Y 대칭 */
const QUARTER_SE: SurfaceAspectDrawing = {
  hull:
    "M 51,60.5 L 54.5,55.5 L 55,48 L 53.5,36 L 50,24 L 45,15 L 40,9.5 L 35.5,7.5 L 32,10 L 30.5,18 L 31.5,32 L 34.5,44 L 39,53 L 44.5,58.5 Z",
  details: [
    "M 34,27.5 L 47.5,23 L 45.5,14.5 L 33,19.5 Z",
    "M 37.5,23 L 43.5,20.5 M 40,17 L 40,25.5",
    "M 37,45 L 51,39.5 L 49.5,31 L 36,36.5 Z",
    "M 39.5,42 L 47.5,39 L 47,36 L 40,38.8 Z",
    "M 42.5,44.5 L 44,44.5 L 44.5,52 L 43,52 Z",
    "M 44,55 L 50,52.5 L 50.2,48 L 45.5,46.8 L 42.5,50 Z",
    "M 43,52.5 L 45.5,52.5 L 45.5,55 L 43,55 Z",
  ],
  highlights: ["M 44.5,52 L 49,50.5 L 49,48.5 L 45,49.5 Z"],
  radomes: [
    { cx: 41.5, cy: 39.5, r: 1 },
    { cx: 43.5, cy: 49.5, r: 1.35 },
    { cx: 39.5, cy: 35, r: 0.8 },
  ],
  axis: "M 36,16 L 49,54",
};

/** SW: 선수↙ — NW의 Y 대칭 */
const QUARTER_SW: SurfaceAspectDrawing = {
  hull:
    "M 13,60.5 L 9.5,55.5 L 9,48 L 10.5,36 L 14,24 L 19,15 L 24,9.5 L 28.5,7.5 L 32,10 L 33.5,18 L 32.5,32 L 29.5,44 L 25,53 L 19.5,58.5 Z",
  details: [
    "M 30,27.5 L 16.5,23 L 18.5,14.5 L 31,19.5 Z",
    "M 26.5,23 L 20.5,20.5 M 24,17 L 24,25.5",
    "M 27,45 L 13,39.5 L 14.5,31 L 28,36.5 Z",
    "M 24.5,42 L 16.5,39 L 17,36 L 24,38.8 Z",
    "M 21.5,44.5 L 20,44.5 L 19.5,52 L 21,52 Z",
    "M 20,55 L 14,52.5 L 13.8,48 L 18.5,46.8 L 21.5,50 Z",
    "M 21,52.5 L 18.5,52.5 L 18.5,55 L 21,55 Z",
  ],
  highlights: ["M 19.5,52 L 15,50.5 L 15,48.5 L 19,49.5 Z"],
  radomes: [
    { cx: 22.5, cy: 39.5, r: 1 },
    { cx: 20.5, cy: 49.5, r: 1.35 },
    { cx: 24.5, cy: 35, r: 0.8 },
  ],
  axis: "M 28,16 L 15,54",
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
