import type { NavMenuGroup } from "@/data/navRegions";
import { NAV_MENU_GROUPS } from "@/data/navRegions";
import { ECON_NAV_MENU_GROUPS } from "@/data/econNavRegions";
import type { LayerPrefs } from "@/lib/layerPrefs";
import { saveLayerPrefs } from "@/lib/layerPrefs";
import {
  applyViewPackages,
  capLayerCountForMode,
  packagesForViewerMode,
  type MergedViewConfig,
  type ViewPackageId,
  type ViewerMode,
  type ViewTheaterChoice,
  saveViewConfig,
  loadViewConfig,
} from "@/lib/viewPackages";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import { mergeConceptLayerPrefs } from "@/lib/conceptLayers";
import {
  FIRST_SCREEN_CONFLICT_ON,
  FIRST_SCREEN_ECONOMY_ON,
} from "@/lib/firstScreenLayers";

export type { ViewerMode };

export type LayerCategoryId =
  | "map"
  | "conflict"
  | "military"
  | "transport"
  | "intel"
  | "energy"
  | "economy"
  | "live";

export type BottomStackLayout = "conflict" | "economy";

export type NewsTierLabel = { label: string; detail: string };

/**
 * 지정학 자원 히어로 — 기본 비움.
 * 원자력·매장지·배관은 물류/전선과 무관해 기본 OFF (레이어 패널·시나리오에서 ON).
 */
export const CONFLICT_RESOURCE_HERO_ON: Partial<LayerPrefs> = {};

/** 지정학에서 자원·인프라 잡음 — 모드 진입 시 기본 OFF */
export const CONFLICT_RESOURCE_HERO_OFF: Partial<LayerPrefs> = {
  showOilPipelines: false,
  showSubseaPipelines: false,
  showGasPipelines: false,
  showLngTerminals: false,
  showResources: false,
  showNuclearSites: false,
  showGemOilGasExtraction: false,
  showGemCoalMines: false,
  showGemIronOre: false,
};

/**
 * 지경학 자원 히어로 — 에너지 물류만 (가스관·LNG). 매장지 면은 기본 OFF.
 */
export const ECONOMY_RESOURCE_HERO_ON: Partial<LayerPrefs> = {
  showGasPipelines: true,
  showLngTerminals: true,
};

/** 지경학에서 비물류 자원·인프라 — 모드 진입 시 기본 OFF */
export const ECONOMY_RESOURCE_HERO_OFF: Partial<LayerPrefs> = {
  showOilPipelines: false,
  showSubseaPipelines: false,
  showNuclearSites: false,
  showResources: false,
  showGemOilGasExtraction: false,
  showGemCoalMines: false,
  showGemIronOre: false,
};

/** @deprecated 모드별 히어로 사용 — 레거시 합집합(전부 ON) */
export const SHARED_RESOURCE_LAYER_ON: Partial<LayerPrefs> = {
  showNuclearSites: true,
  showResources: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showGemOilGasExtraction: true,
  showGemCoalMines: true,
  showGemIronOre: true,
};

export function resourceHeroLayersForMode(mode: ViewerMode): Partial<LayerPrefs> {
  return mode === "economy" ? ECONOMY_RESOURCE_HERO_ON : CONFLICT_RESOURCE_HERO_ON;
}

/** 캡/드롭 후에도 모드 히어로 자원만 다시 ON (비히어로는 사용자 토글 유지) */
export function ensureResourceLayersOn(
  prefs: LayerPrefs,
  mode: ViewerMode = "conflict",
): LayerPrefs {
  return { ...prefs, ...resourceHeroLayersForMode(mode) };
}

/** 지정학 대치 구도 — A2AD·한일대만필·호주·동유럽 · 주한미군 · 항모 */
export const CONFLICT_CONFRONTATION_LAYER_ON: Partial<LayerPrefs> = {
  showIslandChains: true,
  showEastAsiaAdiz: true,
  showMilitaryBases: true,
  showRokMilitaryBases: true,
  showJapanMilitaryBases: true,
  showTaiwanMilitaryBases: true,
  showPhilippinesMilitaryBases: true,
  showAustraliaMilitaryBases: true,
  showEasternNatoMilitaryBases: true,
  showUsCarriers: true,
};

/** CRINK 전략군사 — 축 네트워크 + 중·러 전략미사일 시설 */
export const CONFLICT_CRINK_STRATEGIC_ON: Partial<LayerPrefs> = {
  showAxisNetwork: true,
  showMissileSilos: true,
  showStrategicMissileBases: true,
};

export function ensureConfrontationLayersOn(
  prefs: LayerPrefs,
  mode: ViewerMode = "conflict",
): LayerPrefs {
  if (mode !== "conflict") return prefs;
  return { ...prefs, ...CONFLICT_CONFRONTATION_LAYER_ON };
}

