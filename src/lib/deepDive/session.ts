/**
 * 지정학 심층 세션 — 속보 타전 잠금 + 레이어 스냅샷 복원.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import type { LayerPatch } from "@/lib/eventBriefingSession";
import {
  DEEP_DIVE_LAYER_TARGET,
  deepDivePrefsFromPatch,
  pickSceneLayerKeys,
  trueLayerKeys,
} from "@/lib/deepDive/layerBudget";

export type DeepDiveDomain = "conflict" | "economy";

export type DeepDiveKind = "hub" | "friction" | "territorial" | "episode";

export type DeepDiveSession = {
  domain: DeepDiveDomain;
  kind: DeepDiveKind;
  /** hub:navId / friction:id / territorial:id */
  key: string;
  /** 진입 전 prefs — 종료 시 복원 */
  snapshot: LayerPrefs;
  sceneKeys: string[];
  label: string;
  /** L2에서 고른 고리 */
  activeRingId: string | null;
};

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

/** 지정학 심층 중이면 속보·등불 타전·자동 양피지 금지 */
export function deepDiveBlocksFlash(session: DeepDiveSession | null): boolean {
  return session !== null && session.domain === "conflict";
}

export function applyConflictDeepDiveLayers(
  snapshot: LayerPrefs,
  patch: LayerPatch,
  layerLimit: number = DEEP_DIVE_LAYER_TARGET,
): { prefs: LayerPrefs; sceneKeys: BooleanLayerKey[] } {
  return deepDivePrefsFromPatch(snapshot, patch, layerLimit);
}

/** 마찰·영토 에피소드용 기본 씬 (최대 3) */
export const FRICTION_DEEP_DIVE_PATCH: LayerPatch = {
  showWarZones: true,
  showDiplomaticTension: true,
  showAlliedBlocs: true,
};

export const TERRITORIAL_DEEP_DIVE_PATCH: LayerPatch = {
  showWarZones: true,
  showDiplomaticTension: true,
  showIslandChains: true,
};

export function sceneKeysFromPatch(
  patch: LayerPatch,
  limit: number = DEEP_DIVE_LAYER_TARGET,
): BooleanLayerKey[] {
  return pickSceneLayerKeys(trueLayerKeys(patch), limit);
}
