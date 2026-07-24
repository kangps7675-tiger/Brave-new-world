"use client";

import type { TransportPath } from "@/data/geoTypes";
import type { UkraineHatchLod } from "@/lib/ukraineHatchPrecompute";
import { ensureViinaRenderSession } from "@/lib/viinaPrefetch";

export type UkraineHatchPathsPayload = {
  generatedAt: string;
  controlDate: string;
  lodTier: UkraineHatchLod;
  pathCount: number;
  totalPathCount?: number;
  source?: string;
  paths: TransportPath[];
};

const cacheByLod = new Map<UkraineHatchLod, UkraineHatchPathsPayload>();
const inflightByLod = new Map<UkraineHatchLod, Promise<UkraineHatchPathsPayload | null>>();

export function readUkraineHatchPathsCache(
  lod: UkraineHatchLod,
): UkraineHatchPathsPayload | null {
  return cacheByLod.get(lod) ?? null;
}

export function prefetchUkraineHatchPaths(
  lod: UkraineHatchLod,
  options?: { lat?: number; lng?: number; radius?: number; max?: number },
): Promise<UkraineHatchPathsPayload | null> {
  const cached = cacheByLod.get(lod);
  // 전체 캐시가 있으면 재사용 (뷰 필터는 클라에서)
  if (cached?.paths?.length && !options?.lat) {
    return Promise.resolve(cached);
  }

  const existing = inflightByLod.get(lod);
  if (existing && !options?.lat) return existing;

  const params = new URLSearchParams({ lod });
  if (Number.isFinite(options?.lat) && Number.isFinite(options?.lng)) {
    params.set("lat", String(options!.lat));
    params.set("lng", String(options!.lng));
  }
  if (options?.radius) params.set("radius", String(options.radius));
  if (options?.max) params.set("max", String(options.max));

  const request = ensureViinaRenderSession()
    .then(async (ok) => {
      if (!ok) return null;
      const res = await fetch(`/api/render/ukraine-control-paths?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const payload = (await res.json()) as UkraineHatchPathsPayload;
      if (!payload?.paths?.length) return null;
      if (!options?.lat) {
        cacheByLod.set(lod, payload);
      }
      return payload;
    })
    .catch(() => null)
    .finally(() => {
      inflightByLod.delete(lod);
    });

  if (!options?.lat) inflightByLod.set(lod, request);
  return request;
}
