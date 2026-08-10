import { DEFAULT_LAYER_PREFS, type LayerPrefs } from "@/lib/layerPrefs";
import {
  activeLayerCap,
  isLayerCapCountedKey,
} from "@/lib/layerExclusiveCap";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 시나리오 프리셋 (P2-1).
 *
 * 문제:
 * 레이어 패널에는 체크 항목이 88개 있다. 여기에 허브 nav 20개, econ 6그룹이
 * 더해지면 진입 직후 사용자 앞에 놓인 결정 지점이 100개를 넘는다(Hick's Law).
 * 그런데 **"무엇을 켜야 하는가"에 대한 답이 UI 어디에도 없었다.**
 * 프리셋은 Ultra-Lite(`compactViewPreset.ts`) 전용이라 일반 모드에는
 * 진입점이 아예 없었고, 사용자는 88개를 손으로 조합하며 매 클릭마다
 * 지도 반영을 기다려야 했다.
 *
 * 설계 원칙:
 *
 * 1. **주제 단위로 자른다.** 레이어 이름이 아니라 사용자가 실제로 궁금해하는
 *    상황("대만해협에서 무슨 일이 있나")이 단위다.
 * 2. **layers 배열은 우선순위 순서다.** 상한(30/16)을 넘으면 앞에서부터
 *    채우고 뒤를 버린다 — 사용자에게 무엇을 뺄지 묻지 않는다(Tesler's Law).
 * 3. **한 프레임에 커밋한다.** 개별 patch를 88번 부르면 debounce와 재계산이
 *    누적돼 프리셋 자체가 느려진다. `applyLayerPrefs(built)` 1회여야
 *    도허티 임계(<400ms) 안에 들어온다.
 */

export type ScenarioPresetId =
  // 지정학
  | "taiwan"
  | "ukraine"
  | "hormuz"
  | "korea"
  | "nuclear"
  // 지경학
  | "semiconductor"
  | "energy-choke"
  | "freight"
  | "sanctions";

export type ScenarioPreset = {
  id: ScenarioPresetId;
  labelKo: string;
  labelEn: string;
  /** 한 줄 설명 — 칩 hover/aria용 */
  hintKo: string;
  hintEn: string;
  mode: ViewerMode;
  /**
   * 켤 레이어. **순서 = 우선순위** — 상한 초과 시 뒤에서부터 잘린다.
   * 가장 앞에 그 시나리오의 정체성을 정의하는 레이어를 둔다.
   */
  layers: Array<keyof LayerPrefs>;
  /** 카메라 목적지 */
  camera: { lat: number; lng: number; altitude: number };
};

export const CONFLICT_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "taiwan",
    labelKo: "대만해협",
    labelEn: "Taiwan Strait",
    hintKo: "ADIZ 침범 · 도련선 · 해상 활동 · 관련 속보",
    hintEn: "ADIZ incursions, island chains, maritime activity",
    mode: "conflict",
    layers: [
      "showEastAsiaAdiz",
      "showIslandChains",
      "showChinaTaiwanIncidents",
      "showUsCarriers",
      "showMilitaryActivity",
      "showAis",
      "showGdeltWar",
      "showDiplomaticTension",
      "showMilitaryExercises",
      "showSubmarineCables",
    ],
    camera: { lat: 24.0, lng: 121.0, altitude: 1.05 },
  },
  {
    id: "ukraine",
    labelKo: "우크라 전선",
    labelEn: "Ukraine Front",
    hintKo: "점령지 통제선 · 공습경보 · 타격 · 전쟁구역",
    hintEn: "Control line, air raid alerts, strikes",
    mode: "conflict",
    layers: [
      "showUkraineControl",
      "showNeptun",
      "showWarZones",
      "showUkraineStrikesOnRussia",
      "showGdeltWar",
      "showMilitaryActivity",
      "showTelegramOsint",
      "showGasPipelines",
    ],
    camera: { lat: 48.5, lng: 35.0, altitude: 1.0 },
  },
  {
    id: "hormuz",
    labelKo: "호르무즈·홍해",
    labelEn: "Hormuz & Red Sea",
    hintKo: "해상 위협 · UKMTO 사건 · 항행경보 · 유조선 항로",
    hintEn: "Maritime threats, UKMTO incidents, tanker lanes",
    mode: "conflict",
    layers: [
      "showUkmtoIncidents",
      "showNavareaWarnings",
      "showNewfeedsIranAttacks",
      "showTzevaAdom",
      "showAis",
      "showDisguisedVessels",
      "showShippingLanes",
      "showUsCarriers",
      "showOilPipelines",
      "showGdeltOceanCompetition",
    ],
    camera: { lat: 22.0, lng: 52.0, altitude: 1.15 },
  },
  {
    id: "korea",
    labelKo: "한반도",
    labelEn: "Korean Peninsula",
    hintKo: "미사일 시험 · ADIZ · 군용기 · 해저 시설",
    hintEn: "Missile tests, ADIZ, military aircraft",
    mode: "conflict",
    layers: [
      "showNorthKoreaMissileTests",
      "showEastAsiaAdiz",
      "showMilitaryActivity",
      "showSubmarineTunnels",
      "showUsCarriers",
      "showGdeltWar",
      "showMilitaryExercises",
      "showDiplomaticTension",
    ],
    camera: { lat: 38.0, lng: 127.5, altitude: 0.85 },
  },
  {
    id: "nuclear",
    labelKo: "핵·확산",
    labelEn: "Nuclear",
    hintKo: "원자력 시설 · 무기금수 · 확전 신호 · 축 관계망",
    hintEn: "Nuclear sites, arms embargo, escalation signals",
    mode: "conflict",
    layers: [
      "showGemNuclear",
      "showArmsEmbargo",
      "showEscalationSignals",
      "showAxisNetwork",
      "showNorthKoreaMissileTests",
      "showGdeltWar",
      "showDiplomaticTension",
    ],
    camera: { lat: 34.0, lng: 60.0, altitude: 1.9 },
  },
];

