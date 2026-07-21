/**
 * 수상전투함 다각도 실루엣 — 호위함과 동일 세트, 구축·초계·순양·미분류 군함 공용.
 * (잠수함·항모 제외)
 *
 * 참고:
 *   /assets/reference/ddg-aerial-bow-aft.png          — 俯視(스텔스·노란 갑판선·레이돔)
 *   /assets/reference/ddg-arleigh-burke-profile.png — 측면(Burke DDG-114)
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
  /** 노란 갑판 안전선·진행축 */
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
 * N: 俯視 선수↑ — 항공 참조(노란 갑판선·전방 포·VLS·스텔스 함교·마스트 레이돔·함미 비행갑판)
 */
const TOP_N: SurfaceAspectDrawing = {
  hull:
    "M 32,1.5 L 36.2,8 L 38.2,16 L 39,26 L 39.2,36 L 38.8,46 L 37.8,54 L 36.8,58.5 L 36.5,61 L 27.5,61 L 27.2,58.5 L 26.2,54 L 25.2,46 L 24.8,36 L 25,26 L 25.8,16 L 27.8,8 Z",
  details: [
    "M 29.6,9.5 L 34.4,9.5 L 35,14.2 L 33.4,15.5 L 30.6,15.5 L 29,14.2 Z",
    "M 31.3,6.2 L 32.7,6.2 L 32.7,9.8 L 31.3,9.8 Z",
    "M 28,16.5 L 36,16.5 L 36,22 L 28,22 Z",
    "M 30,16.5 L 30,22 M 32,16.5 L 32,22 M 34,16.5 L 34,22 M 28,19.2 L 36,19.2",
    "M 26.5,23 L 37.5,23 L 38.2,27.5 L 37,38 L 27,38 L 25.8,27.5 Z",
    "M 28.2,24.8 L 35.8,24.8 L 35.5,29.5 L 28.5,29.5 Z",
    "M 31.2,23.2 L 32.8,23.2 L 32.5,14.5 L 31.5,14.5 Z",
    "M 29.5,32.5 L 34.5,32.5 L 34.5,35.5 L 29.5,35.5 Z",
    "M 27.5,38.5 L 36.5,38.5 L 36,46 L 28,46 Z",
    "M 27,47.5 L 37,47.5 L 36.6,58.8 L 27.4,58.8 Z",
    "M 29.5,51 L 34.5,51 M 32,49 L 32,57.5",
  ],
  highlights: [
    "M 30.2,10.5 L 33.8,10.5 L 34.2,13.5 L 29.8,13.5 Z",
    "M 28.8,25.5 L 35.2,25.5 L 35,28.5 L 29,28.5 Z",
  ],
  radomes: [
    { cx: 32, cy: 17.5, r: 2.05 },
    { cx: 32, cy: 21.2, r: 1.25 },
    { cx: 29.2, cy: 30.2, r: 0.95 },
    { cx: 34.8, cy: 30.2, r: 0.95 },
    { cx: 32, cy: 34, r: 1.15 },
  ],
  axis: "M 28.2,8 L 28.2,58.5 M 35.8,8 L 35.8,58.5 M 32,3.5 L 32,59.5",
};

/** S: 俯視 선수↓ */
const TOP_S: SurfaceAspectDrawing = {
  hull:
    "M 32,62.5 L 36.2,56 L 38.2,48 L 39,38 L 39.2,28 L 38.8,18 L 37.8,10 L 36.8,5.5 L 36.5,3 L 27.5,3 L 27.2,5.5 L 26.2,10 L 25.2,18 L 24.8,28 L 25,38 L 25.8,48 L 27.8,56 Z",
  details: [
    "M 27,5.2 L 37,5.2 L 36.6,16.5 L 27.4,16.5 Z",
    "M 29.5,9 L 34.5,9 M 32,7 L 32,15.5",
    "M 27.5,18 L 36.5,18 L 36,25.5 L 28,25.5 Z",
    "M 29.5,28.5 L 34.5,28.5 L 34.5,31.5 L 29.5,31.5 Z",
    "M 26.5,26 L 37.5,26 L 38.2,36.5 L 37,41 L 27,41 L 25.8,36.5 Z",
    "M 28.2,34.5 L 35.8,34.5 L 35.5,39.2 L 28.5,39.2 Z",
    "M 31.2,40.8 L 32.8,40.8 L 32.5,49.5 L 31.5,49.5 Z",
    "M 28,42 L 36,42 L 36,47.5 L 28,47.5 Z",
    "M 30,47.5 L 30,53 M 32,47.5 L 32,53 M 34,47.5 L 34,53 M 28,50.2 L 36,50.2",
    "M 29.6,54.5 L 34.4,54.5 L 35,58.5 L 33.4,59.8 L 30.6,59.8 L 29,58.5 Z",
    "M 31.3,59.2 L 32.7,59.2 L 32.7,62 L 31.3,62 Z",
  ],
  highlights: [
    "M 28.8,35.5 L 35.2,35.5 L 35,38.5 L 29,38.5 Z",
    "M 30.2,55.5 L 33.8,55.5 L 34.2,58 L 29.8,58 Z",
  ],
  radomes: [
    { cx: 32, cy: 30, r: 1.15 },
    { cx: 32, cy: 42.8, r: 2.05 },
    { cx: 29.2, cy: 33.8, r: 0.95 },
    { cx: 34.8, cy: 33.8, r: 0.95 },
    { cx: 32, cy: 46.5, r: 1.25 },
  ],
  axis: "M 28.2,5.5 L 28.2,56 M 35.8,5.5 L 35.8,56 M 32,4.5 L 32,60.5",
};

