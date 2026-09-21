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
  FIRST_SCREEN_LIVE_ON,
} from "@/lib/firstScreenLayers";
import { stripLegacyConflictPrefs } from "@/lib/conflictEvents/flags";

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

export type BottomStackLayout = "conflict" | "economy" | "live";

export type NewsTierLabel = { label: string; detail: string };

/**
 * 전쟁·안보 자원 히어로 — 비움 (첫 화면은 폴리곤만).
 * 배관·매장지는 레이어 패널·시나리오에서 ON.
 */
export const CONFLICT_RESOURCE_HERO_ON: Partial<LayerPrefs> = {};

/** 전쟁·안보에서 자원·인프라 — 모드 진입 시 기본 OFF */
export const CONFLICT_RESOURCE_HERO_OFF: Partial<LayerPrefs> = {
  showSubseaPipelines: false,
  showOilPipelines: false,
  showGasPipelines: false,
  showLngTerminals: false,
  showResources: false,
  showNuclearSites: false,
  showGemOilGasExtraction: false,
  showGemCoalMines: false,
  showGemIronOre: false,
};

/**
 * 경제·물류 자원 히어로 — 비움 (첫 화면은 진영 폴리곤만).
 */
export const ECONOMY_RESOURCE_HERO_ON: Partial<LayerPrefs> = {};

/** 경제·물류에서 자원·인프라 — 모드 진입 시 기본 OFF */
export const ECONOMY_RESOURCE_HERO_OFF: Partial<LayerPrefs> = {
  showSubseaPipelines: false,
  showOilPipelines: false,
  showGasPipelines: false,
  showLngTerminals: false,
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
  if (mode === "satellite" || mode === "live" || mode === "history") return {};
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
  showGeoEconBlocs: false,
  /** GPSJam은 항적(live) 모드 홈 — 전쟁·안보에서 강제 OFF */
  showGpsInterference: false,
  /** 도시명 — 레이어 체크박스 ON 전까지 숨김 */
  showCityLabels: false,
  showMissileTestSites: false,
  showMissileSiloFields: false,
  /** BRI·DFC는 경제·물류 전용 */
  showBriTradeConnectivity: false,
  showUsDfcSupplyChain: false,
  /** 물류·인프라·항적·이벤트 — 첫 화면은 폴리곤만 */
  showShippingLanes: false,
  showPorts: false,
  showLogisticsRisk: false,
  showStrategicCorridors: false,
  showAlliedLogisticsCorridors: false,
  showCriticalNodes: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  showConflictEvents: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showFirmsFires: false,
  showMilitaryActivity: false,
  showUsCarriers: false,
  showWeeklyShipMoves: false,
  showAis: false,
  showReefWatch: false,
  showMissileSilos: false,
  showStrategicMissileBases: false,
  showAxisNetwork: false,
  showTzevaAdom: false,
  showMilitaryBases: false,
  showRokMilitaryBases: false,
  showJapanMilitaryBases: false,
  showTaiwanMilitaryBases: false,
  showPhilippinesMilitaryBases: false,
  showAustraliaMilitaryBases: false,
  showEasternNatoMilitaryBases: false,
  showCrinkInfraPower: false,
  showCrinkInfraBorder: false,
  showCrinkInfraDams: false,
  showCrinkInfraAeroway: false,
  showCrinkInfraHarbour: false,
  showCrinkInfraCheckpoint: false,
  showCrinkInfraRail: false,
  showCrinkInfraRoad: false,
  showCrinkInfraPipeline: false,
  showCrinkInfraPowerLine: false,
  ...CONFLICT_RESOURCE_HERO_OFF,
};

const ECONOMY_FORCE_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_ECONOMY_ON,
  showLogisticsStress: true,
  showGscpiGauge: true,
};

/**
 * 지경학에서 절대 ON 금지 — 군용 항공기·함정·기지·위장(무기고) 선박.
 * 경제 모드는 민간 AIS·항로·파이프·에너지/결제 축 등 물류·시장만.
 * (축 네트워크 energy·economy hybrid는 허용 — 자본·결제 흐름)
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
};

/**
 * 역사 모드 — 현대 MapLibre 오버레이 전부 OFF.
 * 영토 채움은 Cliopatria/Korea 히스토리 소스만 (크롬 prefs와 무관).
 */
const HISTORY_FORCE_ON: Partial<LayerPrefs> = {};

