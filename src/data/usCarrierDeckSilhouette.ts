/**
 * US Navy CVN 갑판 실루엣 — 공중俯視(Top-down) 참조 기반 단순화 geometry.
 *
 * 참조: Nimitz/Ford급 비행장 외곽
 *   - 함수(좌) 직선 절단
 *   - 함수(우) 뾰족한 함투
 *   - 좌현(하단) 사각 갑판(angled deck) 돌출
 *   - 우현(상단) 섬(island) 슈퍼스트럭처
 *   - 함체 축 방향 활주로 + 사각 갑판 대각 활주로
 *
 * 시각 자료: docs/us-carrier-deck-icon.md
 * 정적 참조 이미지 경로: public/assets/reference/us-carrier-deck-aerial.png
 */

/** SVG viewBox — 가로=함진행(함수→함수), 세로=현(Port↔Starboard) */
export const CARRIER_DECK_VIEWBOX = { width: 48, height: 22 } as const;

export const CARRIER_DECK_REFERENCE = {
  imagePath: "/assets/reference/us-carrier-deck-aerial.png",
  description:
    "US Navy aircraft carrier top-down aerial — angled port deck, starboard island, axial runway",
  bowDirection: "east" as const,
  sourceNote: "멋진 신세계 design reference (user-provided aerial photo, 2026)",
};

/**
 * 외곽선 — 시계 방향 (CW)
 * 좌=함수, 우=함투, 하=좌현(사각갑판), 상=우현(섬)
 */
export const CARRIER_HULL_OUTLINE_PATH =
  "M 2.2,5.2 L 2.2,15.8 L 13.5,16.6 L 21.2,20.2 L 33.8,19.4 L 40.2,16.8 " +
  "L 44.8,13.6 L 47.2,11 L 44.6,8.2 L 38.4,6.2 L 36.2,5.4 " +
  "L 34.8,2.6 L 30.6,2.6 L 28.8,5.2 L 18.5,5.6 L 2.2,5.2 Z";

/** 함체 축 활주로 (catapult / recovery axis) */
export const CARRIER_AXIAL_RUNWAY_PATH = "M 5.5,11 L 43.5,11";

/** 사각 갑판 대각 활주로 */
export const CARRIER_ANGLED_RUNWAY_PATH = "M 15.5,17.2 L 39.5,10.6";

/** 활주로 중앙선 (노란색 대표) */
export const CARRIER_CENTERLINE_PATH = "M 6,11.8 L 42,11.8";

/** 섬(island) — 우현 돌출 */
export const CARRIER_ISLAND_PATH =
  "M 29.2,5.4 L 31.2,2.8 L 35.6,2.8 L 36.8,5.6 L 35.2,6.8 L 30.4,6.6 Z";

/** 함교 레이더 돔 2기 (E-2 위치 대략) */
export const CARRIER_RADAR_DOMES: ReadonlyArray<{ cx: number; cy: number; r: number }> = [
  { cx: 24, cy: 9.2, r: 1.15 },
  { cx: 32.5, cy: 8.8, r: 1.05 },
];

export type CarrierDeckIconSize = {
  width: number;
  height: number;
};

/** 지도 마커 기본 크기 (가로:세로 ≈ 2.2:1) */
export const CARRIER_MARKER_ICON_SIZE: CarrierDeckIconSize = {
  width: 36,
  height: 16,
};

/** 마커 앵커 — 갑판 중심 근처(함수 쪽 40%) */
export const CARRIER_MARKER_ANCHOR_X_RATIO = 0.38;

export function carrierMarkerAnchorOffsetPx(iconWidth = CARRIER_MARKER_ICON_SIZE.width): number {
  return Math.round(iconWidth * CARRIER_MARKER_ANCHOR_X_RATIO);
}
