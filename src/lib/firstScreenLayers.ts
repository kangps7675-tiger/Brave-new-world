import type { LayerPrefs } from "@/lib/layerPrefs";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/**
 * 지정학 전역/전선 기본 — 우크라·이란 축 + 드론·미사일·폭발 실시간.
 * NEPTUN(우크라 공중위협), Tzeva Adom(이란·중동 경보), NewFeeds 이란 공격, FIRMS(폭발·화재).
 */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  showWarZones: true,
  showNeptun: true,
  showTzevaAdom: true,
  showNewfeedsIranAttacks: true,
  showGdeltWar: true,
  showFirmsFires: true,
  showMilitaryActivity: true,
  showUsCarriers: true,
  showShippingLanes: true,
};

/** 지경학 전역 첫 화면 — 항로·초크·에너지 실루엣만. */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showLogisticsRisk: true,
  showShippingLanes: true,
  showPorts: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showStrategicCorridors: true,
};
