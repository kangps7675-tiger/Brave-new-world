import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";

export const PERF_PREFS_KEY = "geowatch-perf-v22";

export type PerfPrefs = {
  /** 내장 그래픽·8GB RAM용 — 레이어 캡·핀 상한·무거운 레이어 강제 OFF */
  ultraLite: boolean;
};

export const DEFAULT_PERF_PREFS: PerfPrefs = {
  ultraLite: false,
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
  "showElectionEvents",
  "showCyberIncidents",
  "showSanctionsEntities",
  "showNeptunPreviousTrails",
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
  "showShippingLanes",
  "showTelegramOsint",
  "showUcdpEvents",
  "showWarZones",
  "showIntelHotspots",
]);

export function isUltraLiteHeavyRenderKey(key: keyof LayerPrefs | undefined): boolean {
  return Boolean(key && ULTRA_LITE_HEAVY_RENDER_KEYS.has(key));
}
export function loadPerfPrefs(): PerfPrefs {
  if (typeof window === "undefined") return DEFAULT_PERF_PREFS;
  try {
    const raw = localStorage.getItem(PERF_PREFS_KEY);
    // 이전 개발 세션 값도 한 번 승계한다.
    const legacyRaw = raw ?? sessionStorage.getItem(PERF_PREFS_KEY);
    if (!legacyRaw) return DEFAULT_PERF_PREFS;
    const parsed = JSON.parse(legacyRaw) as Partial<PerfPrefs>;
    return { ultraLite: Boolean(parsed.ultraLite) };
  } catch {
    return DEFAULT_PERF_PREFS;
  }
}

export function savePerfPrefs(prefs: PerfPrefs): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(prefs);
  try {
    // 개발·배포 모두 브라우저 재시작 뒤에도 Ultra-Lite 선택을 유지한다.
    localStorage.setItem(PERF_PREFS_KEY, payload);
    sessionStorage.removeItem(PERF_PREFS_KEY);
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