/**
 * E: 옆모습 선수→ — Burke급(DDG-114) 프로필
 */
const SIDE_E: SurfaceAspectDrawing = {
  hull:
    "M 2.5,45 L 5.5,38.5 L 11,33 L 17,30 L 24,28.8 L 34,28.2 L 46,28 L 54,28.8 L 59,31 L 61.5,35.5 L 62,41 L 61,46 L 55,48 L 38,48.5 L 20,48.2 L 10,47 L 5,46 L 2.5,45.5 Z",
  details: [
    "M 16.5,28.8 L 21.2,28.8 L 21.8,33.2 L 20,34.5 L 17.8,34.5 L 16.2,33.2 Z",
    "M 13.8,30 L 17,30 L 17,31.8 L 13.8,31.8 Z",
    "M 22,28.5 L 26.5,23.2 L 30,22.5 L 32,28.5",
    "M 26,28.5 L 31.5,20.5 L 39,19 L 44,21.5 L 45,28.8",
    "M 29,23.5 L 38,21.8 L 38.5,26 L 29.5,27.2 Z",
    "M 35,19.2 L 37.2,19.2 L 36.8,6.5 L 35.4,6.5 Z",
    "M 33.5,10.5 L 38.5,10.5 L 38.2,13.2 L 33.8,13.2 Z",
    "M 34,14.5 L 38,14.5 L 37.7,16.8 L 34.3,16.8 Z",
    "M 35.8,6.5 L 36.4,6.5 L 36.2,3.8 L 36,3.8 Z",
    "M 40,21 L 44.5,20.5 L 45.2,28.5 L 40.8,28.8 Z",
    "M 47,22.5 L 51.5,22 L 52,28.8 L 47.5,29 Z",
    "M 52,29 L 59.5,31 L 59.5,35 L 52,33.8 Z",
    "M 54,31.2 L 58.5,32",
  ],
  highlights: [
    "M 29.5,23.2 L 37.5,21.6 L 37.8,24.5 L 29.8,25.5 Z",
    "M 40.5,22 L 44,21.6 L 44.4,25 L 41,25.4 Z",
  ],
  radomes: [
    { cx: 36.1, cy: 8.2, r: 1.75 },
    { cx: 36.1, cy: 12.2, r: 1.15 },
    { cx: 36.1, cy: 17.2, r: 0.95 },
    { cx: 42.5, cy: 20.2, r: 0.8 },
  ],
  axis: "M 4,42 L 60,42",
};

/** W: 옆모습 선수← */
const SIDE_W: SurfaceAspectDrawing = {
  hull:
    "M 61.5,45 L 58.5,38.5 L 53,33 L 47,30 L 40,28.8 L 30,28.2 L 18,28 L 10,28.8 L 5,31 L 2.5,35.5 L 2,41 L 3,46 L 9,48 L 26,48.5 L 44,48.2 L 54,47 L 59,46 L 61.5,45.5 Z",
  details: [
    "M 47.5,28.8 L 42.8,28.8 L 42.2,33.2 L 44,34.5 L 46.2,34.5 L 47.8,33.2 Z",
    "M 50.2,30 L 47,30 L 47,31.8 L 50.2,31.8 Z",
    "M 42,28.5 L 37.5,23.2 L 34,22.5 L 32,28.5",
    "M 38,28.5 L 32.5,20.5 L 25,19 L 20,21.5 L 19,28.8",
    "M 35,23.5 L 26,21.8 L 25.5,26 L 34.5,27.2 Z",
    "M 29,19.2 L 26.8,19.2 L 27.2,6.5 L 28.6,6.5 Z",
    "M 30.5,10.5 L 25.5,10.5 L 25.8,13.2 L 30.2,13.2 Z",
    "M 30,14.5 L 26,14.5 L 26.3,16.8 L 29.7,16.8 Z",
    "M 28.2,6.5 L 27.6,6.5 L 27.8,3.8 L 28,3.8 Z",
    "M 24,21 L 19.5,20.5 L 18.8,28.5 L 23.2,28.8 Z",
    "M 17,22.5 L 12.5,22 L 12,28.8 L 16.5,29 Z",
    "M 12,29 L 4.5,31 L 4.5,35 L 12,33.8 Z",
    "M 10,31.2 L 5.5,32",
  ],
  highlights: [
    "M 34.5,23.2 L 26.5,21.6 L 26.2,24.5 L 34.2,25.5 Z",
    "M 23.5,22 L 20,21.6 L 19.6,25 L 23,25.4 Z",
  ],
  radomes: [
    { cx: 27.9, cy: 8.2, r: 1.75 },
    { cx: 27.9, cy: 12.2, r: 1.15 },
    { cx: 27.9, cy: 17.2, r: 0.95 },
    { cx: 21.5, cy: 20.2, r: 0.8 },
  ],
  axis: "M 60,42 L 4,42",
};

