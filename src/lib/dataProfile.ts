import type { DataProfile } from "@/lib/runtimeConfig.types";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";

export type { DataProfile } from "@/lib/runtimeConfig.types";

/** 클라이언트 런타임 설정 — 서버는 getServerDataProfile() 사용 */
export function getDataProfile(): DataProfile {
  return getRuntimeConfig().dataProfile;
}

/** 앱 origin의 public/data 경로 (CDN 미사용) */
export function localDataPath(relativePath: string): string {
  const profile = getDataProfile();
  const normalized = relativePath.replace(/^\//, "");
  return `/data/${profile}/${normalized}`;
}

/**
 * 프로필별 JSON 경로 — CDN 있으면 CDN, 없으면 /data/{profile}/…
 * CDN 미업로드(404) 대비로는 `dataCandidateUrls` / `fetchDataWithFallback` 사용.
 */
export function dataPath(relativePath: string): string {
  const normalized = relativePath.replace(/^\//, "");
  const local = localDataPath(normalized);
  const cdn = getRuntimeConfig().dataCdnBase?.replace(/\/$/, "");
  if (!cdn) return local;
  const profile = getDataProfile();
  return `${cdn}/data/${profile}/${normalized}`;
}

/** CDN 우선, 실패 시 로컬 public — 같은 파일이면 한 개만 */
export function dataCandidateUrls(relativePath: string): string[] {
  const normalized = relativePath.replace(/^\//, "");
  const local = localDataPath(normalized);
  const primary = dataPath(normalized);
  if (primary === local) return [local];
  return [primary, local];
}

/**
 * CDN → 로컬 순으로 fetch. CDN에 없는 신규 정적 파일(예: axis-hub-countries) 대비.
 */
export async function fetchDataWithFallback(
  relativePath: string,
  init?: RequestInit,
): Promise<Response> {
  const urls = dataCandidateUrls(relativePath);
  let last: Response | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      last = res;
    } catch {
      // try next
    }
  }
  return last ?? new Response(null, { status: 404, statusText: "Not Found" });
}

export function isFullDataProfile(): boolean {
  return getDataProfile() === "full";
}
