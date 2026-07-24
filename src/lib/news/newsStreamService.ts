import { buildNewsStream } from "@/lib/news/pipeline";
import {
  ensureKoreanNewsPayload,
  translateNewsStreamPayload,
} from "@/lib/news/translateNews";
import {
  NEWS_D1_TTL_MS,
  readNewsStreamFromD1,
  writeNewsStreamToD1,
} from "@/lib/news/d1NewsSnapshots";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import type { ViewPackageId } from "@/lib/viewPackages";

export const NEWS_MEMORY_TTL_MS = 90_000;

export const VALID_NEWS_PACKAGES = new Set<ViewPackageId>([
  "conflict-watch",
  "geo-trader",
  "frontline-live",
  "custom",
]);

const memoryCache = new Map<string, { at: number; payload: NewsStreamPayload }>();

export function parsePackagesParam(raw: string | null): ViewPackageId[] | undefined {
  if (!raw) return undefined;
  const parsed = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is ViewPackageId => VALID_NEWS_PACKAGES.has(part as ViewPackageId));
  return parsed.length > 0 ? parsed : undefined;
}

export function parseLangParam(raw: string | null): LabelLanguage {
  return raw === "en" ? "en" : "ko";
}

export function newsCacheKey(packages?: ViewPackageId[], lang: LabelLanguage = "ko"): string {
  const pkg = packages?.length ? packages.join(",") : "default";
  return `${pkg}:${lang}`;
}

export function emptyNewsPayload(message: string): NewsStreamPayload {
  return {
    fetchedAt: new Date().toISOString(),
    hero: null,
    verified: [],
    stateMedia: [],
    stats: {
      total: 0,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      economy: 0,
      theaters: {} as Record<NewsTheater, number>,
    },
    error: message,
  };
}

export function readNewsMemoryCache(cacheKey: string): NewsStreamPayload | null {
  const hit = memoryCache.get(cacheKey);
  if (!hit) return null;
  if (Date.now() - hit.at >= NEWS_MEMORY_TTL_MS) return null;
  return hit.payload;
}

export function writeNewsMemoryCache(cacheKey: string, payload: NewsStreamPayload) {
  memoryCache.set(cacheKey, { at: Date.now(), payload });
}

/** RSS 빌드 → 번역 → 메모리 + D1 write-through */
export async function buildAndCacheNewsStream(options: {
  packages?: ViewPackageId[];
  lang: LabelLanguage;
}): Promise<NewsStreamPayload> {
  const key = newsCacheKey(options.packages, options.lang);
  const payload = await translateNewsStreamPayload(
    await buildNewsStream({ packages: options.packages }),
    options.lang,
  );
  writeNewsMemoryCache(key, payload);
  void writeNewsStreamToD1({
    cacheKey: key,
    packages: options.packages?.join(",") ?? null,
    lang: options.lang,
    payload,
  });
  return payload;
}

export type ResolveNewsStreamResult = {
  payload: NewsStreamPayload;
  source: "memory" | "d1" | "live";
  ageMs?: number;
};

/** 메모리 → D1 → live 순으로 뉴스 페이로드 확보 */
export async function resolveNewsStream(options: {
  packages?: ViewPackageId[];
  lang: LabelLanguage;
  preferLive?: boolean;
}): Promise<ResolveNewsStreamResult> {
  const key = newsCacheKey(options.packages, options.lang);

  if (!options.preferLive) {
    const mem = readNewsMemoryCache(key);
    if (mem) {
      const payload =
        options.lang === "ko" ? await ensureKoreanNewsPayload(mem) : mem;
      if (payload !== mem) writeNewsMemoryCache(key, payload);
      return { payload, source: "memory" };
    }

    const fromD1 = await readNewsStreamFromD1(key, NEWS_D1_TTL_MS);
    if (fromD1?.payload) {
      const payload =
        options.lang === "ko"
          ? await ensureKoreanNewsPayload(fromD1.payload)
          : fromD1.payload;
      writeNewsMemoryCache(key, payload);
      return { payload, source: "d1", ageMs: fromD1.ageMs };
    }
  }

  const payload = await buildAndCacheNewsStream({
    packages: options.packages,
    lang: options.lang,
  });
  return { payload, source: "live" };
}
