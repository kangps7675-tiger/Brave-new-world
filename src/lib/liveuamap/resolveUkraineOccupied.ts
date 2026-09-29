/**
 * 우크라 점령면 해석 — LiveUA 우선, DeepState 폴백.
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

/** LiveUA D1/메모리 → 없으면 DeepState 3일 스냅샷(필요 시 갱신). */
export async function resolveUkraineOccupied(): Promise<UkraineOccupiedResolve> {
  const liveua = await readLiveuaUkraineOccupied();
  if (liveua?.features.length) {
    return {
      occupied: liveua,
      source: "liveuamap",
      skipped: true,
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