const HISTORY_FORCE_OFF: Partial<LayerPrefs> = {
  ...CONFLICT_FORCE_OFF,
  ...ECONOMY_MILITARY_BLOCK,
  /** 지정학 첫 화면 폴리곤도 끄기 */
  showUkraineControl: false,
  showUkraineStrikesOnRussia: false,
  showWarZones: false,
  showAlliedBlocs: false,
  showCstoBloc: false,
  showIslandChains: false,
  showEastAsiaAdiz: false,
  showDiplomaticTension: false,
  showLsibBoundary: false,
  showLogisticsStress: false,
  showConflictZones: false,
  showUcdpEvents: false,
  showTelegramOsint: false,
  showNewfeedsIranAttacks: false,
  showUkmtoIncidents: false,
  showEscalationSignals: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showGdeltProtests: false,
  showGdeltOceanCompetition: false,
  showUsCarriers: false,
  showAis: false,
  showAirTraffic: false,
  showMilitaryActivity: false,
  showWeeklyShipMoves: false,
  showDisguisedVessels: false,
  showFirmsFires: false,
  showReefWatch: false,
  showGeoEconBlocs: false,
  showSesChip: false,
  showSanctionsEvasionCorridors: false,
  showSanctionsEntities: false,
  showEuropeDroneIncidents: false,
  showConflictEvents: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  showNuclearSites: false,
};

const ECONOMY_FORCE_OFF: Partial<LayerPrefs> = {
  /** 전쟁·안보 전선 UI/레이어 — 경제·물류에서는 기본 비활성 */
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
  showConflictEvents: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  showTzevaAdom: false,
  showConflictZones: false,
  showUcdpEvents: false,
  showFirmsFires: false,
  showSanctionsEntities: false,
  showAlliedBlocs: false,
  showIslandChains: false,
  showEastAsiaAdiz: false,
  showAxisNetwork: false,
  showSubmarineTunnels: false,
  showSubmarineCables: false,
  /** 제재 회피 강도·회랑은 전쟁·안보 전용 — 경제·물류에서는 OFF */
  showSesChip: false,
  showSanctionsEvasionCorridors: false,
  showAirports: false,
  showCriticalNodes: false,
  /** 인프라·항적 — 첫 화면은 진영 폴리곤만 */
  showShippingLanes: false,
  showPorts: false,
  showLogisticsRisk: false,
  showStrategicCorridors: false,
  showAlliedLogisticsCorridors: false,
  showAirTraffic: false,
  showAis: false,
  showAiDataCenters: false,
  showCrinkInfraPower: false,
  showCrinkInfraBorder: false,
  showCrinkInfraDams: false,
  showCrinkInfraAeroway: false,
  showCrinkInfraHarbour: false,
  showCrinkInfraCheckpoint: false,
  showCrinkInfraRail: false,
  showCrinkInfraRoad: false,
  showCrinkInfraPipeline: false,
  showCrinkInfraPowerLine: false,
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

/**
 * 지경학에서 전선·점령·GDELT 전쟁 레이어 ON 금지.
 * 이란 NewFeeds(유류·호르무즈)는 시장 첫 화면에 유지.
 */
export const ECONOMY_FRONTLINE_BLOCK: Partial<LayerPrefs> = {
  showWarZones: false,
  showDiplomaticTension: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showTelegramOsint: false,
  showUkraineControl: false,
  showUkraineStrikesOnRussia: false,
  showConflictEvents: false,
  showNeptun: false,
  showNeptunPreviousTrails: false,
  showTzevaAdom: false,
  showConflictZones: false,
};

function stripLayerBlock(
  patch: Partial<LayerPrefs>,
  block: Partial<LayerPrefs>,
): Partial<LayerPrefs> {
  const next: Partial<LayerPrefs> = { ...patch };
  for (const key of Object.keys(block) as Array<keyof LayerPrefs>) {
    if (next[key] === true) {
      delete next[key];
    }
  }
  return { ...next, ...block };
}

/** 묻기·뉴스 인사이트가 지경학에서 전선/점령/군용을 다시 켜지 못하게 */
export function stripEconomyGeopoliticsPatch(
  patch: Partial<LayerPrefs>,
): Partial<LayerPrefs> {
  return stripLayerBlock(
    stripEconomyMilitaryPatch(patch),
    ECONOMY_FRONTLINE_BLOCK,
  );
}

/** 프리미엄(Cesium) — 전선 폴리곤 OFF, 항적·시세 키트 ON (MapLibre 오버레이/후속 Cesium 엔티티) */
const SATELLITE_FORCE_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_LIVE_ON,
};

