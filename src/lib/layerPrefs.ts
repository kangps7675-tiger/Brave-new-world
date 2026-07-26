import {
  finalizeLayerPrefsWithAffinity,
  noteLayerAffinityAttendance,
} from "@/lib/layerAffinityPrefs";

export type LabelLanguage = "en" | "ko";

export type LayerPrefs = {
  /** 전쟁구역 — 빨간 사각+빗금 (combat) */
  showWarZones: boolean;
  /** 외교적 긴장구역 — 주황 사각+빗금 (high) */
  showDiplomaticTension: boolean;
  /** 도시 이름 강조 (구 showRoadCityGlow). 도로 레이어는 제거됨 */
  showCityLabels: boolean;
  showRailGlow: boolean;
  showAis: boolean;
  /** 위장·다크플리트 선박 (AIS_Tracker OSINT 시드) */
  showDisguisedVessels: boolean;
  showShippingLanes: boolean;
  showSubmarineCables: boolean;
  /** 해저터널 인프라 (D1 클라우드 로그 · 토글 시 온디맨드) */
  showSubmarineTunnels: boolean;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showLngTerminals: boolean;
  /** EMODnet Human Activities — 유럽 해역 해저 송유·가스관 */
  showSubseaPipelines: boolean;
  /** GEM 자원 트래커 — 지구본 체크박스 */
  showGemCoalPlants: boolean;
  showGemCoalMines: boolean;
  showGemCoalTerminals: boolean;
  showGemNuclear: boolean;
  showGemSolar: boolean;
  showGemWind: boolean;
  showGemHydro: boolean;
  showGemGeothermal: boolean;
  showGemBioenergy: boolean;
  showGemOilGasPlants: boolean;
  showGemOilGasExtraction: boolean;
  showGemIronOre: boolean;
  showGemCement: boolean;
  showGemSteel: boolean;
  showGemChemicals: boolean;
  showAirports: boolean;
  showPorts: boolean;
  /** 해상 초크포인트 · 핵심 물류 거점(터널·교량) */
  showLogisticsRisk: boolean;
  /**
   * 물류 스트레스 색상 — 초크포인트 링/카드를 UKMTO·PortWatch 등급색으로.
   * showLogisticsRisk와 함께 쓸 때 elevated=빨강.
   */
  showLogisticsStress: boolean;
  /** NY Fed GSCPI 게이지 칩 (지경학 UI) — 지도 레이어 아님 */
  showGscpiGauge: boolean;
  /** Critical Node Atlas — 지정학/지경학 공통 크리티컬 노드 */
  showCriticalNodes: boolean;
  showMilitaryBases: boolean;
  /** PLARF 확인 사일로 점 (중국 미사일 사일로군) */
  showMissileSilos: boolean;
  /** 러시아 RVSN 전략미사일 사단 주둔지 */
  showStrategicMissileBases: boolean;
  /** 인도·파키스탄 미사일 시험장 (NTI/CNS) */
  showMissileTestSites: boolean;
  /**
   * PLARF 조사 후보 격자 — 확인된 사일로가 아님.
   * 연구가 새 후보지를 찾으려 훑은 서부 중국 광역 범위.
   */
  showMissileSiloFields: boolean;
  showResources: boolean;
  showNuclearSites: boolean;
  showInternetExchanges: boolean;
  showRefugeeCamps: boolean;
  showUcdpEvents: boolean;
  showMilitaryActivity: boolean;
  /** 민간 항공기 운항 (지경학) — 군용 제외 ADS-B */
  showAirTraffic: boolean;
  /** 미 해군 항공모함 위치 추적 */
  showUsCarriers: boolean;
  showSpaceLaunches: boolean;
  /**
   * 정찰·감시 위성 — CelesTrak TLE + 클라이언트 SGP4.
   * 가시권 원은 이론상 지평선이며 촬영 영역이 아님.
   */
  showReconSatellites: boolean;
  /**
   * GPSJam GNSS 재밍 추정 히트맵 (H3).
   * ON 시 솔로 모드 — 다른 레이어 전부 OFF.
   */
  showGpsInterference: boolean;
  showIntelHotspots: boolean;
  showAiDataCenters: boolean;
  showEconomicCenters: boolean;
  showSanctionsEntities: boolean;
  showArmsEmbargo: boolean;
  showConflictZones: boolean;
  showCyberIncidents: boolean;
  showElectionEvents: boolean;
  showFirmsFires: boolean;
  /** VIINA 우크라이나 전선 (렌더링 전용) */
  showUkraineControl: boolean;
  /** GDELT 지정학 이벤트 — 티어별 핀·히트맵 */
  showGdeltWar: boolean;
  showGdeltDiplomatic: boolean;
  showGdeltAlliance: boolean;
  showGdeltProtests: boolean;
  /** 태평양·대서양·북극해 지정학 경쟁·외교 GDELT */
  showGdeltOceanCompetition: boolean;
  showTelegramOsint: boolean;
  /** 이스라엘 Tzeva Adom (Pikud HaOref) 실시간 경보 */
  showTzevaAdom: boolean;
  /**
   * NewFeeds 이란·지역 공격 이벤트 (지도 마커)
   * @see https://github.com/ktoetotam/NewFeeds
   */
  showNewfeedsIranAttacks: boolean;
  /**
   * UKMTO(Royal Navy) 상선 피습·나포·의심활동 경보 — 검은 동그라미 빗금 박스(강도별 흑↔백).
   * 비공식(리버스 엔지니어링) 엔드포인트 — README「비공식 엔드포인트 사용 원칙」참고.
   */
  showUkmtoIncidents: boolean;
  /**
   * NAVAREA in-force 항행경보 (JHOD XI 등) — 보라색 폴리곤/선.
   * 일본 근해 훈련·미사일 낙하지·케이블 작업 등. UKMTO와 함께 기본 ON.
   */
  showNavareaWarnings: boolean;
  /**
   * 군사 훈련 구역 — 공시·OSINT 다층 (항적만으로 북중러이란 “정확” 불가).
   * 신규 감지 시 자동 ON → fly → 전보 양피지.
   */
  showMilitaryExercises: boolean;
  /** 중국↔대만 대치 (대만해협·남중국해·서태평양 · 네온 리플) */
  showChinaTaiwanIncidents: boolean;
  /** 중국↔일본 대치 (동중국해·센카쿠 · 네온 리플) */
  showChinaJapanIncidents: boolean;
  /** 중국↔필리핀 해상충돌 (남중국해 · 네온 리플) */
  showChinaPhilippinesIncidents: boolean;
  /** 미국↔중국 군사마찰 (서태평양·남중국해 · 네온 리플) */
  showUsChinaIncidents: boolean;
  /** USNI·JSO 공개 관측 기반 주간 함선 이동 (승인+mapEligible만 지도) */
  showWeeklyShipMoves: boolean;
  /**
   * ReefWatch — 남중국해 암초·인공섬 feature 모니터링 + OpenSky 근접 항적
   * @see https://github.com/NinhGhoster/ReefWatch
   */
  showReefWatch: boolean;
  /** 북한 미사일·무기실험 (주황 네온 · 발사·실험 발생지) */
  showNorthKoreaMissileTests: boolean;
  /** NEPTUN — 우크라이나 드론·미사일·탄도미사일 실시간 궤적 (neptun.in.ua) */
  showNeptun: boolean;
  /** 사라진 드론·미사일의 지나간 이동 경로 */
  showNeptunPreviousTrails: boolean;
  /** 동아시아 ADIZ (KADIZ/JADIZ/TAIDIZ/북한/CADIZ) */
  showEastAsiaAdiz: boolean;
  /**
   * 중국 도련선(적) · 미군 인도·태평양 방어선(청) · 대만 화약고 펄스
   * @see src/data/islandChains.ts
   */
  showIslandChains: boolean;
  /** IRN–CHN–RUS–PRK 축·스포크 외교·군수·하이브리드 관계망 */
  showAxisNetwork: boolean;
  /** World Bank BRI 무역·운송 연결성 (중국→참여국) */
  showBriTradeConnectivity: boolean;
  /** 미국 DFC 활성 프로젝트 기반 개발금융 공급망 */
  showUsDfcSupplyChain: boolean;
  labelLanguage: LabelLanguage;
  /** 모바일 기본 화면 — "alerts"(수첩형 알림 리스트) | "globe"(3D 지도) */
  mobileHomeView: MobileHomeView;
};

