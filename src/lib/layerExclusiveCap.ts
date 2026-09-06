import { GEOWATCH_CONFIG } from "@/config/geowatch.config";
import type { LayerPrefs } from "@/lib/layerPrefs";

/**
 * 레이어 동시 ON 캡 — 정본 `@/config/geowatch.config`
 * - 일반: fullModeMaxLayers
 * - Ultra-Lite: ultraLiteMaxLayers
 */
export const ACTIVE_LAYER_CAP_DEFAULT = GEOWATCH_CONFIG.caps.fullModeMaxLayers;

/** ultra-lite — 무거운 폴링 레이어를 줄이는 소프트 상한 */
export const ACTIVE_LAYER_CAP_ULTRA = GEOWATCH_CONFIG.caps.ultraLiteMaxLayers;

/**
 * 캡 집계에서 제외:
 * - showNeptunPreviousTrails: NEPTUN 종속 옵션 (별도 슬롯 안 씀)
 * - showGscpiGauge: 지도 레이어가 아니라 우상단 UI 칩. 캡에 잡히면
 *   clamp에서 잘려 「전 세계 물류 혼잡도」가 사라짐.
 * - showLogisticsStress: 초크포인트 색상 모드 (showLogisticsRisk 종속)
 */
const CAP_EXEMPT_KEYS = new Set<keyof LayerPrefs>([
  "labelLanguage",
  "showNeptunPreviousTrails",
  "showGscpiGauge",
  "showSesChip",
  "showLogisticsStress",
]);

/** 캡 초과 시 잘라낼 때 우선 유지 (앞쪽일수록 유지) */
export const LAYER_CAP_KEEP_PRIORITY: Array<keyof LayerPrefs> = [
  "showUkraineControl",
  "showNeptun",
  "showUkraineStrikesOnRussia",
  "showWarZones",
  "showDiplomaticTension",
  "showEastAsiaAdiz",
  "showIslandChains",
  "showAxisNetwork",
  "showGdeltWar",
  "showGdeltOceanCompetition",
  "showFirmsFires",
  "showUkmtoIncidents",
  "showNavareaWarnings",
  "showMilitaryActivity",
  "showMilitaryBases",
  "showRokMilitaryBases",
  "showJapanMilitaryBases",
  "showTaiwanMilitaryBases",
  "showPhilippinesMilitaryBases",
  "showAustraliaMilitaryBases",
  "showEasternNatoMilitaryBases",
  "showShippingLanes",
  "showCrinkInfraPower",
  "showCrinkInfraBorder",
  "showCrinkInfraDams",
  "showCrinkInfraAeroway",
  "showCrinkInfraHarbour",
  "showCrinkInfraCheckpoint",
  "showCrinkInfraRail",
  "showCrinkInfraRoad",
  "showUsCarriers",
  "showGpsInterference",
  "showReconSatellites",
  "showAirTraffic",
  "showAis",
  "showDisguisedVessels",
  "showTzevaAdom",
  "showNewfeedsIranAttacks",
  "showChinaTaiwanIncidents",
  "showChinaJapanIncidents",
  "showChinaPhilippinesIncidents",
  "showUsChinaIncidents",
  "showReefWatch",
  "showNorthKoreaMissileTests",
  "showTelegramOsint",
  "showConflictZones",
  "showLogisticsRisk",
  "showCriticalNodes",
  "showBriTradeConnectivity",
  "showStrategicCorridors",
  "showUsDfcSupplyChain",
  "showSubmarineCables",
  "showOilPipelines",
  "showGasPipelines",
  "showSubseaPipelines",
  "showLngTerminals",
  "showResources",
  "showGemOilGasExtraction",
  "showGemCoalMines",
  "showGemIronOre",
  "showNuclearSites",
  "showCityLabels",
];

export function isLayerCapCountedKey(key: keyof LayerPrefs): boolean {
  if (CAP_EXEMPT_KEYS.has(key)) return false;
  return typeof key === "string" && key.startsWith("show");
}

export function countActiveLayers(prefs: LayerPrefs): number {
  let n = 0;
  for (const key of Object.keys(prefs) as Array<keyof LayerPrefs>) {
    if (!isLayerCapCountedKey(key)) continue;
    if (prefs[key] === true) n += 1;
  }
  return n;
}

export function activeLayerCap(ultraLite: boolean): number {
  return ultraLite ? ACTIVE_LAYER_CAP_ULTRA : ACTIVE_LAYER_CAP_DEFAULT;
}

