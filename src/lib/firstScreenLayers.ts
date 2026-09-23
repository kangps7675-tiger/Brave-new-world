import type { LayerPrefs } from "@/lib/layerPrefs";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/**
 * 전쟁·안보 전역 첫 화면 — 영토·분쟁·진영 폴리곤만.
 * 배관·기지·항적·이벤트·CRINK OSM 인프라는 패널에서 수동 ON.
 */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  showWarZones: true,
  showAlliedBlocs: true,
  showIslandChains: true,
  showEastAsiaAdiz: true,
};

/**
 * 경제·물류 전역 첫 화면 — 진영 폴리곤 + 해상 물류 뼈대.
 * 항구·주요 항로·초크포인트. 배관·DC·AIS는 패널에서 수동 ON.
 */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showGeoEconBlocs: true,
  showPorts: true,
  showShippingLanes: true,
  showLogisticsRisk: true,
};

/**
 * 항적(라이브) 첫 화면 — ADS-B(군·민) · AIS · GPSJam.
 * 전선·공언·시장 레이어는 다른 모드 홈. GPSJam은 ADS-B GNSS 이상 셀이라 여기가 본진.
 */
export const FIRST_SCREEN_LIVE_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showAis: true,
  showAirTraffic: true,
  showMilitaryActivity: true,
  showGpsInterference: true,
};
