import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { assignGdeltTheme, assignRssTheme } from "./assignTheme";
import { cameraForGdeltFocus, cameraForRssItem, cameraForTopic } from "./camera";
import { marketHintForTheme } from "./marketAssets";
import {
  avgGdeltTension,
  computeThemeHeat,
  densityBadgeFromGdelt,
  filterGdeltLast24h,
  heatLabel,
  rssIndependentKeys,
  trustBadgeFromRss,
} from "./heat";
import {
  catalystStepBody,
  gdeltDensityStepBody,
  macroRssDisplayTitle,
  rssClusterStepBody,
  topicLeadTitle,
} from "./narrative";
import { candidateThemeIds, parseMacroThemeId } from "./themes";
import type {
  MacroBriefingPayload,
  MacroDomain,
  MacroGdeltInputEvent,
  MacroRssInputItem,
  MacroStep,
  MacroThemeId,
  MacroTopic,
} from "./types";

const TOP_N = 5;
const MAX_STEPS = 5;

type Bucket = {
  themeId: MacroThemeId;
  rss: MacroRssInputItem[];
  gdelt: MacroGdeltInputEvent[];
};

function emptyBuckets(domain: MacroDomain): Map<MacroThemeId, Bucket> {
  const map = new Map<MacroThemeId, Bucket>();
  for (const id of candidateThemeIds(domain)) {
    map.set(id, { themeId: id, rss: [], gdelt: [] });
  }
  return map;
}

function clusterKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\uac00-\ud7a3\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .sort()
    .join("-");
}

function sortRssByUrgency(items: MacroRssInputItem[]): MacroRssInputItem[] {
  return [...items].sort((a, b) => {
    const ua = a.urgencyScore ?? (a.breakingGrade ?? 0) * 10;
    const ub = b.urgencyScore ?? (b.breakingGrade ?? 0) * 10;
    if (ub !== ua) return ub - ua;
    return (a.ageMinutes ?? 9999) - (b.ageMinutes ?? 9999);
  });
}

