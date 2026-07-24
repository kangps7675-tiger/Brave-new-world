/**
 * RSS·GDELT 뉴스 스트림 빌드.
 * Telegram OSINT는 절대 포함하지 않음 — @see src/lib/licensing/telegramOsintPolicy.ts
 */
import {
  ALL_NEWS_FEEDS,
  feedsForPackages,
  isEconomyNewsMode,
  isFeedItemRelevant,
  type NewsFeedDef,
} from "@/lib/news/feedCatalog";
import { computeBreakingGrade } from "@/lib/news/breakingGrade";
import { classifyMediaTier } from "@/lib/news/mediaTiers";
import { fetchNewfeedsIranNewsItems } from "@/lib/news/newfeedsIranNews";
import { fetchRssFeed } from "@/lib/news/rssParser";
import type {
  HeroBreakingItem,
  HeroStatus,
  MediaTrustTier,
  NewsFeedTopic,
  NewsStreamItem,
  NewsStreamPayload,
  NewsTheater,
} from "@/lib/news/types";
import type { EconomyNewsGenre } from "@/lib/news/economyGenres";
import type { ViewPackageId } from "@/lib/viewPackages";

const URGENCY =
  /\b(breaking|urgent|just\s?in|live|attack|strike|missile|drone|explosion|war|invasion|ceasefire|nuclear|killed|dead|shelling|airstrike|bomb|blockade|escalat|retaliat|offensive|clash|troops|carrier|hormuz|suez|malacca|bab[\s-]?el[\s-]?mandeb|taiwan\s?strait|panama\s?canal|red\s?sea)\b/i;

const ECON_URGENCY =
  /\b(breaking|surge|plunge|crash|rally|cut|hike|sanction|embargo|blockade|default|bankrupt|strike|shutdown|record\s?high|record\s?low|selloff|soar|tumble|hormuz|suez|malacca|freight|tanker|lng|oil\s?price|brent|wti|red\s?sea|shipping\s?rate)\b/i;