export type ViewerChromePreset = {
  mode: ViewerMode;
  packageId: ViewPackageId;
  layerCategoryIds: LayerCategoryId[];
  forceLayerOn: Partial<LayerPrefs>;
  forceLayerOff: Partial<LayerPrefs>;
  fetchGdelt: boolean;
  fetchTelegram: boolean;
  bottomStack: BottomStackLayout;
  newsTierLabels: Record<1 | 2 | 3, NewsTierLabel>;
  navProfile: NavMenuGroup[];
  searchPlaceholder: string;
  navHeaderLabel: string;
  modePickerTitle: string;
  modePickerTagline: string;
  modePickerBullets: string[];
  layerPanelTitle: string;
};

const CONFLICT_FORCE_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_CONFLICT_ON,
  showLogisticsStress: true,
};

const CONFLICT_FORCE_OFF: Partial<LayerPrefs> = {
  showAiDataCenters: false,
  showAirTraffic: false,
  showAirports: false,
  showSubmarineCables: false,
  showSubmarineTunnels: false,
  showGscpiGauge: false,
  showGdeltProtests: false,
  showGdeltOceanCompetition: false,
  /** 도시명 — 레이어 체크박스 ON 전까지 숨김 */
  showCityLabels: false,
  /** CRINK 축·전략미사일은 CONFLICT_CRINK_STRATEGIC_ON */
  showMissileTestSites: false,
  showMissileSiloFields: false,
  ...CONFLICT_RESOURCE_HERO_OFF,
};

const ECONOMY_FORCE_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_ECONOMY_ON,
  showLogisticsStress: true,
  showGscpiGauge: true,
};

/**
 * 지경학에서 절대 ON 금지 — 군용 항공기·함정·기지·위장(무기고) 선박.
 * 경제 모드는 민간 AIS·항로·파이프 등 물류·에너지만.
 */
export const ECONOMY_MILITARY_BLOCK: Partial<LayerPrefs> = {
  showMilitaryBases: false,
  showRokMilitaryBases: false,
  showJapanMilitaryBases: false,
  showTaiwanMilitaryBases: false,
  showPhilippinesMilitaryBases: false,
  showAustraliaMilitaryBases: false,
  showEasternNatoMilitaryBases: false,
  showMissileSilos: false,
  showStrategicMissileBases: false,
  showMissileTestSites: false,
  showMissileSiloFields: false,
  showMilitaryActivity: false,
  showUsCarriers: false,
  showDisguisedVessels: false,
  showWeeklyShipMoves: false,
  showReefWatch: false,
  showReconSatellites: false,
  showGpsInterference: false,
  showAxisNetwork: false,
};

const ECONOMY_FORCE_OFF: Partial<LayerPrefs> = {
  /** 지정학 전선 UI/레이어 — 지경학에서는 기본 비활성 */
  showWarZones: false,
  showDiplomaticTension: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showGdeltProtests: false,
  showGdeltOceanCompetition: false,
  showTelegramOsint: false,
  showUkraineControl: false,
  showUkraineStrikesOnRussia: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  showTzevaAdom: false,
  showConflictZones: false,
  showUcdpEvents: false,
  showFirmsFires: false,
  showSanctionsEntities: false,
  showNewfeedsIranAttacks: false,
  showSubmarineTunnels: false,
  showSubmarineCables: false,
  showAiDataCenters: false,
  showAirTraffic: false,
  showAirports: false,
  showAxisNetwork: false,
  ...ECONOMY_MILITARY_BLOCK,
  ...ECONOMY_RESOURCE_HERO_OFF,
  showGpsInterference: false,
};

/** 지경학 패치에서 군용 레이어 ON을 제거하고 강제 OFF */
export function stripEconomyMilitaryPatch(
  patch: Partial<LayerPrefs>,
): Partial<LayerPrefs> {
  const next: Partial<LayerPrefs> = { ...patch };
  for (const key of Object.keys(ECONOMY_MILITARY_BLOCK) as Array<keyof LayerPrefs>) {
    if (next[key] === true) {
      delete next[key];
    }
  }
  return { ...next, ...ECONOMY_MILITARY_BLOCK };
}

export function enforceEconomyMilitaryOff(prefs: LayerPrefs): LayerPrefs {
  return { ...prefs, ...ECONOMY_MILITARY_BLOCK };
}

export function isEconomyMilitaryLayerKey(key: string): boolean {
  return key in ECONOMY_MILITARY_BLOCK;
}

