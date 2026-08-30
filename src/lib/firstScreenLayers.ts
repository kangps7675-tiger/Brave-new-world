import type { LayerPrefs } from "@/lib/layerPrefs";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/** Compact `전선` 칩과 동일 — 첫 지정학 화면 */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  showWarZones: true,
  showNeptun: true,
  showTzevaAdom: true,
  showUsCarriers: true,
  showNewfeedsIranAttacks: true,
};

/** Compact `항로` 칩과 동일 — 첫 지경학 화면 */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showShippingLanes: true,
  showBriTradeConnectivity: true,
  showStrategicCorridors: true,
  showUsDfcSupplyChain: true,
  showPorts: true,
  showLogisticsRisk: true,
  showCriticalNodes: true,
  showNewfeedsIranAttacks: true,
};