export type MobileHomeView = "alerts" | "globe";

/** v38: ReefWatch 남중국해 feature 모니터링 */
export const LAYER_PREFS_KEY = "geowatch-layers-v38";

/** 토글 가능 레이어는 기본 OFF. 활성 전장(이란·우크라) 전쟁구역만 기본 ON */
export const DEFAULT_LAYER_PREFS: LayerPrefs = {
  showWarZones: true,
  showDiplomaticTension: false,
  showCityLabels: false,
  showRailGlow: false,
  showAis: false,
  showDisguisedVessels: false,
  showShippingLanes: false,
  showSubmarineCables: false,
  showSubmarineTunnels: false,
  showOilPipelines: false,
  showGasPipelines: false,
  showLngTerminals: false,
  showSubseaPipelines: false,
  showGemCoalPlants: false,
  showGemCoalMines: false,
  showGemCoalTerminals: false,
  showGemNuclear: false,
  showGemSolar: false,
  showGemWind: false,
  showGemHydro: false,
  showGemGeothermal: false,
  showGemBioenergy: false,
  showGemOilGasPlants: false,
  showGemOilGasExtraction: false,
  showGemIronOre: false,
  showGemCement: false,
  showGemSteel: false,
  showGemChemicals: false,
  showAirports: false,
  showPorts: false,
  showLogisticsRisk: false,
  showLogisticsStress: true,
  showGscpiGauge: true,
  showCriticalNodes: false,
  showMilitaryBases: false,
  showMissileSilos: false,
  showStrategicMissileBases: false,
  showMissileTestSites: false,
  showMissileSiloFields: false,
  showResources: false,
  showNuclearSites: false,
  showInternetExchanges: false,
  showRefugeeCamps: false,
  showUcdpEvents: false,
  showMilitaryActivity: false,
  showAirTraffic: false,
  showUsCarriers: false,
  showSpaceLaunches: false,
  showReconSatellites: false,
  showGpsInterference: false,
  showIntelHotspots: false,
  showAiDataCenters: false,
  showEconomicCenters: false,
  showSanctionsEntities: false,
  showArmsEmbargo: false,
  showConflictZones: false,
  showCyberIncidents: false,
  showElectionEvents: false,
  showFirmsFires: false,
  showUkraineControl: false,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showGdeltProtests: false,
  showGdeltOceanCompetition: true,
  showTelegramOsint: true,
  showTzevaAdom: false,
  showNewfeedsIranAttacks: true,
  showUkmtoIncidents: true,
  showNavareaWarnings: true,
  showMilitaryExercises: false,
  showChinaTaiwanIncidents: false,
  showChinaJapanIncidents: false,
  showChinaPhilippinesIncidents: false,
  showUsChinaIncidents: false,
  showWeeklyShipMoves: false,
  showReefWatch: false,
  showNorthKoreaMissileTests: false,
  showNeptun: true,
  showNeptunPreviousTrails: false,
  showEastAsiaAdiz: false,
  showIslandChains: false,
  showAxisNetwork: false,
  showBriTradeConnectivity: false,
  showUsDfcSupplyChain: false,
  labelLanguage: "ko",
  /** 모바일 기본은 지도 화면 */
  mobileHomeView: "globe",
};

