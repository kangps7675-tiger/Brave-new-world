/**
 * 렌더 티어 — GPU·모션·코어 수에 따른 시각 효과 강등 (P1-3 / P2-2 공유).
 *
 * - static: WebGL 셰이더 끔 (reduced-motion · 저코어)
 * - low: fbm 옥타브 축소 (phone)
 * - full: 기본
 */

import { prefersReducedMotion } from "@/hooks/useReducedMotion";

export type RenderTier = "static" | "low" | "full";

export type LoadingShaderPlan = {
  tier: RenderTier;
  /** 로딩 셰이더 실행 여부 */
  useShader: boolean;
  /** fbm 옥타브 (2 | 4). useShader=false면 무시 */
  fbmOctaves: 2 | 4;
};

let cachedPlan: LoadingShaderPlan | null = null;

function deviceHintPhone(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.documentElement.getAttribute("data-device") === "phone";
  } catch {
    return false;
  }
}

function hardwareConcurrency(): number {
  if (typeof navigator === "undefined") return 8;
  const n = navigator.hardwareConcurrency;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 8;
}

/**
 * 로딩/부팅용 셰이더 강등 계획.
 * 결과는 세션 동안 캐시(기기 프로파일은 boot 시 고정).
 */
export function getLoadingShaderPlan(forceRefresh = false): LoadingShaderPlan {
  if (cachedPlan && !forceRefresh) return cachedPlan;

  if (prefersReducedMotion()) {
    cachedPlan = { tier: "static", useShader: false, fbmOctaves: 2 };
    return cachedPlan;
  }

  const cores = hardwareConcurrency();
  if (cores <= 4) {
    cachedPlan = { tier: "static", useShader: false, fbmOctaves: 2 };
    return cachedPlan;
  }

  if (deviceHintPhone()) {
    cachedPlan = { tier: "low", useShader: true, fbmOctaves: 2 };
    return cachedPlan;
  }

  cachedPlan = { tier: "full", useShader: true, fbmOctaves: 4 };
  return cachedPlan;
}

/** @internal tests */
export function resetLoadingShaderPlanCache(): void {
  cachedPlan = null;
}
