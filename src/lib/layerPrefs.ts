import {
  finalizeLayerPrefsWithAffinity,
  noteLayerAffinityAttendance,
} from "@/lib/layerAffinityPrefs";
/*
 * 상업 게이트 — layerPrefGate 는 LayerPrefs 를 **타입으로만** 가져가므로
 * (import type) 런타임 순환 참조가 생기지 않는다.
 */
import {
  currentProductTier,
  enforceCommercialTier,
} from "@/lib/licensing/layerPrefGate";

export type LabelLanguage = "en" | "ko";

/** 축 관계망 — 구 기본 ON·친화도 unlock 잔존을 한 번 OFF로 내린다 */
const AXIS_NETWORK_DEFAULT_OFF_KEY = "geowatch-axis-network-default-off-v1";
const TELEGRAM_DEFAULT_ON_KEY = "geowatch-telegram-default-on-v1";

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
  /** 미 국무부 LSIB(Large Scale International Boundaries) 공식 경계선 */
  showLsibBoundary: boolean;
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
  /** 진영 블록(NATO·AUKUS·CRINK) 국가 음영 오버레이 — Natural Earth 110m. 기본 켜짐(대전략 요약 뷰). */
  showAlliedBlocs: boolean;
  /** showAlliedBlocs 안의 CSTO(반서방 연계) 표시 여부 — 아르메니아 등 소속 논쟁 있어 기본 꺼짐, 별도 토글. */
  showCstoBloc: boolean;
  /** 지경학 진영(서방·반서방·비동맹) 국가 음영 — 지경학 모드 전용, 기본 켜짐. */
  showGeoEconBlocs: boolean;
  /** 한국군 전선 기지 (OSM) — 기본 OFF, 미군과 별도 체크 */
  showRokMilitaryBases: boolean;
  /** 자위대 전선 기지 (OSM) — 주일미군은 showMilitaryBases */
  showJapanMilitaryBases: boolean;
  /** 대만군 전선 기지 (OSM·시드) */
  showTaiwanMilitaryBases: boolean;
  /** 필리핀군 1선 기지 — 미군 EDCA 거점은 showMilitaryBases */
  showPhilippinesMilitaryBases: boolean;
  /** 호주군(ADF) 전선 기지 (OSM·시드) — 미군 Darwin 등은 showMilitaryBases */
  showAustraliaMilitaryBases: boolean;
  /** 동유럽 NATO 전선 1선 (폴란드·발트·핀란드·루마니아·슬로바키아) */
  showEasternNatoMilitaryBases: boolean;
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
   * 확전 신호 — 임계선을 넘은 사건 보도를 위로 올린다 (escalationSignals).
   *
   * 새 크롤러가 아니라 **이미 들어온 뉴스에 판정만 붙이는 파생 지표**다.
   * 확전 여부·확률·의도를 판단하지 않으며, 판정 근거를 전부 공개한다.
   *
   * 기본 ON — 신호가 없으면 아무것도 안 뜬다(조용한 게 기본값)이므로
   * 켜져 있어도 평소엔 화면을 방해하지 않는다.
   */
  showEscalationSignals: boolean;
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
  /** 우크라이나 → 러시아 타격 (보도·미확인 · 자주 피격지 네온) */
  showUkraineStrikesOnRussia: boolean;
  /** 유럽 드론·영공 침범 (주황 네온 · 나토 회원국 공항·기지·국경 상공) */
  showEuropeDroneIncidents: boolean;
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
  /**
   * 전략 물류·군수 회랑 (INSTC·미들 코리도·TSR 등).
   * LOD scalerank = corridor-ranks.json 정량 합성 점수.
   */
  showStrategicCorridors: boolean;
  /** 동맹 물류 회랑(military-logistics만) — showStrategicCorridors와 별개, 기본 켜짐. */
  showAlliedLogisticsCorridors: boolean;
  /** 제재 회피 회랑(sanctions-evasion만) — SES 지도 근거 레이어 */
  showSanctionsEvasionCorridors: boolean;
  /** 우상단 SES(제재 회피 강도) 칩 — GTS와 짝 */
  showSesChip: boolean;
  /** 미국 DFC 활성 프로젝트 기반 개발금융 공급망 */
  showUsDfcSupplyChain: boolean;
  /** CRINK OSM 인프라 — 카테고리별 (public/data/crink/) */
  showCrinkInfraPower: boolean;
  showCrinkInfraBorder: boolean;
  showCrinkInfraDams: boolean;
  showCrinkInfraAeroway: boolean;
  showCrinkInfraHarbour: boolean;
  showCrinkInfraCheckpoint: boolean;
  showCrinkInfraRail: boolean;
  showCrinkInfraRoad: boolean;
  labelLanguage: LabelLanguage;
};

