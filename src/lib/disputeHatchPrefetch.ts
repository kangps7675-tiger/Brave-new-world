"use client";

import type { TransportPath } from "@/data/geoTypes";
import type { DisputeHatchLod } from "@/lib/disputeHatchPrecompute";

export type DisputeHatchPathsPayload = {
  generatedAt: string;
  lodTier: DisputeHatchLod;
  pathCount: number;
  pathDisputeIds?: Record<string, string>;
  paths: TransportPath[];
};

const cacheByLod = new Map<DisputeHatchLod, DisputeHatchPathsPayload>();
const inflight = new Map<DisputeHatchLod, Promise<DisputeHatchPathsPayload | null>>();

export function readDisputeHatchPathsCache(lod: DisputeHatchLod) {
  return cacheByLod.get(lod) ?? null;
}

export function prefetchDisputeHatchPaths(
  lod: DisputeHatchLod,
): Promise<DisputeHatchPathsPayload | null> {
  const hit = cacheByLod.get(lod);
  if (hit?.paths?.length) return Promise.resolve(hit);
  const pending = inflight.get(lod);
  if (pending) return pending;

  const request = fetch(`/api/render/dispute-paths?lod=${lod}`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const payload = (await res.json()) as DisputeHatchPathsPayload;
      if (!payload?.paths?.length) return null;
      cacheByLod.set(lod, payload);
      return payload;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(lod);
    });

  inflight.set(lod, request);
  return request;
}
