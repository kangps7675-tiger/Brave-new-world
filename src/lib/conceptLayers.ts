import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { ViewerMode, ViewTheaterChoice } from "@/lib/viewPackages";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

type LayerPatch = Partial<Record<BooleanLayerKey, boolean>>;

type ConflictConceptTheater =
  | "russia-ukraine"
  | "korea"
  | "china-taiwan"
  | "middle-east"
  | "global";

const UKRAINE_STACK: LayerPatch = {
  showUkraineControl: true,
  showNeptun: true,
  showNeptunPreviousTrails: false,
  showWarZones: true,
  showDiplomaticTension: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showTelegramOsint: true,
  showTzevaAdom: false,
};

const NO_UKRAINE: LayerPatch = {
  showUkraineControl: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
};

const CONFLICT_BASE: LayerPatch = {
  showWarZones: true,
  showDiplomaticTension: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showGdeltOceanCompetition: true,
  showTelegramOsint: true,
};

/** 항모·군사 동정 — 한반도·중동·걸프 전선 */
const CARRIER_MIL_WATCH: LayerPatch = {
  showUsCarriers: true,
  showMilitaryActivity: true,
};

/** 중동 전선 — 전쟁구역·초크포인트·공습경보·IRONSIGHT 콜아웃 */
const MIDDLE_EAST_STACK: LayerPatch = {
  showWarZones: true,
  showDiplomaticTension: true,
  showUcdpEvents: false,
  showConflictZones: false,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showMilitaryActivity: false,
  showUsCarriers: true,
  showTelegramOsint: true,
  showLogisticsRisk: true,
  showShippingLanes: true,
  showPorts: true,
  showFirmsFires: true,
  showTzevaAdom: false,
  showNewfeedsIranAttacks: true,
};

const CONFLICT_THEATER_LAYERS: Record<ConflictConceptTheater, LayerPatch> = {
  "russia-ukraine": UKRAINE_STACK,
  korea: {
    ...CONFLICT_BASE,
    ...NO_UKRAINE,
    ...CARRIER_MIL_WATCH,
    showTzevaAdom: false,
    showEastAsiaAdiz: true,
    showIslandChains: true,
    showNorthKoreaMissileTests: true,
  },
  "china-taiwan": {
    ...CONFLICT_BASE,
    ...NO_UKRAINE,
    showTzevaAdom: false,
    showConflictZones: true,
    showGdeltAlliance: true,
    showUsCarriers: true,
    showMilitaryActivity: true,
    showEastAsiaAdiz: true,
    showIslandChains: true,
    showChinaTaiwanIncidents: true,
    showChinaJapanIncidents: true,
    showChinaPhilippinesIncidents: true,
    showUsChinaIncidents: true,
  },
  "middle-east": {
    ...NO_UKRAINE,
    ...CARRIER_MIL_WATCH,
    ...MIDDLE_EAST_STACK,
    showUkraineControl: false,
    showNeptun: false,
    showNeptunPreviousTrails: false,
  },
  global: {
    ...CONFLICT_BASE,
    ...NO_UKRAINE,
    showTzevaAdom: false,
    showConflictZones: true,
  },
};

/** 지경학 에너지·초크 — 전선/GDELT/군사 제외, 파이프·항로·초크만 */
const ENERGY_CHOKE_LAYERS: LayerPatch = {
  showOilPipelines: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showShippingLanes: true,
  showLogisticsRisk: true,
  showPorts: true,
  showWarZones: false,
  showDiplomaticTension: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showTelegramOsint: false,
  showUsCarriers: false,
  showMilitaryActivity: false,
  showUcdpEvents: false,
  showConflictZones: false,
  showUkraineControl: false,
};

const FINANCE_HUB_LAYERS: LayerPatch = {
  showEconomicCenters: true,
  showInternetExchanges: true,
  showPorts: true,
};

const CHIP_SUPPLY_LAYERS: LayerPatch = {
  showAiDataCenters: true,
  showShippingLanes: true,
  showPorts: true,
  showInternetExchanges: true,
};

const AI_INFRA_LAYERS: LayerPatch = {
  showAiDataCenters: true,
  showInternetExchanges: true,
  showEconomicCenters: true,
  showPorts: true,
};

const COMMODITY_LAYERS: LayerPatch = {
  showPorts: true,
  showShippingLanes: true,
  showEconomicCenters: true,
  showOilPipelines: true,
};

const RATES_LAYERS: LayerPatch = {
  showEconomicCenters: true,
  showInternetExchanges: true,
};

