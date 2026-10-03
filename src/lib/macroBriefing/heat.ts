import {
  confidenceFromSourceCount,
  uniqueSourceKey,
} from "@/lib/conflictEvents/confidence";
import type { MediaTrustTier } from "@/lib/news/types";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  bucketRssFear,
  gdeltFearProxy,
  publicFearHeatMultiplier,
} from "./publicFear";
import type {
  MacroDensityBadge,
  MacroGdeltInputEvent,
  MacroRssInputItem,
  MacroTrustBadge,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function rssIndependentKeys(items: MacroRssInputItem[]): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    keys.add(uniqueSourceKey(item.source || item.publisher || "rss", item.link));
  }
  return [...keys].filter((k) => k !== "unknown");
}

export function trustBadgeFromRss(items: MacroRssInputItem[]): MacroTrustBadge | null {
  const n = rssIndependentKeys(items).length;
  if (n === 0) return null;
  return confidenceFromSourceCount(n);
}

export function densityBadgeFromGdelt(count: number, avgTension: number): MacroDensityBadge {
  if (count <= 0) return "none";
  if (count >= 40 || (count >= 20 && avgTension >= 6)) return "surge";
  if (count >= 18 || (count >= 10 && avgTension >= 4)) return "high";
  if (count >= 5) return "elevated";
  return "none";
}

function tierWeight(tier: MediaTrustTier): number {
  if (tier === 1) return 1.35;
  if (tier === 2) return 1.0;
  return 0.55;
}

function ageMinutesOf(item: MacroRssInputItem): number {
  if (typeof item.ageMinutes === "number" && Number.isFinite(item.ageMinutes)) {
    return item.ageMinutes;
  }
  const ts = Date.parse(item.pubDate);
  if (!Number.isFinite(ts)) return 9999;
  return Math.max(0, Math.round((Date.now() - ts) / 60_000));
}

function freshnessFactor(items: MacroRssInputItem[]): number {
  if (items.length === 0) return 0.4;
  const ages = items.map(ageMinutesOf);
  const minAge = Math.min(...ages);
  if (minAge <= 60) return 1.35;
  if (minAge <= 360) return 1.15;
  if (minAge <= 1440) return 1.0;
  return 0.65;
}

function avgUrgency(items: MacroRssInputItem[]): number {
  if (items.length === 0) return 0;
  let sum = 0;
  for (const item of items) {
    sum += item.urgencyScore ?? (item.breakingGrade ?? 3) * 10;
  }
  return sum / items.length;
}

function avgTierWeight(items: MacroRssInputItem[]): number {
  if (items.length === 0) return 0.7;
  let sum = 0;
  for (const item of items) sum += tierWeight(item.trustTier);
  return sum / items.length;
}

/** RSS 성분 — 독립소스 × urgency × 신선도 × 티어 × 대중공포 */
export function computeRssHeat(items: MacroRssInputItem[]): number {
  const indep = rssIndependentKeys(items).length;
  if (indep === 0) return 0;
  const urgency = avgUrgency(items);
  const fresh = freshnessFactor(items);
  const tier = avgTierWeight(items);
  const { max, avg } = bucketRssFear(items);
  const fear = publicFearHeatMultiplier(max, avg);
  return indep * (1 + urgency / 100) * fresh * tier * fear;
}

function eventTs(event: MacroGdeltInputEvent): number {
  const raw = event.createdAt || event.eventDate;
  if (!raw) return Date.now();
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : Date.now();
}

export function filterGdeltLast24h(
  events: MacroGdeltInputEvent[],
  now = Date.now(),
): MacroGdeltInputEvent[] {
  return events.filter((e) => now - eventTs(e) <= DAY_MS);
}

export function avgGdeltTension(events: MacroGdeltInputEvent[]): number {
  if (events.length === 0) return 0;
  let sum = 0;
  for (const e of events) sum += e.tensionScore ?? 2;
  return sum / events.length;
}

/** GDELT 부스트 ≥ 1 */
export function computeGdeltBoost(events24h: MacroGdeltInputEvent[]): number {
  const n = events24h.length;
  if (n === 0) return 1;
  const tension = avgGdeltTension(events24h);
  const importanceBoost = events24h.some(
    (e) => e.importanceGrade === "S" || e.importanceGrade === "A",
  )
    ? 1.25
    : 1;
  return (1 + Math.log1p(n) * (0.45 + tension / 20)) * importanceBoost;
}

/**
 * 합성 heat. RSS 없으면 GDELT 밀도만으로도 순위 가능(부스트−1 스케일).
 * 대중 관심(실존·민간 직격·봉쇄·정상회담·합의)이 볼륨·일상 긴장보다 위에 오도록 가산.
 */
export function computeThemeHeat(
  rssItems: MacroRssInputItem[],
  gdelt24h: MacroGdeltInputEvent[],
): number {
  const rss = computeRssHeat(rssItems);
  const boost = computeGdeltBoost(gdelt24h);
  if (rss > 0) {
    // GDELT 고긴장이면 RSS 공포를 한 번 더 보강(교차 신호)
    const gdeltFear = gdeltFearProxy(gdelt24h);
    const gdeltFearMul =
      gdeltFear >= 3 ? 1.2 : gdeltFear >= 2 ? 1.1 : 1;
    return rss * boost * gdeltFearMul;
  }
  if (gdelt24h.length === 0) return 0;
  const base = (boost - 1) * 8 + Math.log1p(gdelt24h.length) * 2;
  return base * publicFearHeatMultiplier(gdeltFearProxy(gdelt24h), 0);
}

export function heatLabel(params: {
  rssIndependent: number;
  gdeltCount: number;
  lang: LabelLanguage;
  surging?: boolean;
}): string {
  const { rssIndependent, gdeltCount, lang, surging } = params;
  if (lang === "en") {
    const parts = [
      `${rssIndependent} independent outlet${rssIndependent === 1 ? "" : "s"}`,
      `${gdeltCount} GDELT event${gdeltCount === 1 ? "" : "s"}`,
    ];
    if (surging) parts.push("rising");
    return parts.join(" · ");
  }
  const parts = [`독립 매체 ${rssIndependent}`, `GDELT 이벤트 ${gdeltCount}`];
  if (surging) parts.push("급증");
  return parts.join(" · ");
}

export function densityLabel(badge: MacroDensityBadge, lang: LabelLanguage): string {
  if (lang === "en") {
    if (badge === "surge") return "Event density surge";
    if (badge === "high") return "High event density";
    if (badge === "elevated") return "Elevated density";
    return "No density signal";
  }
  if (badge === "surge") return "이벤트 밀도 급증";
  if (badge === "high") return "이벤트 밀도 높음";
  if (badge === "elevated") return "이벤트 밀도 상승";
  return "밀도 신호 없음";
}