const LEGACY_LAYER_KEYS = [
  "geowatch-layers-v37",
  "geowatch-layers-v36",
  "geowatch-layers-v35",
  "geowatch-layers-v34",
  "geowatch-layers-v33",
  "geowatch-layers-v32",
  "geowatch-layers-v31",
  "geowatch-layers-v30",
  "geowatch-layers-v29",
  "geowatch-layers-v28",
  "geowatch-layers-v27",
  "geowatch-layers-v26",
  "geowatch-layers-v25",
  "geowatch-layers-v24",
  "geowatch-layers-v23",
  "geowatch-layers-v22",
  "geowatch-layers-v20",
  "geowatch-layers-v19",
  "geowatch-layers-v18",
  "geowatch-layers-v17",
  "geowatch-layers-v16",
  "geowatch-layers-v15",
  "geowatch-layers-v14",
  "geowatch-layers-v13",
  "geowatch-layers-v11",
  "geowatch-layers-v10",
  "geowatch-layers-v9",
  "geowatch-layers-v8",
  "geowatch-layers-v7",
  "geowatch-layers-v6",
  "geowatch-layers-v4",
  "geowatch-layers-v3",
] as const;

function parseLabelLanguage(value: unknown): LabelLanguage {
  if (value === "en" || value === "ko") return value;
  return DEFAULT_LAYER_PREFS.labelLanguage;
}

function parseMobileHomeView(value: unknown): MobileHomeView {
  if (value === "alerts" || value === "globe") return value;
  return DEFAULT_LAYER_PREFS.mobileHomeView;
}

type SavedLayerPrefs = Partial<LayerPrefs> & {
  showRoadCityGlow?: boolean;
  showCoastlines?: boolean;
  showCountryBorders?: boolean;
  /** v20 이전 통합 분쟁 레이어 */
  showDisputes?: boolean;
};

/** 전쟁·외교 분쟁 레이어 중 하나라도 ON */
export function anyDisputeOverlay(prefs: Pick<LayerPrefs, "showWarZones" | "showDiplomaticTension">) {
  return prefs.showWarZones || prefs.showDiplomaticTension;
}

