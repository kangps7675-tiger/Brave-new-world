import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import type { ViewerMode } from "@/lib/viewPackages";

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
  /** 대만 해협 중심 — 첫 화면·도메인 선택 후 flyTo 핀포인트 ([lng, lat] = [119.5, 24.48]) */
  bootLookAt: { lat: 24.48, lng: 119.5 },
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

/** 지정학 히어로 — 요청 기본 레이어 */
const CONFLICT_HERO_ON: Partial<LayerPrefs> = {
  showWarZones: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showGdeltAlliance: true,
  showGdeltProtests: true,
  showMilitaryActivity: true,
  showAis: true,
  showLogisticsRisk: true,
  showAxisNetwork: true,
  showSubmarineCables: true,
  /** 에너지·자원 — 게이트 직후 overview가 force-on을 덮어도 유지 */
  showOilPipelines: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showResources: true,
  showGemOilGasExtraction: true,
  showGemCoalMines: true,
  showGemIronOre: true,
  showNuclearSites: true,
};

/** 지경학 히어로 — 요청 기본 레이어 */
const ECONOMY_HERO_ON: Partial<LayerPrefs> = {
  showAis: true,
  showAirTraffic: true,
  showLogisticsRisk: true,
  showCriticalNodes: true,
  showSubmarineCables: true,
  showOilPipelines: true,
  showGasPipelines: true,
  showLngTerminals: true,
  showResources: true,
  showGemOilGasExtraction: true,
  showGemCoalMines: true,
  showGemIronOre: true,
  showNuclearSites: true,
  showAiDataCenters: true,
  showPorts: true,
  showAirports: true,
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
    next = clampPrefsToActiveCap(next, true);
    if (mode === "conflict") {
      next = {
        ...next,
        showWarZones: true,
        showDiplomaticTension: true,
        showGdeltWar: true,
      };
      next = clampPrefsToActiveCap(next, true);
    }
  } else if (mode === "conflict") {
    next = clampPrefsToActiveCap(next, false);
    next = { ...next, ...CONFLICT_HERO_ON };
    next = clampPrefsToActiveCap(next, false);
  }

  return next;
}