const GULF_ENERGY_HUB_LAYERS: LayerPatch = {
  ...ENERGY_CHOKE_LAYERS,
  showLngTerminals: true,
};

const ECONOMY_HUB_LAYERS: Record<string, LayerPatch> = {
  hormuz: GULF_ENERGY_HUB_LAYERS,
  suez: ENERGY_CHOKE_LAYERS,
  "bab-el-mandeb": ENERGY_CHOKE_LAYERS,
  malacca: { ...ENERGY_CHOKE_LAYERS, showAiDataCenters: true },
  panama: { ...ENERGY_CHOKE_LAYERS, showEconomicCenters: true },
  dubai: GULF_ENERGY_HUB_LAYERS,
  qatar: { ...GULF_ENERGY_HUB_LAYERS, showLngTerminals: true },
  rotterdam: { ...ENERGY_CHOKE_LAYERS, showGasPipelines: true },
  singapore: { ...ENERGY_CHOKE_LAYERS, showPorts: true },
  nyc: FINANCE_HUB_LAYERS,
  london: FINANCE_HUB_LAYERS,
  "hong-kong": FINANCE_HUB_LAYERS,
  "taiwan-chip": CHIP_SUPPLY_LAYERS,
  "korea-fab": CHIP_SUPPLY_LAYERS,
  "arizona-fab": CHIP_SUPPLY_LAYERS,
  "kumamoto-fab": CHIP_SUPPLY_LAYERS,
  "nova-ai": AI_INFRA_LAYERS,
  "vietnam-mfg": { showPorts: true, showShippingLanes: true, showEconomicCenters: true },
  "battery-nickel": COMMODITY_LAYERS,
  "fed-dc": RATES_LAYERS,
  "ecb-frankfurt": RATES_LAYERS,
  "boj-tokyo": RATES_LAYERS,
  "pboc-shanghai": RATES_LAYERS,
  "chicago-cme": COMMODITY_LAYERS,
  "black-sea-grain": { ...COMMODITY_LAYERS, showLogisticsRisk: true },
  "pilbara-iron": COMMODITY_LAYERS,
  "chile-copper": COMMODITY_LAYERS,
  "lithium-aus": COMMODITY_LAYERS,
};

/** 이란·페르시아만·호르무즈·레vant nav — 전투 이벤트 + 항모 */
function isIranGulfFrontNavId(key: string): boolean {
  return (
    key === "iran" ||
    key === "persian-gulf" ||
    key === "hormuz" ||
    key === "gulf" ||
    key === "levant" ||
    key.includes("israel-iran") ||
    key.includes("yemen") ||
    key.includes("houthi") ||
    key.includes("oman") ||
    key.includes("bahrain") ||
    key.includes("kuwait") ||
    key.includes("uae") ||
    key.includes("saudi") ||
    key.includes("iraq")
  );
}

/** nav id → 지정학 컨셉(전장) */
export function conflictTheaterFromNavId(navId: string): ViewTheaterChoice {
  const key = navId.toLowerCase();
  if (
    key === "ukraine" ||
    key.startsWith("ukraine-") ||
    key === "hub-rus" ||
    key.startsWith("claim-rus") ||
    key.startsWith("ally-rus") ||
    key.includes("hub-rus-")
  ) {
    return "russia-ukraine";
  }
  if (
    key === "korea" ||
    key.includes("dmz") ||
    key.includes("west-sea") ||
    key === "hub-prk" ||
    key.startsWith("claim-prk") ||
    key.startsWith("ally-prk") ||
    key.includes("hub-prk-")
  ) {
    return "korea";
  }
  if (
    key === "taiwan" ||
    key.includes("taiwan") ||
    key.includes("spratly") ||
    key.includes("china-sea") ||
    key === "hub-chn" ||
    key.startsWith("claim-chn") ||
    key.startsWith("ally-chn") ||
    key.includes("hub-chn-")
  ) {
    return "china-taiwan";
  }
  if (
    key === "middle-east" ||
    key === "gulf" ||
    key === "iran" ||
    key === "levant" ||
    key === "hormuz" ||
    key === "persian-gulf" ||
    key.includes("israel") ||
    key.includes("yemen") ||
    key === "hub-irn" ||
    key.startsWith("claim-irn") ||
    key.startsWith("ally-irn") ||
    key.includes("hub-irn-")
  ) {
    return "middle-east";
  }
  return "auto";
}

