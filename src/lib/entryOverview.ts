import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";
import { activeLayerCap, clampPrefsToLimit } from "@/lib/layerExclusiveCap";
import { STRAITDESK_CONFIG } from "@/config/straitdesk.config";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import type { ViewerMode } from "@/lib/viewPackages";
import { GLOBAL_BOOT_ALTITUDE } from "@/lib/globeCamera";
import { entryBootAltitude } from "@/lib/globeFillScreen";
import {
  FIRST_SCREEN_CONFLICT_ON,
  FIRST_SCREEN_ECONOMY_ON,
  FIRST_SCREEN_LIVE_ON,
  FIRST_SCREEN_MARITIME_ON,
} from "@/lib/firstScreenLayers";

/**
 * 첫 진입 — 언어 게이트 후 전역 궤도.
 * 장면 모드(SceneMissionPicker)에서만 특정 전장·초크로 줌인.
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
   * 폴백 고도. 실제 카메라는 `entryBootAltitude(size)` — 구 전체가 짧은 변을 채움.
   */
  bootAltitude: GLOBAL_BOOT_ALTITUDE,
  /**
   * 적도 중심 — pitch 0 이면 구 실루엣(남극 포함)이 한 화면에 들어온다.
   */
  // 전역 궤도의 중심 — 구 전체 크기는 유지하고, 정면은 호르무즈·걸프.
  // 최근 피격이 홍해가 아니라 호르무즈에 몰려 있다.
  bootLookAt: {
    lat: 26.2,
    lng: 56.4,
  },
  /** 정면. 틸트하면 남반구가 잘려 "지구 전체"가 안 보인다. */
  bootPitch: 0,
  /** 입구 종료 후 첫 화면도 로딩과 동일 크기 — 추가 줌아웃 없음 */
  zoomOutAltitude: GLOBAL_BOOT_ALTITUDE,
  zoomOutFlyMs: 1200,
  afterZoomOutHoldMs: 0,
};

/** 전역 궤도 — 구 전체가 뷰포트 짧은 변을 채움 (pitch 0). */
export function entryOrbitCamera(size?: { width: number; height: number }): {
  lat: number;
  lng: number;
  altitude: number;
  pitch: number;
} {
  return {
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
    altitude: entryBootAltitude(size),
    pitch: ENTRY_GATE.bootPitch,
  };
}

/* 삭제됨 (P2-5): DOMAIN_OVERVIEW_ALTITUDE / _LOOK_AT / _FLY_MS / _THEN_DETAIL_MS.
   ENTRY_GATE로 대체된 뒤 자기 파일 외 참조가 0건인 채 남아 있던 별칭이다.
   필요하면 ENTRY_GATE.zoomOutAltitude / bootLookAt / zoomOutFlyMs를 직접 쓸 것. */

/** 첫 화면 예산 — SSOT는 `straitdesk.config.caps.firstScreenMaxLayers` */
export const FIRST_SCREEN_MAX_LAYERS = STRAITDESK_CONFIG.caps.firstScreenMaxLayers;

function allBooleanLayersOff(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

/** 전쟁·안보 첫 화면 — 영토·분쟁·진영 폴리곤 */
const CONFLICT_HERO_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_CONFLICT_ON,
};

/** 경제·물류 첫 화면 — 진영 · 항구 · 항로 · 초크 */
const ECONOMY_HERO_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_ECONOMY_ON,
};

/** 해운 위험 첫 화면 — 랜딩이 약속한 화면 (UKMTO·항행경보·AIS·항모·군용기·불꽃) */
const MARITIME_HERO_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_MARITIME_ON,
};

/** 항적 첫 화면 — ADS-B · AIS · GPSJam */
const LIVE_HERO_ON: Partial<LayerPrefs> = {
  ...FIRST_SCREEN_LIVE_ON,
};

/**
 * 도메인 게이트 직후 첫 화면용 레이어.
 *
 * 장면 칩 + 기지·에너지 히어로.
 * CRINK OSM·배관·DC·AIS는 기본 OFF(레이어 패널에서 켠다).
 * 지경학 첫 화면은 항구·항로·초크를 FIRST_SCREEN_ECONOMY_ON으로 켠다.
 */
export function buildDomainOverviewPrefs(
  mode: ViewerMode,
  options?: {
    labelLanguage?: LabelLanguage;
    ultraLite?: boolean;
    /** 지정학(conflict) 모드지만 해운 위험 첫 화면으로 — 신규 방문·해운 패키지 사용자 */
    maritime?: boolean;
  },
): LayerPrefs {
  const labelLanguage = options?.labelLanguage ?? DEFAULT_LAYER_PREFS.labelLanguage;
  let next = allBooleanLayersOff({ ...DEFAULT_LAYER_PREFS, labelLanguage });

  const hero =
    mode === "conflict" && options?.maritime
      ? MARITIME_HERO_ON
      : mode === "conflict"
      ? CONFLICT_HERO_ON
      : mode === "economy"
        ? ECONOMY_HERO_ON
        : mode === "live"
          ? LIVE_HERO_ON
          : {};

  next = { ...next, ...hero };

  if (options?.ultraLite) {
    next = applyUltraLiteToLayerPrefs(next);
    next = { ...next, ...hero };
    next = applyUltraLiteToLayerPrefs(next);
  }

  const budget = options?.ultraLite
    ? Math.min(FIRST_SCREEN_MAX_LAYERS, activeLayerCap(true))
    : FIRST_SCREEN_MAX_LAYERS;

  return clampPrefsToLimit(next, budget);
}
