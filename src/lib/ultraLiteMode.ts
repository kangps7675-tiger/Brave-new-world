import {
  DEFAULT_BASEMAP_MODE,
  parseBasemapMode,
  type BasemapMode,
} from "@/lib/basemapMode";
import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";

export const PERF_PREFS_KEY = "geowatch-perf-v23";
const LEGACY_PERF_PREFS_KEYS = ["geowatch-perf-v22"] as const;

export type PerfPrefs = {
  /** 내장 그래픽·8GB RAM용 — 레이어 캡·핀 상한·무거운 레이어 강제 OFF */
  ultraLite: boolean;
  /** 인텔(다크 벡터) / 지형(밝은 벡터+DEM) 베이스맵 */
  basemapMode: BasemapMode;
  /**
   * 레이어 목록·지도 피처 호버 시 데이터/출처 패널.
   * 끌 수 있음 — 밀집 UI에서 호버 카드가 거슬릴 때.
   */
  showLayerHoverInfo: boolean;
};

export const DEFAULT_PERF_PREFS: PerfPrefs = {
  ultraLite: false,
  basemapMode: DEFAULT_BASEMAP_MODE,
  showLayerHoverInfo: true,
};

/** ultra-lite ON 시 강제 OFF (슬롯·GPU 부담) */
export const ULTRA_LITE_FORCE_OFF: Array<keyof LayerPrefs> = [
  "showRailGlow",
  "showDiplomaticTension",
  "showConflictZones",
  "showArmsEmbargo",
  "showSubmarineCables",
  "showInternetExchanges",
  "showAiDataCenters",
  "showSpaceLaunches",
  "showReconSatellites",
  "showGpsInterference",
  "showElectionEvents",
  "showCyberIncidents",
  "showSanctionsEntities",
  "showNeptunPreviousTrails",
  "showMissileSilos",
  "showMissileSiloFields",
];

/**
 * Ultra-Lite에서 렌더 부담이 큰 레이어 — 체크박스 이름 옆 「클릭 주의」태그.
 * (강제 OFF 목록 + 핀·경로·화재 등 밀도가 높은 항목)
 */
export const ULTRA_LITE_HEAVY_RENDER_KEYS = new Set<keyof LayerPrefs>([
  ...ULTRA_LITE_FORCE_OFF,
  "showUkraineControl",
  "showNeptun",
  "showFirmsFires",
  "showAis",
  "showGdeltWar",
  "showGdeltDiplomatic",
  "showGdeltAlliance",
  "showGdeltProtests",
  "showCityLabels",
  "showMilitaryActivity",
  "showAirTraffic",
  "showMilitaryBases",
  "showRokMilitaryBases",
  "showJapanMilitaryBases",
  "showTaiwanMilitaryBases",
  "showPhilippinesMilitaryBases",
  "showAustraliaMilitaryBases",
  "showEasternNatoMilitaryBases",
  "showMissileSilos",
  "showStrategicMissileBases",
  "showMissileTestSites",
  "showMissileSiloFields",
  "showShippingLanes",
  "showTelegramOsint",
  "showWarZones",
  "showIntelHotspots",
  "showGpsInterference",
]);

export function isUltraLiteHeavyRenderKey(key: keyof LayerPrefs | undefined): boolean {
  return Boolean(key && ULTRA_LITE_HEAVY_RENDER_KEYS.has(key));
}
function readPerfPrefsRaw(): string | null {
  const raw = localStorage.getItem(PERF_PREFS_KEY) ?? sessionStorage.getItem(PERF_PREFS_KEY);
  if (raw) return raw;
  for (const key of LEGACY_PERF_PREFS_KEYS) {
    const legacy = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (legacy) return legacy;
  }
  return null;
}

/**
 * 저장된 성능 설정이 있는지(= 재방문인지) — 없으면(생애 첫 방문)
 * {@link estimateWeakDeviceHint}로 초기값을 가늠할지 판단하는 데 쓴다.
 * loadPerfPrefs()만으로는 "저장 안 됨"과 "저장된 false"를 구분할 수 없다.
 */
