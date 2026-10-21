import type { LayerPrefs } from "@/lib/layerPrefs";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/**
 * 전쟁·안보 전역 첫 화면 — 영토·분쟁·진영 폴리곤만.
 * 배관·기지·항적·이벤트·CRINK OSM 인프라는 패널에서 수동 ON.
 */
export const FIRST_SCREEN_CONFLICT_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkraineControl: true,
  // 이란·우크라이나 위 빨간 빗금은 시선을 가려서 기본 OFF — 패널의 "전쟁·교전 구역"에서 켠다
  showWarZones: false,
  showAlliedBlocs: true,
  // 선박 사건 스택(우측)의 1차 출처 — UKMTO 상선 피습·나포 경보
  showUkmtoIncidents: true,
};

/**
 * 경제·물류 전역 첫 화면 — 진영 폴리곤 + 해상 물류 뼈대 + 공항.
 * 항구·주요 항로·초크포인트·공항. 배관은 속보·사건 포커스 때 잠깐 ON.
 * 공항은 STATIC_POINT_MAX_BY_TIER / HTML 캡으로 전역 LOD 컷.
 */
export const FIRST_SCREEN_ECONOMY_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showGeoEconBlocs: true,
  showPorts: true,
  showShippingLanes: true,
  showLogisticsRisk: true,
  showAirports: true,
};

/**
 * 항적(라이브) 첫 화면 — ADS-B(군·민) · AIS · GPSJam.
 * 전선·공언·시장 레이어는 다른 모드 홈. GPSJam은 ADS-B GNSS 이상 셀이라 여기가 본진.
 */
export const FIRST_SCREEN_LIVE_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showAis: true,
  showAirTraffic: true,
  showMilitaryActivity: true,
  showGpsInterference: true,
};

/**
 * 해운 위험 첫 화면 — 랜딩이 약속한 화면 (2026-10-21).
 *
 * 랜딩 「질문 넷」「화면 읽는 법」과 1:1:
 *   - 어느 배가 맞았나 → UKMTO 피습·나포 경보 + 주변 선박 AIS(상선·군함)
 *   - 그 바다는 얼마나 위험한가 → 항행경보(NAVAREA) + 공습 불꽃(항구·정유소 피격 표시 포함)
 *   - 그대로 지나가도 될까 → 미 항모·군용기(ADS-B 군용) + 해역 전장 속보 핀
 *   - 붉은 면(전쟁 중인 땅·통제 구역)과 불꽃은 showUkraineControl 스위치에 묶여 있어 켠다
 *   - 빛나는 선(CRINK 축 — 누가 공격 쪽에 힘을 대나)
 * 전장 속보 핀은 해운 길목과 닿은 전장만: 이란·레바논(동지중해)·우크라이나·흑해·대만·남중국해.
 */
export const FIRST_SCREEN_MARITIME_ON: Partial<Record<BooleanLayerKey, boolean>> = {
  showUkmtoIncidents: true,
  showNavareaWarnings: true,
  showAis: true,
  showAisMilitary: true,
  showAisCommercial: true,
  showUsCarriers: true,
  showMilitaryActivity: true,
  showUkraineControl: true,
  showUkraineStrikesOnRussia: true,
  showAxisNetwork: true,
  showFirmsFires: true,
  showConflictEvents: true,
  showConflictTheaterIran: true,
  showConflictTheaterLebanon: true,
  showConflictTheaterUkraine: true,
  showConflictTheaterBlackSea: true,
  showConflictTheaterTaiwan: true,
  showConflictTheaterSouthChinaSea: true,
};

/**
 * 해운 첫 화면에서 끄는 기본값 — 지정학 상황판용이라 바다 판단을 가린다.
 * (지우는 게 아니다. 레이어 서랍·「무엇을 볼까요 → 전선·분쟁」에서 그대로 켤 수 있다.)
 */
export const FIRST_SCREEN_MARITIME_OFF: BooleanLayerKey[] = [
  "showMilitaryBases",
  "showAlliedBlocs",
  "showAirTraffic",
  "showGdeltWar",
  "showTelegramOsint",
  "showTzevaAdom",
  "showNeptun",
  "showConflictTheaterSyria",
  "showConflictTheaterKorea",
  "showConflictTheaterKuril",
  "showConflictTheaterBaltic",
  "showConflictTheaterJapan",
  "showConflictTheaterCaucasus",
];
