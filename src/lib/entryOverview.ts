import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";
import { activeLayerCap, clampPrefsToLimit } from "@/lib/layerExclusiveCap";
import { GEOWATCH_CONFIG } from "@/config/geowatch.config";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import type { ViewerMode } from "@/lib/viewPackages";
import { GLOBAL_BOOT_ALTITUDE } from "@/lib/globeCamera";
import {
  FIRST_SCREEN_CONFLICT_ON,
  FIRST_SCREEN_ECONOMY_ON,
} from "@/lib/firstScreenLayers";

/**
 * 첫 진입 게이트 — 로테이션이 아니라 입·출구(한 번 통과하면 끝).
 *
 * 순서(하드코딩):
 * 1. 로딩 — 전역 궤도 (altitude GLOBAL_BOOT_ALTITUDE)
 * 2. 환영 편지지 / 도메인 선택
 * 3. 전역 지구본 히어로 유지 → "핫 지역으로 갈까요?" 선택창 후에만 줌인
 */
/** 고도는 런타임에 LOD 앵커로 바뀌므로 literal이 되면 안 됨 (`as const` 금지). */
export const ENTRY_GATE: {
  bootAltitude: number;
  bootLookAt: { readonly lat: number; readonly lng: number };
  /** 전역 실루엣용 MapLibre pitch (degrees) */
  bootPitch: number;
  zoomOutAltitude: number;
  zoomOutFlyMs: number;
  afterZoomOutHoldMs: number;
} = {
  /**
   * 로딩 셰이더·MapLibre initialViewState 와 동일 — 지구본 전체 실루엣.
   * LOD tier: global (> 1.65).
   */
  bootAltitude: GLOBAL_BOOT_ALTITUDE,
  /**
   * 전역 시야 중심 — 특정 초크/전장에 붙이지 않음 (적도 부근 중립 앵커).
   */
  bootLookAt: {
    lat: 18,
    lng: 20,
  },
  /** 살짝 틸트 — 멀리서도 구면 실루엣이 읽히게 */
  bootPitch: 22,
  /** 입구 종료 후 첫 화면도 로딩과 동일 크기 — 추가 줌아웃 없음 */
  zoomOutAltitude: GLOBAL_BOOT_ALTITUDE,
  zoomOutFlyMs: 1200,
  afterZoomOutHoldMs: 0,
};

/* 삭제됨 (P2-5): DOMAIN_OVERVIEW_ALTITUDE / _LOOK_AT / _FLY_MS / _THEN_DETAIL_MS.
   ENTRY_GATE로 대체된 뒤 자기 파일 외 참조가 0건인 채 남아 있던 별칭이다.
   필요하면 ENTRY_GATE.zoomOutAltitude / bootLookAt / zoomOutFlyMs를 직접 쓸 것. */

/** 첫 화면 예산 — SSOT는 `geowatch.config.caps.firstScreenMaxLayers` */
export const FIRST_SCREEN_MAX_LAYERS = GEOWATCH_CONFIG.caps.firstScreenMaxLayers;

function allBooleanLayersOff(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

/** 지정학 첫 화면 — Compact `전선` 칩. 기지·CRINK·GDELT는 전장 진입 시 */
const CONFLICT_HERO_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_CONFLICT_ON,
};

/** 지경학 첫 화면 — Compact `항로` 칩. 에너지·매장지는 칩/허브에서 */
const ECONOMY_HERO_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_ECONOMY_ON,
};

/**
 * 도메인 게이트 직후 첫 화면용 레이어.
 *
 * 장면 칩 하나만 켠다. 기지·ADIZ·CRINK·텔레그램은 전장/허브 진입 때
 * conceptLayers가 붙인다. 클램프는 항상 마지막.
 */
export function buildDomainOverviewPrefs(
  mode: ViewerMode,
  options?: { labelLanguage?: LabelLanguage; ultraLite?: boolean },
): LayerPrefs {
  const labelLanguage = options?.labelLanguage ?? DEFAULT_LAYER_PREFS.labelLanguage;
  let next = allBooleanLayersOff({ ...DEFAULT_LAYER_PREFS, labelLanguage });

  next =
    mode === "conflict"
      ? { ...next, ...CONFLICT_HERO_ON }
      : { ...next, ...ECONOMY_HERO_ON };

  if (options?.ultraLite) {
    next = applyUltraLiteToLayerPrefs(next);
    next =
      mode === "conflict"
        ? { ...next, ...CONFLICT_HERO_ON }
        : { ...next, ...ECONOMY_HERO_ON };
    next = applyUltraLiteToLayerPrefs(next);
  }

  const budget = options?.ultraLite
    ? Math.min(FIRST_SCREEN_MAX_LAYERS, activeLayerCap(true))
    : FIRST_SCREEN_MAX_LAYERS;

  return clampPrefsToLimit(next, budget);
}
