import type { LayerPrefs } from "@/lib/layerPrefs";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/**
 * 지정학 전역/전선 기본 — 전선·드론·타격·뉴스 네온·전략군사·군용 항적·FIRMS·ReefWatch·해저관.
 * CRINK 영토 음영은 showAlliedBlocs(+ axis-hub는 prefs 없이 지정학 상시).
 */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  showWarZones: true,
  showNeptun: true,
  showUkraineStrikesOnRussia: true,
  showGdeltWar: true,
  showFirmsFires: true,
  showMilitaryActivity: true,
  showUsCarriers: true,
  showWeeklyShipMoves: true,
  showAis: true,
  showReefWatch: true,
  showMissileSilos: true,
  showStrategicMissileBases: true,
  showIslandChains: true,
  showAxisNetwork: true,
  showAlliedBlocs: true,
  showSubseaPipelines: true,
  showTzevaAdom: true,
  showNewfeedsIranAttacks: true,
};

/**
 * 지경학 전역 첫 화면 — 초크·항로·에너지·진영·민간 항적·데이터센터·해저관.
 * GSCPI·물류 스트레스는 viewerChrome FORCE_ON(+캡 면제).
 */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showLogisticsRisk: true,
  showShippingLanes: true,
  showPorts: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showStrategicCorridors: true,
  showGeoEconBlocs: true,
  showOilPipelines: true,
  showSubseaPipelines: true,
  showAirTraffic: true,
  showAis: true,
  showAiDataCenters: true,
};
