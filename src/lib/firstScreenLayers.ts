import type { LayerPrefs } from "@/lib/layerPrefs";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/** Compact `전선` 칩과 동일 — 첫 지정학 화면.
 *  전쟁소식 빨간 점: 이란 NewFeeds + GDELT war(우크라 등). */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  showWarZones: true,
  showNeptun: true,
  showTzevaAdom: true,
  showUsCarriers: true,
  showNewfeedsIranAttacks: true,
  showGdeltWar: true,
};

/** Compact `항로` 칩과 동일 — 첫 지경학 화면.
 *  BRI·DFC는 수동 토글만 (자동 ON 금지 · 지정학 비노출). */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showShippingLanes: true,
  showStrategicCorridors: true,
  showPorts: true,
  showLogisticsRisk: true,
  showCriticalNodes: true,
  showNewfeedsIranAttacks: true,
};
