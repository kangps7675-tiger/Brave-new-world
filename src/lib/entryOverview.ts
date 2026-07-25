import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  CONFLICT_RESOURCE_HERO_ON,
  ECONOMY_RESOURCE_HERO_ON,
  ensureResourceLayersOn,
} from "@/lib/viewerChrome";
import {
  RED_SEA_HOUTHI_STACK,
} from "@/lib/hotTheaterLayers";

/**
 * 첫 진입 게이트 — 로테이션이 아니라 입·출구(한 번 통과하면 끝).
 *
 * 순서(하드코딩):
 * 1. 로딩 — 전역 궤도 (altitude 2.85)
 * 2. 환영 편지지 / 도메인 선택
 * 3. 전역 지구본 히어로 유지 → "핫 지역으로 갈까요?" 선택창 후에만 줌인
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
   * 전역 시야 중심 — 특정 초크/전장에 붙이지 않음.
   * (아프리카·유럽·중동·남아가 한 화면에 들어오는 중립 앵커)
   */
  bootLookAt: {
    lat: 18,
    lng: 25,
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

/** 지정학 히어로 — 홍해·해상 위협 + 자원(해저관·송유관·원자력) */
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
  ...CONFLICT_RESOURCE_HERO_ON,
};

/** 지경학 히어로 — 시장 기본 + 자원(매장지·가스관·LNG) */
const ECONOMY_HERO_ON: Partial<LayerPrefs> = {
  showAis: true,
  showAirTraffic: true,
  showLogisticsRisk: true,
  showCriticalNodes: true,
  showSubmarineCables: true,
  ...ECONOMY_RESOURCE_HERO_ON,
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
    next = ensureResourceLayersOn(clampPrefsToActiveCap(next, true), mode);
    if (mode === "conflict") {
      next = {
        ...next,
        showWarZones: true,
        showDiplomaticTension: true,
        showGdeltWar: true,
      };
      next = ensureResourceLayersOn(clampPrefsToActiveCap(next, true), mode);
    }
  } else if (mode === "conflict") {
    next = clampPrefsToActiveCap(next, false);
    next = { ...next, ...CONFLICT_HERO_ON };
    next = ensureResourceLayersOn(clampPrefsToActiveCap(next, false), mode);
  } else {
    next = ensureResourceLayersOn(next, mode);
  }

  return next;
}