function mergeSavedPrefs(parsed: SavedLayerPrefs): LayerPrefs {
  const { showRoadCityGlow, showDisputes, ...rest } = parsed;
  delete rest.showCoastlines;
  delete rest.showCountryBorders;

  const warExplicit = typeof rest.showWarZones === "boolean";
  const diploExplicit = typeof rest.showDiplomaticTension === "boolean";
  const legacyDisputes = typeof showDisputes === "boolean" ? showDisputes : false;

  return {
    ...DEFAULT_LAYER_PREFS,
    ...rest,
    showWarZones: warExplicit ? Boolean(rest.showWarZones) : legacyDisputes,
    showDiplomaticTension: diploExplicit ? Boolean(rest.showDiplomaticTension) : legacyDisputes,
    showCityLabels:
      typeof rest.showCityLabels === "boolean"
        ? rest.showCityLabels
        : typeof showRoadCityGlow === "boolean"
          ? showRoadCityGlow
          : DEFAULT_LAYER_PREFS.showCityLabels,
    labelLanguage: parseLabelLanguage(rest.labelLanguage),
    mobileHomeView: parseMobileHomeView(rest.mobileHomeView),
    /** UI 체크박스 제거 — 지나간 드론·미사일 궤적 강제 OFF */
    showNeptunPreviousTrails: false,
    /** 자홍 슬롯 → NAVAREA 보라 전용. 동맹 갈등 GDELT 핀 레이어 제거 */
    showGdeltAlliance: false,
  };
}

function migrateV19ToV20(parsed: SavedLayerPrefs): LayerPrefs {
  const merged = mergeSavedPrefs(parsed);
  if (merged.showUkraineControl) {
    return {
      ...merged,
      showNeptun: true,
      showNeptunPreviousTrails: false,
    };
  }
  return merged;
}

/** 로컬 dev: 새로고침마다 DEFAULT_LAYER_PREFS — 프로덕션만 localStorage 유지 */
function shouldPersistLayerPrefs(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * 저장된 prefs가 없는 신규 방문자용 기본 언어 추정.
 * - Reddit에서 유입 → en (r/geopolitics 등 영어권 커뮤니티 타겟)
 * - 브라우저 언어가 한국어 → ko
 * - 그 외 → en
 * 실패 시 DEFAULT_LAYER_PREFS.labelLanguage("ko")로 안전하게 폴백.
 */
function detectDefaultLabelLanguage(): LabelLanguage {
  try {
    const referrer = document.referrer || "";
    if (/reddit\.com/i.test(referrer)) return "en";

    const navLangs =
      typeof navigator.languages !== "undefined" && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
    const primary = (navLangs[0] || "").toLowerCase();
    return primary.startsWith("ko") ? "ko" : "en";
  } catch {
    return DEFAULT_LAYER_PREFS.labelLanguage;
  }
}

export function loadLayerPrefs(): LayerPrefs {
  if (typeof window === "undefined") return DEFAULT_LAYER_PREFS;
  if (!shouldPersistLayerPrefs()) return DEFAULT_LAYER_PREFS;
  try {
    const v21Raw = localStorage.getItem(LAYER_PREFS_KEY);
    if (v21Raw) {
      return finalizeLayerPrefsWithAffinity(
        mergeSavedPrefs(JSON.parse(v21Raw) as SavedLayerPrefs),
      );
    }

    const v19Raw = localStorage.getItem("geowatch-layers-v19");
    if (v19Raw) {
      const migrated = migrateV19ToV20(JSON.parse(v19Raw) as SavedLayerPrefs);
      saveLayerPrefs(migrated);
      return finalizeLayerPrefsWithAffinity(migrated);
    }

    for (const legacyKey of LEGACY_LAYER_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migrated = mergeSavedPrefs(JSON.parse(legacyRaw) as SavedLayerPrefs);
      saveLayerPrefs(migrated);
      return finalizeLayerPrefsWithAffinity(migrated);
    }

    // 첫 방문(저장된 prefs 없음) — 리퍼러/브라우저 언어로 기본 표시 언어만 추정
    return finalizeLayerPrefsWithAffinity({
      ...DEFAULT_LAYER_PREFS,
      labelLanguage: detectDefaultLabelLanguage(),
    });
  } catch {
    return DEFAULT_LAYER_PREFS;
  }
}

export function saveLayerPrefs(prefs: LayerPrefs) {
  if (typeof window === "undefined") return;
  if (!shouldPersistLayerPrefs()) return;
  localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(prefs));
  noteLayerAffinityAttendance(prefs);
}