function stableId(title: string, link: string, theater: NewsTheater): string {
  const key = `${theater}:${title.toLowerCase().slice(0, 80)}:${link.slice(0, 60)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return `news-${Math.abs(hash).toString(36)}`;
}

function clusterKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6)
    .sort()
    .join("-");
}

function isValidPubDate(pubDate: string | undefined): boolean {
  if (!pubDate) return false;
  const ts = Date.parse(pubDate);
  return Number.isFinite(ts) && ts <= Date.now() + 3_600_000;
}

const SKIP_URL = /\/live-news\/|\/specials\/|\/videos?\//i;
const SKIP_TITLE = /^(israel|ukraine|russia|iran)$/i;

function parseAgeMinutes(pubDate: string): number {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return 9999;
  return Math.max(0, Math.round((Date.now() - ts) / 60_000));
}

function resolveHeroStatus(
  candidate: NewsStreamItem,
  cluster: NewsStreamItem[],
): HeroStatus {
  const hasTier1 = cluster.some((c) => c.trustTier === 1);
  const hasTier2 = cluster.some((c) => c.trustTier === 2);

  if (candidate.trustTier === 3) {
    if (hasTier1) return "breaking";
    return "unverified";
  }
  if (hasTier1 && cluster.length >= 2) return "confirmed";
  if (candidate.trustTier === 1) return "confirmed";
  if (hasTier1 || hasTier2) return "breaking";
  return "breaking";
}

function isHeroEligible(item: NewsStreamItem): boolean {
  if (item.feedTopic === "economy") {
    return ECON_URGENCY.test(item.title) || item.trustTier <= 2;
  }
  return URGENCY.test(item.title) || item.trustTier === 3;
}

function pickHero(items: NewsStreamItem[]): HeroBreakingItem | null {
  const eligible = items.filter(
    (item) =>
      isValidPubDate(item.pubDate) &&
      !SKIP_URL.test(item.link) &&
      !SKIP_TITLE.test(item.title.trim()) &&
      isHeroEligible(item),
  );
  if (eligible.length === 0) return null;

  const clusters = new Map<string, NewsStreamItem[]>();
  for (const item of eligible) {
    const key = clusterKey(item.title);
    const list = clusters.get(key) || [];
    list.push(item);
    clusters.set(key, list);
  }

  let best: HeroBreakingItem | null = null;

  for (const item of eligible) {
    const key = clusterKey(item.title);
    const cluster = clusters.get(key) || [item];
    const ageMinutes = parseAgeMinutes(item.pubDate);
    const graded = computeBreakingGrade(item, cluster, ageMinutes);
    const heroStatus = resolveHeroStatus(item, cluster);

    const entry: HeroBreakingItem = {
      ...item,
      heroStatus,
      urgencyScore: graded.urgencyScore,
      breakingGrade: graded.grade,
      breakingRank: graded.rank,
      ageMinutes,
      clusterId: key,
    };

    if (
      !best ||
      entry.breakingGrade > best.breakingGrade ||
      (entry.breakingGrade === best.breakingGrade && entry.urgencyScore > best.urgencyScore)
    ) {
      best = entry;
    }
  }

  // Prefer Tier1 headline when cluster has confirmation
  if (best?.clusterId) {
    const cluster = clusters.get(best.clusterId) || [];
    const tier1 = cluster
      .filter((c) => c.trustTier === 1)
      .sort((a, b) => parseAgeMinutes(a.pubDate) - parseAgeMinutes(b.pubDate))[0];
    if (tier1 && best.heroStatus !== "unverified") {
      const graded = computeBreakingGrade(tier1, cluster, parseAgeMinutes(tier1.pubDate));
      best = {
        ...best,
        title: tier1.title,
        link: tier1.link,
        source: tier1.source,
        publisher: tier1.publisher,
        pubDate: tier1.pubDate,
        trustTier: tier1.trustTier,
        heroStatus: "confirmed",
        urgencyScore: graded.urgencyScore,
        breakingGrade: graded.grade,
        breakingRank: graded.rank,
        ageMinutes: parseAgeMinutes(tier1.pubDate),
      };
    }
  }

  return best;
}

function sortByRecency(items: NewsStreamItem[]): NewsStreamItem[] {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const da = Math.abs(now - Date.parse(a.pubDate || "0"));
    const db = Math.abs(now - Date.parse(b.pubDate || "0"));
    return da - db;
  });
}

export type BuildNewsStreamOptions = {
  packages?: ViewPackageId[];
};

export async function buildNewsStream(
  options: BuildNewsStreamOptions = {},
): Promise<NewsStreamPayload> {
  const feeds = options.packages ? feedsForPackages(options.packages) : ALL_NEWS_FEEDS;
  const economyOnly = Boolean(options.packages && isEconomyNewsMode(options.packages));
  const [results, newfeedsIran] = await Promise.all([
    mapPool(feeds, fetchFeedItems, 10),
    // 지경학 전용 스트림에는 이란 NewFeeds(defense)를 섞지 않음
    economyOnly ? Promise.resolve([]) : fetchNewfeedsIranNewsItems(30),
  ]);
  const merged = [...results.flat(), ...newfeedsIran];

  const seen = new Set<string>();
  const deduped = merged.filter((item) => {
    const key = item.title.toLowerCase().trim().slice(0, 72);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const verified = sortByRecency(deduped.filter((i) => i.trustTier <= 2));
  const stateMedia = sortByRecency(deduped.filter((i) => i.trustTier === 3));
  const heroCandidates = deduped.filter((i) => parseAgeMinutes(i.pubDate) <= 1_440);
  const hero = pickHero(heroCandidates.length > 0 ? heroCandidates : deduped.slice(0, 40));

  const theaters = {} as Record<NewsTheater, number>;
  for (const item of deduped) {
    theaters[item.theater] = (theaters[item.theater] || 0) + 1;
  }

  return {
    fetchedAt: new Date().toISOString(),
    hero,
    verified: verified.slice(0, 80),
    stateMedia: stateMedia.slice(0, 40),
    stats: {
      total: deduped.length,
      tier1: deduped.filter((i) => i.trustTier === 1).length,
      tier2: deduped.filter((i) => i.trustTier === 2).length,
      tier3: deduped.filter((i) => i.trustTier === 3).length,
      economy: deduped.filter((i) => i.feedTopic === "economy").length,
      theaters,
      genres: countEconomyGenres(deduped),
    },
  };
}

function countEconomyGenres(
  items: NewsStreamItem[],
): Partial<Record<EconomyNewsGenre, number>> {
  const out: Partial<Record<EconomyNewsGenre, number>> = {};
  for (const item of items) {
    if (item.feedTopic !== "economy") continue;
    const g = item.econGenre ?? "markets";
    out[g] = (out[g] ?? 0) + 1;
  }
  return out;
}

export function tierBadgeLabel(tier: MediaTrustTier): string {
  if (tier === 1) return "Tier 1";
  if (tier === 2) return "Tier 2";
  return "Tier 3";
}

async function fetchFeedItems(feed: NewsFeedDef): Promise<NewsStreamItem[]> {
  const raw = await fetchRssFeed(feed.url);
  return raw
    .filter((item) => isFeedItemRelevant(item.title, item.category, feed))
    .filter((item) => isValidPubDate(item.pubDate))
    .filter((item) => !SKIP_URL.test(item.link))
    .filter((item) => !SKIP_TITLE.test(item.title.trim()))
    .map((item) => {
      const publisher = item.publisher || item.title.match(/- ([^-]+)$/)?.[1];
      const source = publisher || feed.name;
      const trustTier = classifyMediaTier(source, item.link);
      const feedTopic: NewsFeedTopic = feed.topic ?? "defense";
      return {
        id: stableId(item.title, item.link, feed.theater),
        title: item.title,
        link: item.link,
        source,
        publisher: item.publisher,
        pubDate: item.pubDate!,
        theater: feed.theater,
        trustTier,
        feedTopic,
        econGenre: feedTopic === "economy" ? feed.econGenre ?? "markets" : undefined,
        category: item.category,
        imageUrl: item.imageUrl,
        summary: item.summary,
      } satisfies NewsStreamItem;
    });
}

async function mapPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await worker(items[current]);
      } catch {
        results[current] = [] as R;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}