/* 삭제됨 (P2-5): mobileHomeView / MobileHomeView.
   타입·기본값("globe")·파서·INSTANT_KEYS까지 갖췄지만 **읽는 곳이 없었다.**
   폰 분기는 `usePhoneUi()`만 보고, 정책이 "폰 = 지구본 절대 미마운트"로
   굳으면서 스위치만 남았다.
   "혹시 나중에"로 죽은 스위치를 안고 가는 게 이 코드베이스가 부채를 쌓은 방식이라
   지운다. 모바일 전략(P2-3)에서 지구본 옵션을 되살리기로 하면 그때 다시 넣으면 된다
   (boolean pref 하나 = 5줄). */

/**
 * 레이어 prefs 저장 키.
 *
 * ⚠️ **이 버전을 더 올리지 말 것** (P1-8).
 *
 * v1 → v38까지 릴리스마다 버전을 올려 왔는데, 버전이 바뀌면 기존 키를 못 찾아
 * `DEFAULT_LAYER_PREFS`로 떨어진다 = **재방문자의 레이어 설정이 통째로 초기화된다.**
 * 30개를 공들여 조합해 둔 사용자가 다음 방문에 그걸 잃는다.
 *
 * 새 레이어를 추가할 때는:
 *   ① 버전을 올리지 말고
 *   ② `DEFAULT_LAYER_PREFS`에 기본값을 추가하고
 *   ③ `mergeSavedPrefs`가 저장본에 없는 키를 기본값으로 채우게 둔다 (이미 그렇게 동작)
 *
 * 저장 구조 자체를 바꿔야 할 때만 버전을 올리고, 반드시 `PREF_MIGRATIONS`에
 * 변환 함수를 등록할 것. 그래야 사용자 설정이 살아서 넘어온다.
 */
export const LAYER_PREFS_KEY = "geowatch-layers-v38";

/**
 * 구조 변경 마이그레이션 등록부.
 *
 * key: 출발 저장 키 → value: 그 저장본을 현재 구조로 바꾸는 함수.
 * 값 이름만 바뀌는 정도는 여기서 처리하고, 필드 추가는 마이그레이션이 필요 없다
 * (mergeSavedPrefs가 기본값으로 채운다).
 */
export const PREF_MIGRATIONS: Record<string, (raw: SavedLayerPrefs) => SavedLayerPrefs> = {
  // 예시) "geowatch-layers-v38": (raw) => ({ ...raw, showFoo: raw.showLegacyFoo }),
};

