import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  ensureResourceLayersOn,
  SHARED_RESOURCE_LAYER_ON,
} from "@/lib/viewerChrome";
import {
  CONFLICT_ENTRY_MARITIME_FLY,
  RED_SEA_HOUTHI_STACK,
} from "@/lib/hotTheaterLayers";

/**
 * 첫 진입 게이트 — 로테이션이 아니라 입·출구(한 번 통과하면 끝).
 *
 * 순서(하드코딩):
 * 1. 로딩 — 뒷배경 고도 = 로딩 셰이더(z≈3.85)와 동일 visual (altitude 2.85)
 * 2. 환영 편지지
 * 3. 지정학 / 지경학 선택
 * 4. 전역 지구본 히어로 (ModePicker 세부창 없음) → 상단 주요전장 드롭다운
 */
/** 고도는 런타임에 LOD 앵커로 바뀌므로 literal이 되면 안 됨 (`as const` 금지). */
export const ENTRY_GATE: {
  bootAltitude: number;
  bootLookAt: { readonly lat: number; readonly lng: number };
  zoomOutAltitude: number;
  zoomOutFlyMs: number;
  afterZoomOutHoldMs: number;
} = {
  /**
   * 로딩 셰이더 카메라 거리 z=3.85 ≈ globe altitude 2.85 (1+altitude).
   * LOD tier: global (> 1.65).
   */
  bootAltitude: 2.85,
  /**
   * 홍해·바브엘만데브 — 2026 지정학 입구 최우선 해상 위협 항로.
   * ([lng, lat] ≈ [43.35, 12.61])
   */
  bootLookAt: {
    lat: CONFLICT_ENTRY_MARITIME_FLY.lat,
    lng: CONFLICT_ENTRY_MARITIME_FLY.lng,
  },
  /** 입구 종료 후 첫 화면도 로딩과 동일 크기 — 추가 줌아웃 없음 */
  zoomOutAltitude: 2.85,
  zoomOutFlyMs: 1200,
  afterZoomOutHoldMs: 0,
};

/** @deprecated ENTRY_GATE.bootAltitude / zoomOutAltitude 사용 */
export const DOMAIN_OVERVIEW_ALTITUDE = ENTRY_GATE.zoomOutAltitude;

/** @deprecated ENTRY_GATE.bootLookAt */
export const DOMAIN_OVERVIEW_LOOK_AT = ENTRY_GATE.bootLookAt;

/** @deprecated ENTRY_GATE.zoomOutFlyMs */
export const DOMAIN_OVERVIEW_FLY_MS = ENTRY_GATE.zoomOutFlyMs;

/** @deprecated 세부 ModePicker 제거 — 더 이상 사용하지 않음 */
export const DOMAIN_OVERVIEW_THEN_DETAIL_MS = 0;

function allBooleanLayersOff(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

/** 지정학 히어로 — 홍해·해상 위협 스택을 먼저 켠다 (+ 공통 에너지·자원) */
const CONFLICT_HERO_ON: Partial<LayerPrefs> = {
  ...RED_SEA_HOUTHI_STACK,
  showWarZones: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showGdeltProtests: true,
  showMilitaryActivity: true,
  showAis: true,
  showLogisticsRisk: true,
  showAxisNetwork: true,
  showSubmarineCables: true,
  showNewfeedsIranAttacks: true,
  showUsCarriers: true,
  ...SHARED_RESOURCE_LAYER_ON,
};

/** 지경학 히어로 — 요청 기본 레이어 (+ 공통 에너지·자원) */
const ECONOMY_HERO_ON: Partial<LayerPrefs> = {
  showAis: true,
  showAirTraffic: true,
  showLogisticsRisk: true,
  showCriticalNodes: true,
  showSubmarineCables: true,
  ...SHARED_RESOURCE_LAYER_ON,
  showAiDataCenters: true,
  showPorts: true,
  showAirports: true,
  /** 미·중 공급망 대치 — 게이트 직후 overview가 패키지 ON을 덮지 않도록 히어로에 포함 */
  showBriTradeConnectivity: true,
  showUsDfcSupplyChain: true,
};

/**
 * 도메인 게이트 직후 첫 화면용 레이어.
 */
export function buildDomainOverviewPrefs(
  mode: ViewerMode,
  options?: { labelLanguage?: LabelLanguage; ultraLite?: boolean },
): LayerPrefs {
  const labelLanguage = options?.labelLanguage ?? DEFAULT_LAYER_PREFS.labelLanguage;
  let next = allBooleanLayersOff({ ...DEFAULT_LAYER_PREFS, labelLanguage });

  if (mode === "conflict") {
    next = { ...next, ...CONFLICT_HERO_ON };
  } else {
    next = { ...next, ...ECONOMY_HERO_ON };
  }

  if (options?.ultraLite) {
    next = applyUltraLiteToLayerPrefs(next);
    if (mode === "conflict") {
      next = { ...next, ...CONFLICT_HERO_ON };
    } else {
      next = { ...next, ...ECONOMY_HERO_ON };
    }
    next = ensureResourceLayersOn(clampPrefsToActiveCap(next, true));
    if (mode === "conflict") {
      next = {
        ...next,
        showWarZones: true,
        showDiplomaticTension: true,
        showGdeltWar: true,
      };
      next = ensureResourceLayersOn(clampPrefsToActiveCap(next, true));
    }
  } else if (mode === "conflict") {
    next = clampPrefsToActiveCap(next, false);
    next = { ...next, ...CONFLICT_HERO_ON };
    next = ensureResourceLayersOn(clampPrefsToActiveCap(next, false));
  } else {
    next = ensureResourceLayersOn(next);
  }

  return next;
}
