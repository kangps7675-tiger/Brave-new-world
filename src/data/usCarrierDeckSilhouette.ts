/**
 * US Navy CVN 실루엣.
 * - 갑판 俯視(레거시 경로 상수 유지)
 * - 지도 표지: 옆모습 E/W (군함 마커와 동일 정책)
 */

/** SVG viewBox — 가로=함진행 · 俯視용 (레거시) */
export const CARRIER_DECK_VIEWBOX = { width: 48, height: 22 } as const;

/** 옆모습 캔버스 — 군함 프로필과 동일 64² */
export const CARRIER_PROFILE_VIEWBOX = { width: 64, height: 64 } as const;

export const CARRIER_DECK_REFERENCE = {
  imagePath: "/assets/reference/us-carrier-deck-aerial.png",
  description:
    "US Navy aircraft carrier — side profile for map markers (top-down paths retained for reference)",
  bowDirection: "east" as const,
  sourceNote: "멋진 신세계 design reference (2026)",
};

/** 俯視 외곽선 (레거시) */
export const CARRIER_HULL_OUTLINE_PATH =
  "M 2.2,5.2 L 2.2,15.8 L 13.5,16.6 L 21.2,20.2 L 33.8,19.4 L 40.2,16.8 " +
  "L 44.8,13.6 L 47.2,11 L 44.6,8.2 L 38.4,6.2 L 36.2,5.4 " +
  "L 34.8,2.6 L 30.6,2.6 L 28.8,5.2 L 18.5,5.6 L 2.2,5.2 Z";

export const CARRIER_AXIAL_RUNWAY_PATH = "M 5.5,11 L 43.5,11";
export const CARRIER_ANGLED_RUNWAY_PATH = "M 15.5,17.2 L 39.5,10.6";
export const CARRIER_CENTERLINE_PATH = "M 6,11.8 L 42,11.8";
export const CARRIER_ISLAND_PATH =
  "M 29.2,5.4 L 31.2,2.8 L 35.6,2.8 L 36.8,5.6 L 35.2,6.8 L 30.4,6.6 Z";
export const CARRIER_RADAR_DOMES: ReadonlyArray<{ cx: number; cy: number; r: number }> = [
  { cx: 24, cy: 9.2, r: 1.15 },
  { cx: 32.5, cy: 8.8, r: 1.05 },
];

export type CarrierDeckIconSize = {
  width: number;
  height: number;
};

/** 지도 마커 — 옆모습 비율 */
export const CARRIER_MARKER_ICON_SIZE: CarrierDeckIconSize = {
  width: 56,
  height: 32,
};

export const CARRIER_MARKER_ANCHOR_X_RATIO = 0.38;

export function carrierMarkerAnchorOffsetPx(iconWidth = CARRIER_MARKER_ICON_SIZE.width): number {
  return Math.round(iconWidth * CARRIER_MARKER_ANCHOR_X_RATIO);
}

export type CarrierProfileDrawing = {
  hull: string;
  details: readonly string[];
};

/** E: 선수→좌 — CVN 옆모습 (긴 갑판 · 섬 · 낮은 헐) */
export const CARRIER_PROFILE_E: CarrierProfileDrawing = {
  hull:
    "M 2,40 L 4,34 L 8,30 L 14,28 L 24,27 L 48,27 L 56,28 L 60,31 L 62,36 L 61.5,42 L 58,44.5 L 40,45.5 L 16,45 L 6,43 L 2,40.5 Z",
  details: [
    "M 6,27 L 58,27 L 58,29.5 L 6,29.5 Z",
    "M 38,10 L 48,10 L 48.5,27 L 37.5,27 Z",
    "M 39.5,6 L 46.5,6 L 46.8,10 L 39.2,10 Z",
    "M 42,2 L 44.5,2 L 44.2,6 L 42.3,6 Z",
    "M 41,4 L 46,4 L 45.7,5.5 L 41.3,5.5 Z",
    "M 10,23 L 16,23 L 16,27 L 10,27 Z",
    "M 52,23 L 58,23 L 58,27 L 52,27 Z",
  ],
};

/** W: 선수→우 */
export const CARRIER_PROFILE_W: CarrierProfileDrawing = {
  hull:
    "M 62,40 L 60,34 L 56,30 L 50,28 L 40,27 L 16,27 L 8,28 L 4,31 L 2,36 L 2.5,42 L 6,44.5 L 24,45.5 L 48,45 L 58,43 L 62,40.5 Z",
  details: [
    "M 58,27 L 6,27 L 6,29.5 L 58,29.5 Z",
    "M 26,10 L 16,10 L 15.5,27 L 26.5,27 Z",
    "M 24.5,6 L 17.5,6 L 17.2,10 L 24.8,10 Z",
    "M 22,2 L 19.5,2 L 19.8,6 L 21.7,6 Z",
    "M 23,4 L 18,4 L 18.3,5.5 L 22.7,5.5 Z",
    "M 54,23 L 48,23 L 48,27 L 54,27 Z",
    "M 12,23 L 6,23 L 6,27 L 12,27 Z",
  ],
};
