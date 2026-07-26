import fs from "fs";
import path from "path";
import { getDataCdnBase, getServerDataProfile, isApiStubMode } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";

/**
 * 정적 기초 JSON — 클라우드(CDN/R2) 우선, 로컬 public/data 폴백.
 * 유저/서버는 디스크 대신 이 로더만 쓰면 된다.
 */

const memoryCache = new Map<string, unknown>();

export function cloudDataObjectKey(
  fileName: string,
  profile: DataProfile = getServerDataProfile(),
): string {
  const safe = path.basename(fileName);
  return `data/${profile}/${safe}`;
}

export function cloudDataPublicUrl(
  fileName: string,
  profile: DataProfile = getServerDataProfile(),
): string | null {
  const cdn = getDataCdnBase();
  if (!cdn) return null;
  return `${cdn}/${cloudDataObjectKey(fileName, profile)}`;
}

function readFsJson<T>(fileName: string, profile: DataProfile): T | null {
  const safe = path.basename(fileName);
  const root = process.cwd();
  const candidates = [
    path.join(root, "public", "data", profile, safe),
    path.join(root, "public", "data", safe),
  ];
  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    } catch {
      // next
    }
  }
  return null;
}

async function fetchCdnJson<T>(
  fileName: string,
  profile: DataProfile,
): Promise<T | null> {
  const url = cloudDataPublicUrl(fileName, profile);
  if (!url) return null;
  try {
    const res = await fetch(url, {
      cache: "force-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type R2BucketLike = {
  get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
};

async function readR2Json<T>(
  fileName: string,
  profile: DataProfile,
): Promise<T | null> {
  try {
    let bucket: R2BucketLike | undefined;

    try {
      // OpenNext Cloudflare (패키지 있을 때만) — 문자열 조립으로 tsc 모듈 해석 회피
      const specifier = ["@opennextjs", "cloudflare"].join("/");
      const mod = (await import(/* webpackIgnore: true */ specifier)) as {
        getCloudflareContext?: () => Promise<{ env?: { DATA_BUCKET?: R2BucketLike } }>;
      };
      const ctx = await mod.getCloudflareContext?.();
      bucket = ctx?.env?.DATA_BUCKET;
    } catch {
      // package optional
    }

    if (!bucket) {
      const g = globalThis as unknown as {
        DATA_BUCKET?: R2BucketLike;
        env?: { DATA_BUCKET?: R2BucketLike };
      };
      bucket = g.DATA_BUCKET || g.env?.DATA_BUCKET;
    }
    if (!bucket?.get) return null;
    const key = cloudDataObjectKey(fileName, profile);
    const obj = await bucket.get(key);
    if (!obj) return null;
    return JSON.parse(await obj.text()) as T;
  } catch {
    return null;
  }
}

/**
 * 프로필 데이터 JSON 로드 (CDN → R2 → 로컬 fs).
 * 결과는 프로세스 메모리에 캐시.
 */
export async function loadCloudStaticJson<T>(
  fileName: string,
  profile?: DataProfile,
): Promise<T | null> {
  const resolved = profile ?? getServerDataProfile();
  const safe = path.basename(fileName);
  const cacheKey = `${resolved}:${safe}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) as T;
  }

  // stub/로컬 개발: public/data 재빌드가 CDN보다 먼저 보이게
  if (isApiStubMode()) {
    const fromFs = readFsJson<T>(safe, resolved);
    if (fromFs != null) {
      memoryCache.set(cacheKey, fromFs);
      return fromFs;
    }
  }

  // CDN이 404/빈 배열이면 로컬 public/data 폴백 (subsea-pipelines 등 CDN 미업로드 대응)
  const fromCdn = await fetchCdnJson<T>(safe, resolved);
  if (fromCdn != null && !(Array.isArray(fromCdn) && fromCdn.length === 0)) {
    memoryCache.set(cacheKey, fromCdn);
    return fromCdn;
  }

  const fromR2 = await readR2Json<T>(safe, resolved);
  if (fromR2 != null && !(Array.isArray(fromR2) && fromR2.length === 0)) {
    memoryCache.set(cacheKey, fromR2);
    return fromR2;
  }

  const fromFs = readFsJson<T>(safe, resolved);
  if (fromFs != null) {
    memoryCache.set(cacheKey, fromFs);
    return fromFs;
  }

  // CDN이 빈 배열만 준 경우에도 그걸 쓰기보다 null
  if (fromCdn != null) {
    memoryCache.set(cacheKey, fromCdn);
    return fromCdn;
  }
  if (fromR2 != null) {
    memoryCache.set(cacheKey, fromR2);
    return fromR2;
  }

  return null;
}

/** 테스트/리로드용 */
export function clearCloudStaticJsonCache() {
  memoryCache.clear();
}