const SATELLITE_FORCE_OFF: Partial<LayerPrefs> = {
  ...ECONOMY_MILITARY_BLOCK,
  ...ECONOMY_FRONTLINE_BLOCK,
  ...CONFLICT_FORCE_OFF,
  ...ECONOMY_FORCE_OFF,
  showCityLabels: false,
  showGpsInterference: false,
  showNeptun: false,
  showConflictEvents: false,
  showFirmsFires: false,
  showTelegramOsint: false,
  showLogisticsStress: false,
  showGscpiGauge: false,
  showSesChip: false,
  // ADS-B · AIS 는 FORCE_ON — 여기서 끄지 않음
  showWeeklyShipMoves: false,
};

/** 항적 모드 — ADS-B · AIS · GPSJam만. 전선·시장 강제 OFF */
const LIVE_FORCE_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_LIVE_ON,
};

const LIVE_FORCE_OFF: Partial<LayerPrefs> = {
  ...ECONOMY_FRONTLINE_BLOCK,
  showFirmsFires: false,
  showTelegramOsint: false,
  showUcdpEvents: false,
  showAlliedBlocs: false,
  showAxisNetwork: false,
  showIslandChains: false,
  showEastAsiaAdiz: false,
  showMissileSilos: false,
  showStrategicMissileBases: false,
  showMissileTestSites: false,
  showMissileSiloFields: false,
  showMilitaryBases: false,
  showRokMilitaryBases: false,
  showJapanMilitaryBases: false,
  showTaiwanMilitaryBases: false,
  showPhilippinesMilitaryBases: false,
  showAustraliaMilitaryBases: false,
  showEasternNatoMilitaryBases: false,
  showUsCarriers: false,
  showDisguisedVessels: false,
  showWeeklyShipMoves: false,
  showReefWatch: false,
  showReconSatellites: false,
  showLogisticsRisk: false,
  showShippingLanes: false,
  showPorts: false,
  showStrategicCorridors: false,
  showGeoEconBlocs: false,
  showAiDataCenters: false,
  showEconomicCenters: false,
  showSanctionsEntities: false,
  showBriTradeConnectivity: false,
  showUsDfcSupplyChain: false,
  showLogisticsStress: false,
  showGscpiGauge: false,
  showSesChip: false,
  showSanctionsEvasionCorridors: false,
  showOilPipelines: false,
  showGasPipelines: false,
  showLngTerminals: false,
  showSubseaPipelines: false,
  showCityLabels: false,
  showAirports: false,
  showCriticalNodes: false,
  showAlliedLogisticsCorridors: false,
  showCrinkInfraPower: false,
  showCrinkInfraBorder: false,
  showCrinkInfraDams: false,
  showCrinkInfraAeroway: false,
  showCrinkInfraHarbour: false,
  showCrinkInfraCheckpoint: false,
  showCrinkInfraRail: false,
  showCrinkInfraRoad: false,
  showCrinkInfraPipeline: false,
  showCrinkInfraPowerLine: false,
  ...CONFLICT_RESOURCE_HERO_OFF,
  ...ECONOMY_RESOURCE_HERO_OFF,
};

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
    searchPlaceholder: "지명 · 국가 · 분쟁 · 기사",
    navHeaderLabel: "CRINK",
    modePickerTitle: "지정학",
    modePickerTagline: "영토 · 분쟁 · 진영 폴리곤",
    modePickerBullets: [
      "우크라이나 점령·주장 폴리곤",
      "분쟁 해역·ADIZ·도련선·동맹 진영",
      "배관·기지·항적·이벤트는 레이어 패널에서 ON",
    ],
    layerPanelTitle: "레이어 · 전선",
  },
  history: {
    mode: "history",
    packageId: "frontline-live",
    layerCategoryIds: ["map"],
    forceLayerOn: HISTORY_FORCE_ON,
    forceLayerOff: HISTORY_FORCE_OFF,
    fetchGdelt: false,
    fetchTelegram: false,
    bottomStack: "conflict",
    newsTierLabels: {
      1: { label: "기록", detail: "연표·에피소드" },
      2: { label: "맥락", detail: "오늘과 잇는 링크" },
      3: { label: "참고", detail: "심화·원천" },
    },
    navProfile: NAV_MENU_GROUPS,
    searchPlaceholder: "연도 · 사건 · 분쟁 · 계보",
    navHeaderLabel: "역사",
    modePickerTitle: "역사",
    modePickerTagline: "역사 영토 · 시대 스크럽",
    modePickerBullets: [
      "Cliopatria·한국사 GeoJSON 영토 채움만 표시",
      "현대 국경·전쟁뉴스·항모·항적은 이 모드에서 끔",
      "민족·문화권별 색으로 폴리티를 구분",
    ],
    layerPanelTitle: "레이어 · 역사",
  },
  satellite: {
    mode: "satellite",
    packageId: "satellite-eye",
    layerCategoryIds: ["map", "transport", "live", "economy"],
    forceLayerOn: SATELLITE_FORCE_ON,
    forceLayerOff: SATELLITE_FORCE_OFF,
    fetchGdelt: false,
    fetchTelegram: false,
    bottomStack: "conflict",
    newsTierLabels: {
      1: { label: "공식", detail: "정부·기관 1차" },
      2: { label: "관측", detail: "공개 OSINT · X" },
      3: { label: "참고", detail: "미확인 · LIVEUA" },
    },
    navProfile: [],
    searchPlaceholder: "좌표 · 전장 · 티커 · 항적",
    navHeaderLabel: "프리미엄",
    modePickerTitle: "프리미엄",
    modePickerTagline: "Cesium · ADS-B · AIS · 시세",
    modePickerBullets: [
      "Cesium 글로브 (Esri / Ion Photoreal)",
      "ADS-B · AIS 항적 + 주식 티커 연관",
      "LIVEUA 전전선 · S급 양피지 타전",
    ],
    layerPanelTitle: "프리미엄 · 항적",
  },
  live: {
    mode: "live",
    packageId: "live-tracks",
    layerCategoryIds: ["map", "transport", "military", "economy"],
    forceLayerOn: LIVE_FORCE_ON,
    forceLayerOff: LIVE_FORCE_OFF,
    fetchGdelt: false,
    fetchTelegram: false,
    bottomStack: "live",
    newsTierLabels: {
      1: { label: "항적", detail: "ADS-B · AIS" },
      2: { label: "항법", detail: "GPSJam GNSS 이상" },
      3: { label: "참고", detail: "미확인" },
    },
    navProfile: NAV_MENU_GROUPS,
    searchPlaceholder: "공역 · 해역 · 항로",
    navHeaderLabel: "항적",
    modePickerTitle: "항적",
    modePickerTagline: "ADS-B · AIS · GPS 재밍",
    modePickerBullets: [
      "군·민 항공기와 선박을 같은 지도에서",
      "GPSJam 셀 — 항공기 GNSS 이상 비율 (재머 위치 아님)",
      "전선·시장 레이어 없음 — 움직임·항법에 집중",
    ],
    layerPanelTitle: "레이어 · 항적",
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
    searchPlaceholder: "초크 · 항로 · 허브 · 기사",
    navHeaderLabel: "멋진 신세계 · 시장",
    modePickerTitle: "지경학",
    modePickerTagline: "진영 폴리곤",
    modePickerBullets: [
      "지경학 진영 폴리곤만 기본 표시",
      "초크·항로·배관·DC는 레이어 패널에서 ON",
      "투자 권유 아님 — 공개 출처 관측",
    ],
    layerPanelTitle: "물류 · 시장",
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
  return capLayerCountForMode(stripLegacyConflictPrefs(next), mode);
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
  const effectiveTheater =
    mode === "conflict" || mode === "history" ? theater : "auto";
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
      // 지경학 · 프리미엄(Cesium) — 시세 스트립
      showTicker: mode === "economy" || mode === "satellite",
    },
  };

  return { mode, merged, packages, theater: effectiveTheater, economyHub: effectiveHub };
}

export function resolveViewerModeFromConfig(
  packages: ViewPackageId[],
  savedMode?: ViewerMode,
): ViewerMode {
  if (
    savedMode === "history" ||
    savedMode === "conflict" ||
    savedMode === "economy" ||
    savedMode === "satellite" ||
    savedMode === "live"
  ) {
    // 상단 3토글: 지정학 · 3D 라이브 · 지경학 (역사는 역사지도·영토분쟁)
    if (savedMode === "history") return "conflict";
    if (savedMode === "live") return "satellite";
    return savedMode;
  }
  const ids = packages.filter((id) => id !== "custom");
  if (ids.length === 1 && ids[0] === "satellite-eye") return "satellite";
  if (ids.length === 1 && ids[0] === "live-tracks") return "satellite";
  if (ids.length === 1 && ids[0] === "geo-trader") return "economy";
  return "conflict";
}