/** NE: 대각 3/4 */
const QUARTER_NE: SurfaceAspectDrawing = {
  hull:
    "M 43,4 L 51,11 L 54,22 L 53,35 L 48,48 L 41,56 L 31,58.5 L 21,54 L 15,43 L 14,30 L 17.5,17 L 27,8 Z",
  details: [
    "M 36,11 L 44,13.5 L 44.5,19 L 38,20.5 L 34,16.5 Z",
    "M 34,14 L 37,14 L 37,11.2 L 34,11.2 Z",
    "M 29.5,21 L 47,25.5 L 45,35 L 28,30.5 Z",
    "M 32,24 L 42.5,26.8 L 42,30 L 32.5,27.2 Z",
    "M 35.5,21.5 L 37.2,21.5 L 37.8,12.5 L 36,12.5 Z",
    "M 25.5,37 L 43,41.5 L 41,51.5 L 25.5,47 Z",
    "M 30,43 L 38.5,45.2 M 34,40.5 L 34,50",
  ],
  highlights: ["M 37,14.5 L 43,16 L 43,18.5 L 37.5,17.5 Z"],
  radomes: [
    { cx: 36.5, cy: 16.5, r: 1.55 },
    { cx: 34.5, cy: 27.5, r: 1.15 },
    { cx: 33, cy: 32, r: 0.9 },
  ],
};

/** NW */
const QUARTER_NW: SurfaceAspectDrawing = {
  hull:
    "M 21,4 L 13,11 L 10,22 L 11,35 L 16,48 L 23,56 L 33,58.5 L 43,54 L 49,43 L 50,30 L 46.5,17 L 37,8 Z",
  details: [
    "M 28,11 L 20,13.5 L 19.5,19 L 26,20.5 L 30,16.5 Z",
    "M 30,14 L 27,14 L 27,11.2 L 30,11.2 Z",
    "M 34.5,21 L 17,25.5 L 19,35 L 36,30.5 Z",
    "M 32,24 L 21.5,26.8 L 22,30 L 31.5,27.2 Z",
    "M 28.5,21.5 L 26.8,21.5 L 26.2,12.5 L 28,12.5 Z",
    "M 38.5,37 L 21,41.5 L 23,51.5 L 38.5,47 Z",
    "M 34,43 L 25.5,45.2 M 30,40.5 L 30,50",
  ],
  highlights: ["M 27,14.5 L 21,16 L 21,18.5 L 26.5,17.5 Z"],
  radomes: [
    { cx: 27.5, cy: 16.5, r: 1.55 },
    { cx: 29.5, cy: 27.5, r: 1.15 },
    { cx: 31, cy: 32, r: 0.9 },
  ],
};

/** SE */
const QUARTER_SE: SurfaceAspectDrawing = {
  hull:
    "M 43,60 L 51,53 L 54,42 L 53,29 L 48,16 L 41,8 L 31,5.5 L 21,10 L 15,21 L 14,34 L 17.5,47 L 27,56 Z",
  details: [
    "M 25.5,13 L 41,9 L 43,16 L 29.5,20 Z",
    "M 27.5,20.5 L 45,25 L 43,35 L 26,30.5 Z",
    "M 34,33 L 36.2,33 L 36.8,44 L 34.5,44 Z",
    "M 33.5,45.5 L 42,48 L 41,54 L 33.5,51.5 Z",
    "M 30,50 L 38.5,52.5 M 34,47.5 L 34,56",
  ],
  highlights: ["M 29.5,11 L 38.5,9 L 39,12.5 L 30,14 Z"],
  radomes: [
    { cx: 34, cy: 27, r: 1.15 },
    { cx: 35.5, cy: 37.5, r: 1.45 },
  ],
};

/** SW */
const QUARTER_SW: SurfaceAspectDrawing = {
  hull:
    "M 21,60 L 13,53 L 10,42 L 11,29 L 16,16 L 23,8 L 33,5.5 L 43,10 L 49,21 L 50,34 L 46.5,47 L 37,56 Z",
  details: [
    "M 38.5,13 L 23,9 L 21,16 L 34.5,20 Z",
    "M 36.5,20.5 L 19,25 L 21,35 L 38,30.5 Z",
    "M 30,33 L 27.8,33 L 27.2,44 L 29.5,44 Z",
    "M 30.5,45.5 L 22,48 L 23,54 L 30.5,51.5 Z",
    "M 34,50 L 25.5,52.5 M 30,47.5 L 30,56",
  ],
  highlights: ["M 34.5,11 L 25.5,9 L 25,12.5 L 34,14 Z"],
  radomes: [
    { cx: 30, cy: 27, r: 1.15 },
    { cx: 28.5, cy: 37.5, r: 1.45 },
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