export function hasStoredPerfPrefs(): boolean {
  if (typeof window === "undefined") return false;
  return readPerfPrefsRaw() != null;
}

/**
 * 생애 첫 방문에만 쓰는 조용한 초기 추정 — 사용자에게 사양을 묻지 않는다
 * ("첫 90초에 사양을 묻지 않는다"는 UX 결정은 유지, perfProbe.ts 참고).
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────
 * `useUltraLiteAutoOffer`의 FPS 프로브는 워밍업 1.2s + 샘플 3s, 즉 최소
 * 4.2초가 지나야 저사양 기기에도 Ultra-Lite가 적용된다. 그 사이 지도는
 * 이미 풀티어로 초기화·데이터 페치·마커 렌더를 시작한 뒤다 — 정말 약한
 * 기기라면 그 4.2초 자체가 버겁거나, MapGlobeView의 12초 idleFallback에
 * 먼저 걸릴 수 있다.
 *
 * `navigator.hardwareConcurrency`(코어 수)·`navigator.deviceMemory`(GB,
 * Chromium 계열만) 둘 다 실측이 아니라 힌트일 뿐이라 오탐이 있을 수 있다.
 * 그래도 "모르면 무겁다고 단정"보다 "약해 보이면 가볍게 시작 후 정확한
 * probeFps 결과로 즉시 교정"이 항상 더 안전한 방향이라 채택한다.
 */
export function estimateWeakDeviceHint(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && Number.isFinite(cores) && cores > 0 && cores <= 4) {
    return true;
  }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && Number.isFinite(mem) && mem > 0 && mem <= 4) {
    return true;
  }
  return false;
}

export function loadPerfPrefs(): PerfPrefs {
  if (typeof window === "undefined") return DEFAULT_PERF_PREFS;
  try {
    const legacyRaw = readPerfPrefsRaw();
    if (!legacyRaw) return DEFAULT_PERF_PREFS;
    const parsed = JSON.parse(legacyRaw) as Partial<PerfPrefs>;
    return {
      ultraLite: Boolean(parsed.ultraLite),
      basemapMode: parseBasemapMode(parsed.basemapMode),
      // 저장값 없으면 기본 ON — 예전 perf JSON과의 호환
      showLayerHoverInfo: parsed.showLayerHoverInfo !== false,
    };
  } catch {
    return DEFAULT_PERF_PREFS;
  }
}

/** Partial merge — ultraLite만 바꿔도 basemapMode 유지 */
export function savePerfPrefs(prefs: Partial<PerfPrefs>): void {
  if (typeof window === "undefined") return;
  const next: PerfPrefs = { ...loadPerfPrefs(), ...prefs };
  const payload = JSON.stringify(next);
  try {
    localStorage.setItem(PERF_PREFS_KEY, payload);
    sessionStorage.removeItem(PERF_PREFS_KEY);
    for (const key of LEGACY_PERF_PREFS_KEYS) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore quota */
  }
}

/** ultra-lite 켤 때 레이어 prefs에 강제 제약 적용 */
export function applyUltraLiteToLayerPrefs(prefs: LayerPrefs): LayerPrefs {
  let next: LayerPrefs = { ...prefs };
  for (const key of ULTRA_LITE_FORCE_OFF) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  next = clampPrefsToActiveCap(next, true);
  return next;
}

/** ultra-lite 끌 때는 캡만 일반(20)으로 재클램프 — 레이어는 사용자 값 유지 */
export function applyNormalCapToLayerPrefs(prefs: LayerPrefs): LayerPrefs {
  return clampPrefsToActiveCap(prefs, false);
}

export function ultraLiteGdeltPinScale(): number {
  return 0.35;
}

export function resetLayerPrefsForUltraLite(): LayerPrefs {
  return applyUltraLiteToLayerPrefs({
    ...DEFAULT_LAYER_PREFS,
    showUkraineControl: false,
    showNeptun: true,
    showNeptunPreviousTrails: false,
  });
}