function buildSteps(
  bucket: Bucket,
  lang: LabelLanguage,
): MacroStep[] {
  const steps: MacroStep[] = [];
  const sorted = sortRssByUrgency(bucket.rss);
  const indep = rssIndependentKeys(bucket.rss);
  const trust = trustBadgeFromRss(bucket.rss);
  const gdelt24 = filterGdeltLast24h(bucket.gdelt);
  const dens = densityBadgeFromGdelt(gdelt24.length, avgGdeltTension(gdelt24));
  const gdeltCam = cameraForGdeltFocus(gdelt24, bucket.themeId, bucket.rss);

  if (sorted[0]) {
    const item = sorted[0];
    const displayTitle = macroRssDisplayTitle(item, lang);
    steps.push({
      id: `${bucket.themeId}:catalyst`,
      kind: "rss-catalyst",
      body: catalystStepBody(item, bucket.themeId, lang),
      headline: displayTitle,
      sources: [
        {
          title: displayTitle,
          url: item.link,
          source: item.source,
          trustTier: item.trustTier,
        },
      ],
      trustBadge: trust,
      densityBadge: null,
      camera: cameraForRssItem(item, bucket.themeId),
    });
  }

  if (sorted.length >= 2 && indep.length >= 2 && trust) {
    const sample = sorted[1] ?? sorted[0];
    const sampleTitle = macroRssDisplayTitle(sample, lang);
    const sources = sorted.slice(0, 4).map((item) => ({
      title: macroRssDisplayTitle(item, lang),
      url: item.link,
      source: item.source,
      trustTier: item.trustTier,
    }));
    // dedupe by host
    const seen = new Set<string>();
    const uniqueSources = sources.filter((s) => {
      const k = uniqueSourceKey(s.source, s.url);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    steps.push({
      id: `${bucket.themeId}:rss-cluster`,
      kind: "rss-cluster",
      body: rssClusterStepBody({
        themeId: bucket.themeId,
        independentSources: indep.length,
        sampleTitle,
        trust,
        lang,
      }),
      headline: sampleTitle,
      sources: uniqueSources,
      trustBadge: trust,
      densityBadge: null,
      camera: cameraForRssItem(sample, bucket.themeId),
    });
  }

  if (gdelt24.length > 0 && dens !== "none") {
    const gdeltSources = gdelt24
      .filter((e) => e.sourceUrl)
      .slice(0, 3)
      .map((e) => ({
        title: (e.title || "GDELT event").slice(0, 120),
        url: e.sourceUrl!,
        source: "GDELT",
        trustTier: null,
      }));
    steps.push({
      id: `${bucket.themeId}:gdelt`,
      kind: "gdelt-density",
      body: gdeltDensityStepBody({
        themeId: bucket.themeId,
        count: gdelt24.length,
        density: dens,
        lang,
        hasRss: sorted.length > 0,
      }),
      headline: null,
      sources: gdeltSources,
      trustBadge: null,
      densityBadge: dens,
      camera: gdeltCam,
    });
  }

  // 추가 RSS 클러스터 키별 (미시 → 단계만)
  const byCluster = new Map<string, MacroRssInputItem[]>();
  for (const item of sorted.slice(1)) {
    const key = clusterKey(item.title);
    if (!key) continue;
    const list = byCluster.get(key) ?? [];
    list.push(item);
    byCluster.set(key, list);
  }
  for (const [, group] of byCluster) {
    if (steps.length >= MAX_STEPS) break;
    if (group.length < 2) continue;
    const head = group[0];
    const headTitle = macroRssDisplayTitle(head, lang);
    steps.push({
      id: `${bucket.themeId}:micro:${clusterKey(head.title)}`,
      kind: "rss-cluster",
      body: rssClusterStepBody({
        themeId: bucket.themeId,
        independentSources: rssIndependentKeys(group).length,
        sampleTitle: headTitle,
        trust: trustBadgeFromRss(group) ?? "single-source",
        lang,
      }),
      headline: headTitle,
      sources: group.slice(0, 3).map((item) => ({
        title: macroRssDisplayTitle(item, lang),
        url: item.link,
        source: item.source,
        trustTier: item.trustTier,
      })),
      trustBadge: trustBadgeFromRss(group),
      densityBadge: null,
      camera: cameraForRssItem(head, bucket.themeId),
    });
  }

  return steps.slice(0, MAX_STEPS);
}

function bucketToTopic(
  bucket: Bucket,
  domain: MacroDomain,
  lang: LabelLanguage,
): MacroTopic | null {
  const gdelt24 = filterGdeltLast24h(bucket.gdelt);
  const rssIndep = rssIndependentKeys(bucket.rss).length;
  const heat = computeThemeHeat(bucket.rss, gdelt24);
  if (heat <= 0) return null;

  // 승격: RSS ≥1 또는 GDELT 밀도 elevated+
  const dens = densityBadgeFromGdelt(gdelt24.length, avgGdeltTension(gdelt24));
  if (rssIndep < 1 && dens === "none") return null;

  const steps = buildSteps(bucket, lang);
  if (steps.length === 0) return null;

  const topRss = sortRssByUrgency(bucket.rss)[0];
  const catalyst = topRss ? macroRssDisplayTitle(topRss, lang) : null;
  const { kind } = parseMacroThemeId(bucket.themeId);
  const surging = dens === "surge" || dens === "high";
  const market = marketHintForTheme(bucket.themeId, lang);
  const marketAgeMinutes =
    topRss?.ageMinutes != null && Number.isFinite(topRss.ageMinutes)
      ? Math.max(0, Math.round(topRss.ageMinutes))
      : topRss?.pubDate
        ? Math.max(
            0,
            Math.round((Date.now() - new Date(topRss.pubDate).getTime()) / 60_000),
          )
        : null;

  return {
    id: bucket.themeId,
    kind,
    domain,
    title: topicLeadTitle(bucket.themeId, domain, lang, catalyst),
    heat,
    rssIndependentSources: rssIndep,
    gdeltEventCount24h: gdelt24.length,
    trustBadge: trustBadgeFromRss(bucket.rss),
    densityBadge: dens,
    heatLabel: heatLabel({
      rssIndependent: rssIndep,
      gdeltCount: gdelt24.length,
      lang,
      surging,
    }),
    steps,
    camera: cameraForTopic(bucket.themeId, topRss ?? null, gdelt24, bucket.rss),
    marketSymbols: market.symbols,
    marketNote: market.note,
    marketTheater: market.theater,
    marketChokepointId: market.chokepointId,
    marketAgeMinutes,
  };
}

export type BuildMacroBriefingInput = {
  domain: MacroDomain;
  lang: LabelLanguage;
  rssItems: MacroRssInputItem[];
  gdeltEvents: MacroGdeltInputEvent[];
  newsSource?: MacroBriefingPayload["sources"]["news"];
  gdeltSource?: MacroBriefingPayload["sources"]["gdelt"];
};

/**
 * RSS + GDELT → 거시 토픽 Top N.
 * 미시 단독 승격 없음 — 테마 버킷 안에서만 단계로 노출.
 */
export function buildMacroBriefing(input: BuildMacroBriefingInput): MacroBriefingPayload {
  const { domain, lang, rssItems, gdeltEvents } = input;
  const buckets = emptyBuckets(domain);

  for (const item of rssItems) {
    const themeId = assignRssTheme(item, domain);
    if (!themeId) continue;
    const bucket = buckets.get(themeId);
    if (!bucket) continue;
    bucket.rss.push(item);
  }

  for (const event of gdeltEvents) {
    const themeId = assignGdeltTheme(event, domain);
    if (!themeId) continue;
    const bucket = buckets.get(themeId);
    if (!bucket) continue;
    bucket.gdelt.push(event);
  }

  const topics: MacroTopic[] = [];
  for (const bucket of buckets.values()) {
    const topic = bucketToTopic(bucket, domain, lang);
    if (topic) topics.push(topic);
  }

  topics.sort((a, b) => b.heat - a.heat);

  return {
    generatedAt: new Date().toISOString(),
    domain,
    lang,
    topics: topics.slice(0, TOP_N),
    sources: {
      news: input.newsSource ?? "empty",
      gdelt: input.gdeltSource ?? "empty",
    },
  };
}

/** 테스트·API용 — NewsStreamPayload 평탄화 */
export function flattenNewsStreamItems(payload: {
  hero?: MacroRssInputItem | null;
  flashHeroes?: MacroRssInputItem[];
  verified?: MacroRssInputItem[];
  stateMedia?: MacroRssInputItem[];
}): MacroRssInputItem[] {
  const out: MacroRssInputItem[] = [];
  const seen = new Set<string>();
  const push = (item: MacroRssInputItem | null | undefined) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };
  push(payload.hero ?? null);
  for (const h of payload.flashHeroes ?? []) push(h);
  for (const v of payload.verified ?? []) push(v);
  for (const s of payload.stateMedia ?? []) push(s);
  return out;
}
