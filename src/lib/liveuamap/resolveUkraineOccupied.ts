/**
 * 우크라 점령면 — LiveUAMap만 사용 (DeepState/정적 JSON 폴백 없음).
 */

import { emptyOccupiedGeoJson, type OccupiedGeoJson } from "@/lib/deepstate/toOccupiedGeoJson";
import { readLiveuaUkraineOccupied } from "@/lib/liveuamap/controlSnapshotStore";

export type UkraineOccupiedResolve = {
  occupied: OccupiedGeoJson;
  source: "liveuamap" | "empty" | string;
  skipped?: boolean;
  error?: string;
};

/** @deprecated LiveUA 전용 — DeepState 폴백 없음. 호환용 타입만 유지. */
export type ResolveUkraineOccupiedOptions = {
  liveuaOnly?: boolean;
};

/** LiveUA D1/메모리 통제면만. 없으면 empty. */
export async function resolveUkraineOccupied(): Promise<UkraineOccupiedResolve> {
  const liveua = await readLiveuaUkraineOccupied();
  if (liveua?.features.length) {
    return {
      occupied: liveua,
      source: "liveuamap",
      skipped: true,
    };
  }

  return {
    occupied: emptyOccupiedGeoJson(),
    source: "empty",
    error: "LiveUA control polygons unavailable",
  };
}
