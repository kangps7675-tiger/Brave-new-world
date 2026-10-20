/**
 * Dispute hatch path 캐시 — GeoJSON→TransportPath 재생성 비용 완화.
 * 레이어 패널이 열려 있어도 동일 dispute id는 버퍼를 재사용한다.
 */

import type { DisputeArea, TransportPath } from "@/data/geoTypes";
import {
  disputeToOutlineAndHatchPaths,
  type TensionGrade,
} from "@/lib/disputeHatch";

const MAX_CACHE_ENTRIES = 480;

type CacheEntry = {
  paths: TransportPath[];
  touched: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(disputeId: string, preferDetailSegments: boolean, gradeHint?: string) {
  return `${disputeId}|${preferDetailSegments ? "d" : "o"}|${gradeHint ?? ""}`;
}

function touch(entry: CacheEntry) {
  entry.touched = Date.now();
  return entry.paths;
}

function evictIfNeeded() {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const entries = Array.from(cache.entries()).sort((a, b) => a[1].touched - b[1].touched);
  const drop = Math.ceil(MAX_CACHE_ENTRIES * 0.2);
  for (let i = 0; i < drop; i += 1) {
    cache.delete(entries[i][0]);
  }
}

export function getCachedDisputeHatchPaths(
  dispute: DisputeArea,
  options?: { preferDetailSegments?: boolean; grade?: TensionGrade },
): TransportPath[] {
  const preferDetail = options?.preferDetailSegments ?? true;
  const key = cacheKey(dispute.id, preferDetail, options?.grade);
  const hit = cache.get(key);
  if (hit) return touch(hit);

  const paths = disputeToOutlineAndHatchPaths(dispute, {
    preferDetailSegments: preferDetail,
  });
  cache.set(key, { paths, touched: Date.now() });
  evictIfNeeded();
  return paths;
}

export function clearDisputeHatchPathCache() {
  cache.clear();
}

export function disputeHatchCacheSize() {
  return cache.size;
}
