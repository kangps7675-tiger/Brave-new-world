import { buildVideoNewsStream } from "@/lib/news/videoPipeline";
import {
  VIDEO_NEWS_D1_TTL_MS,
  readVideoNewsFromD1,
  writeVideoNewsToD1,
} from "@/lib/news/d1VideoNewsSnapshots";
import {
  ensureKoreanVideoPayload,
  translateVideoNewsPayload,
} from "@/lib/news/translateVideoNews";
import { videoTopicForPackages } from "@/lib/news/videoFeedCatalog";
import type { VideoNewsPayload, VideoNewsTopic } from "@/lib/news/videoTypes";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewPackageId } from "@/lib/viewPackages";
import { parseLangParam, parsePackagesParam } from "@/lib/news/newsStreamService";
import { isApiStubMode } from "@/lib/apiStubMode";

export { parseLangParam, parsePackagesParam };

/** 메모리 TTL — 텍스트 뉴스(90s)보다 길게 */
export const VIDEO_NEWS_MEMORY_TTL_MS = 5 * 60_000;

/** 서버 상한 (클라 liveRenderGuard와 동일 철학) */
export function videoNewsServerFetchMax(): number {
  return isApiStubMode() ? 24 : 12;
}

const memoryCache = new Map<string, { at: number; payload: VideoNewsPayload }>();

export function videoNewsCacheKey(
  topic: VideoNewsTopic,
  lang: LabelLanguage = "ko",
): string {
  return `video:${topic}:${lang}`;
}

export function emptyVideoPayload(
  topic: VideoNewsTopic,
  message?: string,
): VideoNewsPayload {
  return {
    fetchedAt: new Date().toISOString(),
    topic,
    items: [],
    stats: { total: 0, sources: 0 },
    waiting: true,
    error: message,
  };
}

export function readVideoMemoryCache(cacheKey: string): VideoNewsPayload | null {
  const hit = memoryCache.get(cacheKey);
  if (!hit) return null;
  if (Date.now() - hit.at >= VIDEO_NEWS_MEMORY_TTL_MS) return null;
  return hit.payload;
}

export function writeVideoMemoryCache(cacheKey: string, payload: VideoNewsPayload) {
  memoryCache.set(cacheKey, { at: Date.now(), payload });
}

export async function buildAndCacheVideoNews(options: {
  topic: VideoNewsTopic;
  lang: LabelLanguage;
  packages?: ViewPackageId[];
  max?: number;
}): Promise<VideoNewsPayload> {
  const key = videoNewsCacheKey(options.topic, options.lang);
  const max = options.max ?? videoNewsServerFetchMax();
  const payload = await translateVideoNewsPayload(
    await buildVideoNewsStream({ topic: options.topic, max }),
    options.lang,
  );
  writeVideoMemoryCache(key, payload);
  void writeVideoNewsToD1({
    cacheKey: key,
    topic: options.topic,
    lang: options.lang,
    packages: options.packages?.join(",") ?? null,
    payload,
  });
  return payload;
}

export type ResolveVideoNewsResult = {
  payload: VideoNewsPayload;
  source: "memory" | "d1" | "live";
  ageMs?: number;
};

export async function resolveVideoNews(options: {
  packages?: ViewPackageId[];
  lang: LabelLanguage;
  preferLive?: boolean;
  max?: number;
}): Promise<ResolveVideoNewsResult> {
  const topic = videoTopicForPackages(options.packages);
  const key = videoNewsCacheKey(topic, options.lang);

  if (!options.preferLive) {
    const mem = readVideoMemoryCache(key);
    if (mem) {
      const payload =
        options.lang === "ko" ? await ensureKoreanVideoPayload(mem) : mem;
      if (payload !== mem) writeVideoMemoryCache(key, payload);
      return { payload: { ...payload, source: "memory" }, source: "memory" };
    }

    const fromD1 = await readVideoNewsFromD1(key, VIDEO_NEWS_D1_TTL_MS);
    if (fromD1?.payload) {
      const payload =
        options.lang === "ko"
          ? await ensureKoreanVideoPayload(fromD1.payload)
          : fromD1.payload;
      writeVideoMemoryCache(key, payload);
      return { payload: { ...payload, source: "d1" }, source: "d1", ageMs: fromD1.ageMs };
    }
  }

  const payload = await buildAndCacheVideoNews({
    topic,
    lang: options.lang,
    packages: options.packages,
    max: options.max,
  });
  return { payload, source: "live" };
}

export function resolveTopicFromPackages(packages?: ViewPackageId[]): VideoNewsTopic {
  return videoTopicForPackages(packages);
}