export const VIEWER_CHROME: Record<ViewerMode, ViewerChromePreset> = {
  conflict: {
    mode: "conflict",
    packageId: "frontline-live",
    layerCategoryIds: ["map", "conflict", "military", "energy", "transport", "live"],
    forceLayerOn: CONFLICT_FORCE_ON,
    forceLayerOff: CONFLICT_FORCE_OFF,
    fetchGdelt: true,
    fetchTelegram: true,
    bottomStack: "conflict",
    newsTierLabels: {
      1: { label: "확인", detail: "주요 통신·공식" },
      2: { label: "보완", detail: "지역·전문 매체" },
      3: { label: "속보", detail: "미확인·참고용" },
    },
    navProfile: NAV_MENU_GROUPS,
    searchPlaceholder: "지명 · 국가 · 분쟁 검색",
    navHeaderLabel: "CRINK",
    modePickerTitle: "지정학",
    modePickerTagline: "전선 · NEPTUN · 항모",
    modePickerBullets: [
      "우크라 전선 · NEPTUN 공습/드론",
      "항모 위치 · 이란 타격 속보",
      "전장에 들어가면 기지·GDELT·텔레그램이 따라 켜집니다",
    ],
    layerPanelTitle: "레이어 · 전선",
  },
  economy: {
    mode: "economy",
    packageId: "geo-trader",
    layerCategoryIds: ["map", "energy", "transport", "economy"],
    forceLayerOn: ECONOMY_FORCE_ON,
    forceLayerOff: ECONOMY_FORCE_OFF,
    fetchGdelt: false,
    fetchTelegram: false,
    bottomStack: "economy",
    newsTierLabels: {
      1: { label: "공식·와이어", detail: "Reuters · WSJ · FT" },
      2: { label: "시장 매체", detail: "CNBC · Google News" },
      3: { label: "미확인 속보", detail: "참고용" },
    },
    navProfile: ECON_NAV_MENU_GROUPS,
    searchPlaceholder: "유가 · 제재 · 항로 · 허브 검색",
    navHeaderLabel: "멋진 신세계 · 시장",
    modePickerTitle: "경제 · 시장",
    modePickerTagline: "유가 · VIX · 제재 · 물류",
    modePickerBullets: [
      "주요 증시·VIX·유가 티커",
      "항로 · 항구 · 물류 리스크 · BRI/DFC",
      "허브에 들어가면 에너지·CRINK 인프라가 따라 켜집니다",
    ],
    layerPanelTitle: "인프라 · 시장",
  },
};

export function getViewerChrome(mode: ViewerMode): ViewerChromePreset {
  return VIEWER_CHROME[mode];
}

export function mergeChromeLayers(base: LayerPrefs, mode: ViewerMode): LayerPrefs {
  const preset = getViewerChrome(mode);
  const next: LayerPrefs = { ...base };

  for (const [key, value] of Object.entries(preset.forceLayerOff) as [keyof LayerPrefs, boolean][]) {
    if (value === false) {
      (next as Record<keyof LayerPrefs, LayerPrefs[keyof LayerPrefs]>)[key] = false;
    }
  }
  for (const [key, value] of Object.entries(preset.forceLayerOn) as [keyof LayerPrefs, boolean][]) {
    if (value === true) {
      (next as Record<keyof LayerPrefs, LayerPrefs[keyof LayerPrefs]>)[key] = true;
    }
  }

  // 캡만 적용. 대치·자원 히어로는 전장/허브 진입(conceptLayers)에서 켠다.
  return capLayerCountForMode(next, mode);
}

export type ApplyViewerModeResult = {
  mode: ViewerMode;
  merged: MergedViewConfig;
  packages: ViewPackageId[];
  theater: ViewTheaterChoice;
  economyHub: EconomyHubChoice;
};

/** 모드 전환 = 패키지 + chrome 레이어 + view config 한 번에 */
export function applyViewerMode(
  mode: ViewerMode,
  theater: ViewTheaterChoice = "auto",
  economyHub: EconomyHubChoice = "auto",
): ApplyViewerModeResult {
  const packages = packagesForViewerMode(mode);
  const effectiveTheater = mode === "conflict" ? theater : "auto";
  const effectiveHub = mode === "economy" ? economyHub : "auto";
  const mergedBase = applyViewPackages(packages, effectiveTheater, effectiveHub);
  const chromeLayers = mergeChromeLayers(mergedBase.layers, mode);
  const conceptLayers = capLayerCountForMode(
    mergeConceptLayerPrefs(chromeLayers, mode, effectiveTheater, effectiveHub),
    mode,
  );
  saveLayerPrefs(conceptLayers);

  const existing = loadViewConfig();
  saveViewConfig({
    version: 1,
    packages: mergedBase.packages,
    theater: effectiveTheater,
    economyHub: effectiveHub,
    appliedAt: new Date().toISOString(),
    viewerMode: mode,
    customizedLayers: existing?.customizedLayers,
  });

  const merged: MergedViewConfig = {
    ...mergedBase,
    layers: conceptLayers,
    ui: {
      ...mergedBase.ui,
      showTicker: mode === "economy",
    },
  };

  return { mode, merged, packages, theater: effectiveTheater, economyHub: effectiveHub };
}

export function resolveViewerModeFromConfig(
  packages: ViewPackageId[],
  savedMode?: ViewerMode,
): ViewerMode {
  if (savedMode) return savedMode;
  const ids = packages.filter((id) => id !== "custom");
  if (ids.length === 1 && ids[0] === "geo-trader") return "economy";
  return "conflict";
}