export const ECONOMY_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "semiconductor",
    labelKo: "반도체 공급망",
    labelEn: "Semiconductors",
    hintKo: "크리티컬 노드 · AI 데이터센터 · 해저 케이블 · IXP",
    hintEn: "Critical nodes, AI data centers, subsea cables",
    mode: "economy",
    layers: [
      "showCriticalNodes",
      "showAiDataCenters",
      "showSubmarineCables",
      "showInternetExchanges",
      "showPorts",
      "showUsDfcSupplyChain",
      "showEconomicCenters",
      "showAirports",
    ],
    camera: { lat: 24.0, lng: 120.5, altitude: 1.3 },
  },
  {
    id: "energy-choke",
    labelKo: "에너지 초크",
    labelEn: "Energy Chokepoints",
    hintKo: "유가스 파이프 · LNG · 초크포인트 · 원자력",
    hintEn: "Oil & gas pipelines, LNG, chokepoints",
    mode: "economy",
    layers: [
      "showOilPipelines",
      "showGasPipelines",
      "showLngTerminals",
      "showSubseaPipelines",
      "showResources",
      "showGemNuclear",
      "showShippingLanes",
      "showLogisticsRisk",
    ],
    camera: { lat: 26.0, lng: 50.0, altitude: 1.6 },
  },
  {
    id: "freight",
    labelKo: "해운·운임",
    labelEn: "Freight",
    hintKo: "AIS 선박 · 항로 · 항구 · 물류 스트레스",
    hintEn: "AIS vessels, lanes, ports, logistics stress",
    mode: "economy",
    layers: [
      "showAis",
      "showShippingLanes",
      "showPorts",
      "showLogisticsStress",
      "showLogisticsRisk",
      "showCriticalNodes",
      "showBriTradeConnectivity",
      "showAirports",
    ],
    camera: { lat: 12.0, lng: 70.0, altitude: 2.0 },
  },
  {
    id: "sanctions",
    labelKo: "제재·금융",
    labelEn: "Sanctions & Finance",
    hintKo: "제재 대상 · 위장 선박 · 금융 허브 · 무기금수",
    hintEn: "Sanctioned entities, dark fleet, financial hubs",
    mode: "economy",
    layers: [
      "showSanctionsEntities",
      "showDisguisedVessels",
      "showEconomicCenters",
      "showArmsEmbargo",
      "showAis",
      "showPorts",
      "showAxisNetwork",
    ],
    camera: { lat: 40.0, lng: 30.0, altitude: 2.1 },
  },
];

export function scenarioPresetsForMode(mode: ViewerMode): ScenarioPreset[] {
  return mode === "economy" ? ECONOMY_SCENARIO_PRESETS : CONFLICT_SCENARIO_PRESETS;
}

export function findScenarioPreset(id: ScenarioPresetId): ScenarioPreset | undefined {
  return [...CONFLICT_SCENARIO_PRESETS, ...ECONOMY_SCENARIO_PRESETS].find((p) => p.id === id);
}

/**
 * 프리셋 → 완성된 LayerPrefs.
 *
 * 상한 처리를 `clampPrefsToActiveCap`에 맡기지 않고 **여기서 직접** 한다.
 * clamp는 키 순회 순서대로 자르므로 프리셋이 의도한 우선순위와 무관하게
 * 정체성 레이어(예: 대만의 ADIZ)가 잘려나갈 수 있다.
 *
 * 기존 사용자 설정은 유지하지 않는다 — 프리셋의 요점은 "이 주제만 남은
 * 깨끗한 화면"이다. 다만 `labelLanguage`처럼 화면 내용과 무관한 환경 설정은
 * 이어받는다.
 */
export function buildScenarioPrefs(
  preset: ScenarioPreset,
  current: LayerPrefs,
  ultraLite: boolean,
): LayerPrefs {
  const next: LayerPrefs = { ...DEFAULT_LAYER_PREFS, labelLanguage: current.labelLanguage };

  // 모든 boolean OFF에서 출발 — 이전 화면 잔재를 지운다
  for (const key of Object.keys(next) as Array<keyof LayerPrefs>) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, unknown>)[key as string] = false;
    }
  }

  const cap = activeLayerCap(ultraLite);
  let used = 0;

  for (const key of preset.layers) {
    const counted = isLayerCapCountedKey(key);
    if (counted && used >= cap) break; // 우선순위 뒤쪽을 조용히 버린다
    (next as Record<string, unknown>)[key as string] = true;
    if (counted) used += 1;
  }

  return next;
}

/** 상한 때문에 실제로 잘려나간 레이어 수 — 필요하면 안내에 쓴다 */
export function scenarioTrimmedCount(preset: ScenarioPreset, ultraLite: boolean): number {
  const cap = activeLayerCap(ultraLite);
  const counted = preset.layers.filter((k) => isLayerCapCountedKey(k));
  return Math.max(0, counted.length - cap);
}
