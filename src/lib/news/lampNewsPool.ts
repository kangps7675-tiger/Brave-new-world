/**
 * 6시간 등불 — 뉴스 풀 og:image 보강 후 기사에 붙은 사진이 있는 것만 선정.
 * 월요일 주간 회고도 동일 사진 데스크 파이프(전주 윈도우).
 */

import { enrichNewsStreamImages } from "@/lib/news/enrichArticleImage";
import { hasLampPhoto } from "@/lib/news/lampThumbnail";
import {
  CONFLICT_LAMP_NEWS_MIN,
  ECONOMY_LAMP_NEWS_MIN,
  ensureLampFeaturedNews,
  pickConflictLampNews,
  pickEconomyLampNews,
  previousIsoWeekRange,
  type LampFeaturedNews,
} from "@/lib/news/periodicBriefing";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

const LAMP_ENRICH_PRIMARY = {
  maxEnrich: 56,
  concurrency: 6,
  timeoutMs: 2_800,
  budgetMs: 14_000,
} as const;

const LAMP_ENRICH_SECONDARY = {
  maxEnrich: 72,
  concurrency: 6,
  timeoutMs: 2_800,
  budgetMs: 10_000,
} as const;

function sortByRecency(items: NewsStreamItem[]): NewsStreamItem[] {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const da = Math.abs(now - Date.parse(a.pubDate || "0"));
    const db = Math.abs(now - Date.parse(b.pubDate || "0"));
    return da - db;
  });
}

/** news-stream 페이로드들을 dedupe 풀로 합침 */
export function collectLampNewsPool(...payloads: NewsStreamPayload[]): NewsStreamItem[] {
  const seen = new Set<string>();
  const out: NewsStreamItem[] = [];
  for (const payload of payloads) {
    const batch: NewsStreamItem[] = [
      ...(payload.hero ? [payload.hero] : []),
      ...(payload.flashHeroes ?? []),
      ...payload.verified,
      ...payload.stateMedia,
    ];
    for (const item of batch) {
      const key = (item.link || item.id).toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** RSS enclosure 우선 → og:image 보강 (등불 전용 예산) */
export async function enrichLampNewsPool(items: NewsStreamItem[]): Promise<NewsStreamItem[]> {
  const byRecency = sortByRecency(items);
  const photoFirst = [
    ...byRecency.filter((i) => hasLampPhoto(i.imageUrl)),
    ...byRecency.filter((i) => !hasLampPhoto(i.imageUrl)),
  ];

  let enriched = await enrichNewsStreamImages(photoFirst, LAMP_ENRICH_PRIMARY);
  const withPhoto = enriched.filter((i) => hasLampPhoto(i.imageUrl)).length;
  if (withPhoto < 8) {
    enriched = await enrichNewsStreamImages(enriched, LAMP_ENRICH_SECONDARY);
  }
  return enriched;
}

export async function buildLampFeaturedFromPool(
  mode: "conflict" | "economy",
  lang: LabelLanguage,
  items: NewsStreamItem[],
): Promise<LampFeaturedNews[]> {
  const enriched = await enrichLampNewsPool(items);
  const langQs = lang === "en" ? "en" : "ko";
  const picked =
    mode === "economy"
      ? pickEconomyLampNews(enriched, ECONOMY_LAMP_NEWS_MIN, langQs)
      : pickConflictLampNews(enriched, CONFLICT_LAMP_NEWS_MIN, langQs);
  return ensureLampFeaturedNews(picked);
}

export async function buildLampFeaturedFromPayloads(
  mode: "conflict" | "economy",
  lang: LabelLanguage,
  payloads: NewsStreamPayload[],
): Promise<LampFeaturedNews[]> {
  return buildLampFeaturedFromPool(mode, lang, collectLampNewsPool(...payloads));
}

/**
 * 전주(지난 ISO 주) pubDate만 — 풀이 너무 작으면 로컬 자정 기준 직전 7일로 완화.
 */
export function filterNewsToPreviousWeek(
  items: NewsStreamItem[],
  now: Date = new Date(),
): NewsStreamItem[] {
  const { startMs, endMs } = previousIsoWeekRange(now);
  const inWeek = items.filter((item) => {
    const t = Date.parse(item.pubDate || "");
    return Number.isFinite(t) && t >= startMs && t < endMs;
  });
  if (inWeek.length >= 6) return inWeek;

  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const softStart = end.getTime() - 7 * 86_400_000;
  const softEnd = end.getTime();
  return items.filter((item) => {
    const t = Date.parse(item.pubDate || "");
    return Number.isFinite(t) && t >= softStart && t < softEnd;
  });
}

/** 월요일 회고 — 전주 핫뉴스 + 기사 사진 (등불과 동일 선정기) */
export async function buildWeeklyRecapFeaturedFromPayloads(
  mode: "conflict" | "economy",
  lang: LabelLanguage,
  payloads: NewsStreamPayload[],
  now: Date = new Date(),
): Promise<LampFeaturedNews[]> {
  const pool = filterNewsToPreviousWeek(collectLampNewsPool(...payloads), now);
  return buildLampFeaturedFromPool(mode, lang, pool);
}
