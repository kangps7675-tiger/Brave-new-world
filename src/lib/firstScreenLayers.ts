import type { LayerPrefs } from "@/lib/layerPrefs";
import { CRINK_INFRA_PREF_PATCH } from "@/lib/crinkInfraCatalog";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/** Compact `전선` + CRINK OSM·한/일/대만/필/호/동유럽·미군 기지·해상 항로 — 첫 지정학 화면.
 *  전쟁소식 빨간 점: 이란 NewFeeds + GDELT war(우크라 등). */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  showWarZones: true,
  showNeptun: true,
  showTzevaAdom: true,
  showUsCarriers: true,
  showNewfeedsIranAttacks: true,
  showGdeltWar: true,
  showMilitaryBases: true,
  showRokMilitaryBases: true,
  showJapanMilitaryBases: true,
  showTaiwanMilitaryBases: true,
  showPhilippinesMilitaryBases: true,
  showAustraliaMilitaryBases: true,
  showEasternNatoMilitaryBases: true,
  showShippingLanes: true,
  ...CRINK_INFRA_PREF_PATCH,
};

/**
 * 지경학 첫 화면 — 개인 선물·시장 리스크 지도.
 * 우선순위: 초크 → 항로/항구 → 에너지(가스·LNG) → 무역 코리도 → 에너지·결제 축.
 * BRI/DFC·AI DC·매장지·핵심노드·민간 AIS는 수동 토글(자동 ON 금지).
 * 제재 회피 강도·회랑은 지정학 전용.
 */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showLogisticsRisk: true,
  showLogisticsStress: true,
  showShippingLanes: true,
  showPorts: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showStrategicCorridors: true,
  showAxisNetwork: true,
  showGscpiGauge: true,
  /** 호르무즈·유류 충격 — 원유 선물 드라이버 */
  showNewfeedsIranAttacks: true,
};