/** 토글 가능 레이어는 기본 OFF. 첫 화면은 전선 + CRINK OSM·기지·항로 ON */
export const DEFAULT_LAYER_PREFS: LayerPrefs = {
  showWarZones: true,
  showDiplomaticTension: false,
  showCityLabels: false,
  showRailGlow: false,
  showAis: false,
  showDisguisedVessels: false,
  showShippingLanes: true,
  showLsibBoundary: false,
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
  showMilitaryBases: true,
  showAlliedBlocs: true,
  showCstoBloc: false,
  showGeoEconBlocs: true,
  showRokMilitaryBases: true,
  showJapanMilitaryBases: true,
  showTaiwanMilitaryBases: true,
  showPhilippinesMilitaryBases: true,
  showAustraliaMilitaryBases: true,
  showEasternNatoMilitaryBases: true,
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
  showUsCarriers: true,
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
  showUkraineControl: true,
  showGdeltWar: false,
  showGdeltDiplomatic: false,
  showGdeltAlliance: false,
  showGdeltProtests: false,
  showGdeltOceanCompetition: false,
  showTelegramOsint: true,
  showTzevaAdom: true,
  showNewfeedsIranAttacks: true,
  showUkmtoIncidents: false,
  // 신호가 없으면 조용하므로 기본 ON 이어도 화면을 방해하지 않는다
  showEscalationSignals: true,
  showNavareaWarnings: false,
  showMilitaryExercises: false,
  showChinaTaiwanIncidents: false,
  showChinaJapanIncidents: false,
  showChinaPhilippinesIncidents: false,
  showUsChinaIncidents: false,
  showWeeklyShipMoves: false,
  showReefWatch: false,
  showNorthKoreaMissileTests: false,
  showUkraineStrikesOnRussia: false,
  showEuropeDroneIncidents: false,
  showNeptun: true,
  showNeptunPreviousTrails: false,
  showEastAsiaAdiz: false,
  showIslandChains: false,
  showAxisNetwork: false,
  showBriTradeConnectivity: false,
  showStrategicCorridors: false,
  showAlliedLogisticsCorridors: true,
  showSanctionsEvasionCorridors: true,
  showSesChip: true,
  showUsDfcSupplyChain: false,
  showCrinkInfraPower: true,
  showCrinkInfraBorder: true,
  showCrinkInfraDams: true,
  showCrinkInfraAeroway: true,
  showCrinkInfraHarbour: true,
  showCrinkInfraCheckpoint: true,
  showCrinkInfraRail: true,
  showCrinkInfraRoad: true,
  labelLanguage: "ko",
};

/** 현재 저장 키의 버전 번호 — LAYER_PREFS_KEY에서 파싱 */
export const LAYER_PREFS_VERSION = Number(
  /-v(\d+)$/.exec(LAYER_PREFS_KEY)?.[1] ?? "0",
);

/**
 * 구버전 저장 키 — **자동 생성** (P1-8).
 *
 * 예전에는 이 목록을 손으로 관리했다. 릴리스마다 새 버전을 앞에 끼워 넣어야
 * 했는데, 실제로 확인해 보니 **v21 · v12 · v5 · v2 · v1이 빠져 있었다.**
 * 그 버전에서 마지막으로 방문한 사용자는 레이어 설정을 통째로 잃는다.
 *
 * 사람이 관리하는 목록은 언젠가 빠진다. 현재 버전에서 1까지 역순으로
 * 생성하면 구멍이 생길 수 없고, 버전을 올려도 목록을 손댈 필요가 없다.
 * (없는 키는 getItem이 null을 돌려줄 뿐이라 비용도 무시할 수준)
 */
const LEGACY_LAYER_KEYS: readonly string[] = Array.from(
  { length: Math.max(0, LAYER_PREFS_VERSION - 1) },
  (_, i) => `geowatch-layers-v${LAYER_PREFS_VERSION - 1 - i}`,
);

