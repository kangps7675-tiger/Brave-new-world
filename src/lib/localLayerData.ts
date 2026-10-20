import type { ArmsEmbargoZone, StaticPoint } from "@/data/geoTypes";
import { expandStaticPoints } from "@/lib/compactData";
import { loadCloudStaticJson } from "@/lib/cloudStaticJson";

/** 정적 포인트 레이어 — CDN/R2/로컬 */
export async function loadLocalStaticPoints(fileName: string): Promise<StaticPoint[]> {
  const raw = await loadCloudStaticJson<unknown[]>(fileName);
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return expandStaticPoints(raw as Parameters<typeof expandStaticPoints>[0]);
}

export async function loadLocalArmsEmbargoZones(): Promise<ArmsEmbargoZone[]> {
  const raw = await loadCloudStaticJson<ArmsEmbargoZone[]>("arms-embargo-zones.json");
  return Array.isArray(raw) ? raw : [];
}

/**
 * 최상위가 배열이 아닌 정적 JSON (객체 페이로드) 로더.
 * GTA 처럼 `{ interventions: [...] , attribution }` 형태인 레이어에 쓴다.
 */
export async function loadLocalJson<T>(fileName: string): Promise<T | null> {
  const raw = await loadCloudStaticJson<T>(fileName);
  return raw ?? null;
}
