/**
 * 우크라 점령면 해석 — LiveUA 우선, DeepState 폴백(MapLibre).
 * Cesium 경로는 `liveuaOnly: true` — DeepState/정적 JSON 금지.
 */

import { readOccupiedSnapshotForClient } from "@/lib/deepstate/refreshOccupied";
import { emptyOccupiedGeoJson, type OccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";
import { readLiveuaUkraineOccupied } from "@/lib/liveuamap/controlSnapshotStore";

export type UkraineOccupiedResolve = {
  occupied: OccupiedGeoJson;
  source: "liveuamap" | string;
  skipped?: boolean;
  error?: string;
};

export type ResolveUkraineOccupiedOptions = {
  /** true면 LiveUA만 반환. 없으면 empty (DeepState 폴백·워밍 금지). */
  liveuaOnly?: boolean;
};

/** LiveUA D1/메모리 → (liveuaOnly가 아니면) DeepState 3일 스냅샷. */
export async function resolveUkraineOccupied(
  options?: ResolveUkraineOccupiedOptions,
): Promise<UkraineOccupiedResolve> {
  const liveua = await readLiveuaUkraineOccupied();
  if (liveua?.features.length) {
    return {
      occupied: liveua,
      source: "liveuamap",
      skipped: true,
    };
  }

  if (options?.liveuaOnly) {
    return {
      occupied: emptyOccupiedGeoJson(),
      source: "empty",
      error: "LiveUA control polygons unavailable",
    };
  }

  const deepstate = await readOccupiedSnapshotForClient();
  if (deepstate.occupied.features.length) {
    return {
      occupied: deepstate.occupied,
      source: deepstate.source,
      skipped: deepstate.skipped,
      error: deepstate.error,
    };
  }

  return {
    occupied: emptyOccupiedGeoJson(),
    source: "empty",
    error: deepstate.error || "occupied snapshot unavailable",
  };
}