function parseLabelLanguage(value: unknown): LabelLanguage {
  if (value === "en" || value === "ko") return value;
  return DEFAULT_LAYER_PREFS.labelLanguage;
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
 * 영어 **지배적** 커뮤니티만 — 리퍼러를 EN 신호로 쓸 수 있는 곳.
 *
 * 판단 기준: "이 사이트에서 온 사람은 영어 사용자일 가능성이 압도적인가?"
 * reddit·HN은 예. threads·x는 **아니다** — 국제 SNS라 한국인 비중이 크고,
 * 실제로 국내 계정으로 홍보 중이다. 이런 곳은 리퍼러를 판정에 쓰지 않고
 * 브라우저 언어·타임존으로 넘긴다(아래 2·3단계가 한국인을 정확히 잡는다).
 *
 * 즉 리퍼러는 "확실할 때만 쓰는 지름길"이고, 애매하면 안 쓰는 게 맞다.
 */
const EN_REFERRER_PATTERN = /reddit\.com|news\.ycombinator\.com/i;

/**
 * 저장된 prefs가 없는 신규 방문자용 기본 언어 추정.
 *
 * 판정 순서 — **명시적 신호 > 추정 신호**:
 *  1. `navigator.languages` 어디에든 ko가 있으면 → ko
 *     (유저가 직접 설정한 값. 리퍼러 따위가 덮어쓰면 안 된다)
 *  2. 영어 지배적 커뮤니티 리퍼러(reddit·HN) → en
 *     — threads·x 등 국제 SNS는 중립. 리퍼러로 판정하지 않고 3으로 넘긴다
 *  3. 타임존이 Asia/Seoul이면 → ko
 *  4. 그 외 → en
 *  실패 시 DEFAULT_LAYER_PREFS.labelLanguage("ko")로 안전하게 폴백.
 *
 * ⚠️ 2번이 핵심 — `languages[0]`만 보면 안 된다.
 * 영문 macOS/Windows를 쓰는 한국인은 `["en-US", "ko-KR"]`이 흔하다.
 * primary만 보면 이들이 전부 en으로 던져지는데, 진입 게이트를 걷어낸 뒤에는
 * **직접 고를 기회조차 없다.** (게이트가 있을 땐 KO를 고를 수 있었다.)
 * i18n이 미완인 동안 이 오판의 비용은 "반쯤 한국어인 EN 화면"이므로,
 * **의심스러우면 ko 쪽으로 기운다.**
 *
 * 2026-07 결정: 진입 화면에서 한/영을 **묻지 않는다**. 이 함수가 정답을 고르고,
 * 유저는 nav의 KO/EN 토글로 언제든 뒤집는다. (첫 90초에 숙제를 주지 않는다.)
 * 게이트 제거 작업에서 재사용해야 하므로 export.
 */
export function detectDefaultLabelLanguage(): LabelLanguage {
  try {
    const navLangs =
      typeof navigator.languages !== "undefined" && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];

    // 1. primary가 아니라 전체 목록에서 ko를 찾는다 (영문 OS 한국인 구제).
    //    유저가 직접 설정한 값이므로 리퍼러보다 우선한다.
    const prefersKorean = navLangs.some((tag) =>
      (tag || "").toLowerCase().startsWith("ko"),
    );
    if (prefersKorean) return "ko";

    // 2. 영어 지배적 커뮤니티에서 왔고, 브라우저에 ko도 없다 → en
    const referrer = document.referrer || "";
    if (EN_REFERRER_PATTERN.test(referrer)) return "en";

    // 3. 타임존 보조 신호 — 언어 목록에 ko가 없어도 한국에서 접속했다면 ko
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz === "Asia/Seoul") return "ko";
    } catch {
      /* Intl 미지원 — 무시 */
    }

    return "en";
  } catch {
    return DEFAULT_LAYER_PREFS.labelLanguage;
  }
}

/** 축 관계망 — 예전 1회 OFF 정착 키만 소모. 지정학 FORCE_ON이 CRINK 축을 켠다. */
function settleAxisNetworkDefaultOff(prefs: LayerPrefs): LayerPrefs {
  if (!shouldPersistLayerPrefs()) return prefs;
  try {
    if (!localStorage.getItem(AXIS_NETWORK_DEFAULT_OFF_KEY)) {
      localStorage.setItem(AXIS_NETWORK_DEFAULT_OFF_KEY, "1");
    }
  } catch {
    /* ignore */
  }
  return prefs;
}

/** 텔레그램 OSINT 미니패널 — 기존 저장본도 1회 ON으로 맞춤 (닫기는 X로) */
function settleTelegramDefaultOn(prefs: LayerPrefs): LayerPrefs {
  if (!shouldPersistLayerPrefs()) return prefs;
  try {
    if (!localStorage.getItem(TELEGRAM_DEFAULT_ON_KEY)) {
      localStorage.setItem(TELEGRAM_DEFAULT_ON_KEY, "1");
      return { ...prefs, showTelegramOsint: true };
    }
  } catch {
    /* ignore */
  }
  return prefs;
}

