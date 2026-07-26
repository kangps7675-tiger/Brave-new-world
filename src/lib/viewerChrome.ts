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
 * 지정학 자원 히어로 — 전역 첫 화면: 해저관 + 송유관 + 원자력.
 * (나머지는 수동 체크 — 잡음 줄이고 차별감)
 */
export const CONFLICT_RESOURCE_HERO_ON: Partial<LayerPrefs> = {
  showSubseaPipelines: true,
  showOilPipelines: true,
  showNuclearSites: true,
};

/** 지정학에서 자원 히어로가 아닌 레이어 — 모드 진입 시 기본 OFF */
export const CONFLICT_RESOURCE_HERO_OFF: Partial<LayerPrefs> = {
  showGasPipelines: false,
  showLngTerminals: false,
  showResources: false,
  showGemOilGasExtraction: false,
  showGemCoalMines: false,
  showGemIronOre: false,
};

/**
 * 지경학 자원 히어로 — 전역 첫 화면: 매장지 면 + 가스관 + LNG.
 */
export const ECONOMY_RESOURCE_HERO_ON: Partial<LayerPrefs> = {
  showResources: true,
  showGasPipelines: true,
  showLngTerminals: true,
};

/** 지경학에서 자원 히어로가 아닌 레이어 — 모드 진입 시 기본 OFF */
export const ECONOMY_RESOURCE_HERO_OFF: Partial<LayerPrefs> = {
  showOilPipelines: false,
  showSubseaPipelines: false,
  showNuclearSites: false,
  showGemOilGasExtraction: false,
  showGemCoalMines: false,
  showGemIronOre: false,
};

/** @deprecated 모드별 히어로 사용 — 레거시 합집합(전부 ON) */
export const SHARED_RESOURCE_LAYER_ON: Partial<LayerPrefs> = {
  ...CONFLICT_RESOURCE_HERO_ON,
  ...ECONOMY_RESOURCE_HERO_ON,
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

/** 지정학 대치 구도 — 미군기지·항모 (미사일 벨트와 함께 보는 핵심) */
export const CONFLICT_CONFRONTATION_LAYER_ON: Partial<LayerPrefs> = {
  showMilitaryBases: true,
  showUsCarriers: true,
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
  // 우크라 전선은 전장/내비 세부 선택(UKRAINE_STACK) 시에만 ON
  showWarZones: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showGdeltProtests: true,
  showGdeltOceanCompetition: true,
  showMilitaryActivity: true,
  showAis: true,
  showLogisticsRisk: true,
  showLogisticsStress: true,
  showShippingLanes: true,
  showPorts: true,
  showFirmsFires: true,
  showUkmtoIncidents: true,
  showNavareaWarnings: true,
  showAxisNetwork: true,
  showSubmarineCables: true,
  showNeptun: true,
  showNeptunPreviousTrails: false,
  showTelegramOsint: true,
  /** 지정학 진입 즉시 NewFeeds 이란·공격 지도 레이어 */
  showNewfeedsIranAttacks: true,
  /** 지정학 진입 즉시 전 세계 미 항모 배치·항구 위치 표시 */
  showUsCarriers: true,
  /** 지정학 진입 즉시 미군기지 — 미사일 벨트·대치 구도와 함께 표시 */
  showMilitaryBases: true,
  ...CONFLICT_RESOURCE_HERO_ON,
};

const CONFLICT_FORCE_OFF: Partial<LayerPrefs> = {
  showAiDataCenters: false,
  showAirTraffic: false,
  showSubmarineTunnels: false,
  showGscpiGauge: false,
  ...CONFLICT_RESOURCE_HERO_OFF,
};

const ECONOMY_FORCE_ON: Partial<LayerPrefs> = {
  showAis: true,
  showAirTraffic: true,
  showLogisticsRisk: true,
  showLogisticsStress: true,
  showGscpiGauge: true,
  showCriticalNodes: true,
  showSubmarineCables: true,
  ...ECONOMY_RESOURCE_HERO_ON,
  showAiDataCenters: true,
  showPorts: true,
  showAirports: true,
  /** 유가 민감 — 이란·지역 공격 NewFeeds 지도 */
  showNewfeedsIranAttacks: true,
  showBriTradeConnectivity: true,
  showUsDfcSupplyChain: true,
};

/**
 * 지경학에서 절대 ON 금지 — 군용 항공기·함정·기지·위장(무기고) 선박.
 * 경제 모드는 민간 AIS·민간 ADS-B·파이프·항로 등 경제 연관만.
 */
export const ECONOMY_MILITARY_BLOCK: Partial<LayerPrefs> = {
  showMilitaryBases: false,
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
  showNeptun: false,
  showNeptunPreviousTrails: false,
  showTzevaAdom: false,
  showConflictZones: false,
  showUcdpEvents: false,
  showFirmsFires: false,
  showSanctionsEntities: false,
  showSubmarineTunnels: false,
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
    navHeaderLabel: "반서방 축",
    modePickerTitle: "지정학",
    modePickerTagline: "전선 · GDELT · Telegram OSINT",
    modePickerBullets: [
      "우크라이나 전선·NEPTUN 드론·미사일 궤적",
      "GDELT 전투·외교 뉴스 핀",
      "Telegram OSINT · VIINA 점령지",
      "에너지 히어로: 해저관 · 송유관 · 원자력",
      "하단: 속보 + GDELT 범례",
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
      "경제 RSS · 에너지·해운·제재 속보",
      "자원 히어로: 매장지 · 가스관 · LNG · 항로 · 민간 AIS/ADS-B",
      "하단: 티커 + 시장 속보",
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

  // 캡으로 잘려도 모드별 자원 히어로 + 대치(미군기지·항모) 다시 ON
  return ensureConfrontationLayersOn(
    ensureResourceLayersOn(capLayerCountForMode(next, mode), mode),
    mode,
  );
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
  const conceptLayers = ensureConfrontationLayersOn(
    ensureResourceLayersOn(
      capLayerCountForMode(
        mergeConceptLayerPrefs(chromeLayers, mode, effectiveTheater, effectiveHub),
        mode,
      ),
      mode,
    ),
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