export function conceptLayersForConflict(theater: ViewTheaterChoice): LayerPatch {
  // auto/미지정: 우크라 전선 OFF — 전장「우크라」·내비 우크라 선택 시에만 UKRAINE_STACK
  if (theater === "auto") return { ...CONFLICT_BASE, ...NO_UKRAINE };
  if (theater === "all") return { ...CONFLICT_BASE, ...NO_UKRAINE };
  if (theater in CONFLICT_THEATER_LAYERS) {
    return CONFLICT_THEATER_LAYERS[theater as ConflictConceptTheater];
  }
  return { ...CONFLICT_BASE, ...NO_UKRAINE };
}

export function conceptLayersForConflictNavId(navId: string): LayerPatch {
  const key = navId.toLowerCase();
  const hubAxis: LayerPatch = {
    showAxisNetwork: true,
    showGdeltAlliance: true,
    showDiplomaticTension: true,
    showWarZones: true,
  };
  if (key.startsWith("hub-") || key.startsWith("claim-") || key.startsWith("ally-")) {
    if (key.includes("arms")) {
      return {
        ...conceptLayersForConflict(conflictTheaterFromNavId(navId)),
        ...hubAxis,
        showGdeltWar: true,
      };
    }
    if (key.includes("regime") || key.includes("friction")) {
      return {
        ...conceptLayersForConflict(conflictTheaterFromNavId(navId)),
        showAxisNetwork: false,
        showDiplomaticTension: true,
      };
    }
    return {
      ...conceptLayersForConflict(conflictTheaterFromNavId(navId)),
      ...hubAxis,
    };
  }
  if (isIranGulfFrontNavId(key)) {
    return {
      ...conceptLayersForConflict("middle-east"),
      ...MIDDLE_EAST_STACK,
      showTzevaAdom: false,
    };
  }
  return conceptLayersForConflict(conflictTheaterFromNavId(navId));
}

export function conceptLayersForEconomy(hub: EconomyHubChoice): LayerPatch {
  if (hub === "auto") return {};
  return ECONOMY_HUB_LAYERS[hub] ?? {};
}

export function conceptLayersForEconomyNavId(navId: string): LayerPatch {
  if (ECONOMY_HUB_LAYERS[navId]) return ECONOMY_HUB_LAYERS[navId]!;
  const key = navId.toLowerCase();
  if (isIranGulfFrontNavId(key) || key.includes("hormuz") || key.includes("gulf")) {
    return GULF_ENERGY_HUB_LAYERS;
  }
  if (key.includes("suez") || key.includes("bab-el") || key.includes("red-sea")) {
    return ENERGY_CHOKE_LAYERS;
  }
  if (
    key.includes("taiwan") ||
    key.includes("chip") ||
    key.includes("tsmc") ||
    key.includes("fab") ||
    key.includes("korea")
  ) {
    return CHIP_SUPPLY_LAYERS;
  }
  if (key.includes("ai") || key.includes("nova") || key.includes("ashburn") || key.includes("data")) {
    return AI_INFRA_LAYERS;
  }
  if (
    key.includes("fed") ||
    key.includes("ecb") ||
    key.includes("boj") ||
    key.includes("pboc") ||
    key.includes("rate")
  ) {
    return RATES_LAYERS;
  }
  if (
    key.includes("grain") ||
    key.includes("copper") ||
    key.includes("lithium") ||
    key.includes("iron") ||
    key.includes("cme") ||
    key.includes("nickel") ||
    key.includes("battery")
  ) {
    return COMMODITY_LAYERS;
  }
  if (key.includes("nyc") || key.includes("london") || key.includes("hong-kong")) {
    return FINANCE_HUB_LAYERS;
  }
  return {};
}

/** ModePicker 호버용 — 켜지는 boolean 레이어 키 목록 */
export function conceptLayerKeysForSelection(
  mode: ViewerMode,
  theater: ViewTheaterChoice,
  economyHub: EconomyHubChoice,
): BooleanLayerKey[] {
  const patch =
    mode === "conflict"
      ? conceptLayersForConflict(theater)
      : conceptLayersForEconomy(economyHub);
  return (Object.entries(patch) as Array<[BooleanLayerKey, boolean]>)
    .filter(([, on]) => on)
    .map(([key]) => key);
}

export type { LayerPatch as ConceptLayerPatch, BooleanLayerKey as ConceptBooleanLayerKey };

export function mergeConceptLayerPrefs(
  base: LayerPrefs,
  mode: ViewerMode,
  theater: ViewTheaterChoice,
  economyHub: EconomyHubChoice,
): LayerPrefs {
  const patch =
    mode === "conflict"
      ? conceptLayersForConflict(theater)
      : conceptLayersForEconomy(economyHub);
  if (Object.keys(patch).length === 0) return base;
  return { ...base, ...patch };
}