function settleLayerPrefDefaults(prefs: LayerPrefs): LayerPrefs {
  return settleTelegramDefaultOn(settleAxisNetworkDefaultOff(prefs));
}


/**
 * 저장된 prefs 를 읽어 온다 (상업 게이트 **적용 전**).
 *
 * ⚠️ 이 함수를 직접 쓰지 말 것 — `loadLayerPrefs()` 를 쓸 것.
 *    게이트를 우회하게 된다.
 */
function loadLayerPrefsRaw(): LayerPrefs {
  if (typeof window === "undefined") return DEFAULT_LAYER_PREFS;
  /**
   * dev는 레이어 prefs를 저장하지 않지만, **언어 감지는 dev에서도 돌아야 한다.**
   * (기존에는 여기서 바로 return해서 dev가 항상 ko로 고정 → EN 경로를 개발 중
   *  한 번도 못 보는 상태였다. i18n 누락이 오래 안 잡힌 원인 중 하나.)
   */
  if (!shouldPersistLayerPrefs()) {
    return { ...DEFAULT_LAYER_PREFS, labelLanguage: detectDefaultLabelLanguage() };
  }
  try {
    const v21Raw = localStorage.getItem(LAYER_PREFS_KEY);
    if (v21Raw) {
      return settleLayerPrefDefaults(
        finalizeLayerPrefsWithAffinity(
          mergeSavedPrefs(JSON.parse(v21Raw) as SavedLayerPrefs),
        ),
      );
    }

    const v19Raw = localStorage.getItem("geowatch-layers-v19");
    if (v19Raw) {
      const migrated = migrateV19ToV20(JSON.parse(v19Raw) as SavedLayerPrefs);
      saveLayerPrefs(migrated);
      return settleLayerPrefDefaults(finalizeLayerPrefsWithAffinity(migrated));
    }

    for (const legacyKey of LEGACY_LAYER_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migrated = mergeSavedPrefs(JSON.parse(legacyRaw) as SavedLayerPrefs);
      saveLayerPrefs(migrated);
      return settleLayerPrefDefaults(finalizeLayerPrefsWithAffinity(migrated));
    }

    // 첫 방문(저장된 prefs 없음) — 리퍼러/브라우저 언어로 기본 표시 언어만 추정
    return settleLayerPrefDefaults(
      finalizeLayerPrefsWithAffinity({
        ...DEFAULT_LAYER_PREFS,
        labelLanguage: detectDefaultLabelLanguage(),
      }),
    );
  } catch {
    return DEFAULT_LAYER_PREFS;
  }
}

/**
 * 표시용 LayerPrefs — **상업 게이트가 적용된 최종본.**
 *
 * 유료 티어에서는 상업 이용이 불가·미확인인 레이어가 강제로 꺼진다.
 * 사용자가 켜뒀더라도 마찬가지다 — UX 문제가 아니라 계약 문제라
 * 사용자 선택보다 우선한다. 무료 티어에서는 아무것도 바뀌지 않는다.
 *
 * 게이트를 prefs 길목에 두는 이유: 레이어 표시 여부는 결국 이 불리언
 * 하나로 수렴하므로, 여기서 한 번 거르면 아래 렌더 경로 전체가 안전해진다.
 * 렌더 컴포넌트마다 심으면 새 컴포넌트가 생길 때 반드시 빠뜨린다.
 *
 * @see src/lib/licensing/layerPrefGate.ts
 * @see docs/copyright-audit-2026-08-01.md — O-1(b)
 */
export function loadLayerPrefs(): LayerPrefs {
  return enforceCommercialTier(loadLayerPrefsRaw(), currentProductTier());
}

export function saveLayerPrefs(prefs: LayerPrefs) {
  if (typeof window === "undefined") return;
  if (!shouldPersistLayerPrefs()) return;
  localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(prefs));
  noteLayerAffinityAttendance(prefs);
}
