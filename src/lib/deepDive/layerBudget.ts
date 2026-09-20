/**
 * 심층(deep dive) 씬 — 레이어는 쌓지 않고 교체.
 * 목표 3 · 소프트 5 · 하드 6 (지정학 MVP 합의).
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import type { LayerPatch } from "@/lib/eventBriefingSession";

export const DEEP_DIVE_LAYER_TARGET = 3;
export const DEEP_DIVE_LAYER_SOFT = 5;
export const DEEP_DIVE_LAYER_HARD = 6;

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/**
 * 지정학 씬에서 우선 살릴 레이어 (가벼운 면·긴장 → 무거운 피드).
 * 앞쪽일수록 심층 씬에 남기기 쉽다.
 */
export const GEOPOLITICS_SCENE_PRIORITY: readonly BooleanLayerKey[] = [
  "showWarZones",
  "showDiplomaticTension",
  "showUkraineControl",
  "showAlliedBlocs",
  "showIslandChains",
  "showEastAsiaAdiz",
  "showChinaTaiwanIncidents",
  "showAxisNetwork",
  "showMilitaryBases",
  "showRokMilitaryBases",
  "showJapanMilitaryBases",
  "showTaiwanMilitaryBases",
  "showGdeltWar",
  "showGdeltProtests",
  "showFirmsFires",
  "showNeptun",
  "showMilitaryActivity",
  "showAis",
  "showAirTraffic",
] as const;

function isBooleanLayerKey(key: string): key is BooleanLayerKey {
  return key !== "labelLanguage";
}

/** patch / prefs에서 true인 키만 */
export function trueLayerKeys(patch: LayerPatch | LayerPrefs): BooleanLayerKey[] {
  const out: BooleanLayerKey[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === true && isBooleanLayerKey(key)) out.push(key);
  }
  return out;
}

/** 우선순위로 정렬 후 상한까지 */
export function pickSceneLayerKeys(
  candidates: BooleanLayerKey[],
  limit: number = DEEP_DIVE_LAYER_TARGET,
  priority: readonly BooleanLayerKey[] = GEOPOLITICS_SCENE_PRIORITY,
): BooleanLayerKey[] {
  const hard = Math.min(Math.max(1, limit), DEEP_DIVE_LAYER_HARD);
  const set = new Set(candidates);
  const ordered: BooleanLayerKey[] = [];
  for (const key of priority) {
    if (set.has(key)) ordered.push(key);
    if (ordered.length >= hard) return ordered;
  }
  for (const key of candidates) {
    if (!ordered.includes(key)) ordered.push(key);
    if (ordered.length >= hard) break;
  }
  return ordered.slice(0, hard);
}

/**
 * 씬 교체: boolean 레이어 전부 OFF → sceneKeys만 ON.
 * labelLanguage 등 비 boolean은 유지.
 */
export function replaceWithSceneLayers(
  base: LayerPrefs,
  sceneKeys: BooleanLayerKey[],
): LayerPrefs {
  const allowed = new Set(
    pickSceneLayerKeys(sceneKeys, DEEP_DIVE_LAYER_HARD),
  );
  const next = { ...base };
  for (const key of Object.keys(next) as Array<keyof LayerPrefs>) {
    if (key === "labelLanguage") continue;
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = allowed.has(
        key as BooleanLayerKey,
      );
    }
  }
  return next;
}

/** concept patch → 심층 씬 prefs (목표 3, 최대 soft까지 허용 시 softLimit) */
export function deepDivePrefsFromPatch(
  base: LayerPrefs,
  patch: LayerPatch,
  limit: number = DEEP_DIVE_LAYER_TARGET,
): { prefs: LayerPrefs; sceneKeys: BooleanLayerKey[] } {
  const sceneKeys = pickSceneLayerKeys(trueLayerKeys(patch), limit);
  return {
    sceneKeys,
    prefs: replaceWithSceneLayers(base, sceneKeys),
  };
}