/** 끄기(false)는 항상 OK. ON은 일반 30 / Ultra 16 상한. */
export function canEnableLayer(
  prefs: LayerPrefs,
  key: keyof LayerPrefs,
  ultraLite: boolean,
): boolean {
  if (!isLayerCapCountedKey(key)) return true;
  if (prefs[key] === true) return true;
  return countActiveLayers(prefs) < activeLayerCap(ultraLite);
}

/**
 * 캡이 남아 있으면 ON. 초과면 prefs 그대로(호출측에서 거부·경고).
 * 자리 비우기가 필요하면 enableLayerEvictingCap 사용 (일반·Ultra 공통, P2-2).
 */
export function enableLayerWithCap(
  prefs: LayerPrefs,
  key: keyof LayerPrefs,
  ultraLite: boolean,
): LayerPrefs {
  if (!isLayerCapCountedKey(key)) {
    return { ...prefs, [key]: true } as LayerPrefs;
  }
  if (prefs[key] === true) return prefs;
  if (!canEnableLayer(prefs, key, ultraLite)) return prefs;
  return { ...prefs, [key]: true } as LayerPrefs;
}

/**
 * 캡 초과 시 우선순위 낮은 레이어를 끄고 새 레이어 ON (일반·Ultra 공통).
 */
export function enableLayerEvictingCap(
  prefs: LayerPrefs,
  key: keyof LayerPrefs,
  ultraLite: boolean,
): LayerPrefs {
  const next = { ...prefs, [key]: true } as LayerPrefs;
  if (!isLayerCapCountedKey(key)) return next;
  if (prefs[key] === true) return prefs;

  const cap = activeLayerCap(ultraLite);
  if (countActiveLayers(next) <= cap) return next;

  const priorityIndex = new Map(
    LAYER_CAP_KEEP_PRIORITY.map((k, index) => [k, index] as const),
  );
  const victims = (Object.keys(next) as Array<keyof LayerPrefs>).filter(
    (k) => k !== key && isLayerCapCountedKey(k) && next[k] === true,
  );
  victims.sort((a, b) => {
    const pa = priorityIndex.get(a) ?? 10_000;
    const pb = priorityIndex.get(b) ?? 10_000;
    if (pa !== pb) return pb - pa;
    return String(b).localeCompare(String(a));
  });

  for (const victim of victims) {
    if (countActiveLayers(next) <= cap) break;
    (next as Record<string, boolean | string>)[victim as string] = false;
  }
  return next;
}

/**
 * prefs를 **임의 상한**으로 자른다 — 우선순위(LAYER_CAP_KEEP_PRIORITY) 앞쪽을 남긴다.
 *
 * 첫 화면 예산처럼 일반 캡보다 훨씬 작은 값이 필요할 때 쓴다.
 */
export function clampPrefsToLimit(prefs: LayerPrefs, limit: number): LayerPrefs {
  if (!Number.isFinite(limit) || countActiveLayers(prefs) <= limit) return prefs;

  const next = { ...prefs };
  const onKeys = (Object.keys(next) as Array<keyof LayerPrefs>).filter(
    (key) => isLayerCapCountedKey(key) && next[key] === true,
  );

  const priorityIndex = new Map(
    LAYER_CAP_KEEP_PRIORITY.map((key, index) => [key, index] as const),
  );
  onKeys.sort((a, b) => {
    const pa = priorityIndex.get(a) ?? 10_000;
    const pb = priorityIndex.get(b) ?? 10_000;
    if (pa !== pb) return pa - pb;
    return String(a).localeCompare(String(b));
  });

  for (let i = limit; i < onKeys.length; i += 1) {
    const key = onKeys[i];
    (next as Record<string, boolean | string>)[key as string] = false;
  }
  return next;
}

/**
 * prefs가 캡을 넘으면 우선순위 밖·뒤쪽 ON을 끈다.
 *
 * ⚠️ **클램프는 항상 마지막이어야 한다.**
 * 클램프 뒤에 `ensure*Layers` 같은 강제 ON을 실행하면 방금 자른 것이 되살아나
 * 상한이 무의미해진다. 실제로 `buildDomainOverviewPrefs`가 그 구조라
 * 부팅 시 30개(=상한 전부)가 한꺼번에 켜져 저사양 기기에서 프론트가 죽었다.
 */
export function clampPrefsToActiveCap(
  prefs: LayerPrefs,
  ultraLite: boolean,
): LayerPrefs {
  return clampPrefsToLimit(prefs, activeLayerCap(ultraLite));
}
