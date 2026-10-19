/**
 * 전세계 뉴스 피드 → 선택한 해역 관련 기사를 위로.
 * 지도 레이어로 그리지 않는다 — 옆 패널 피드 하나 (2026-10-20 확정).
 */

import type { NewsStreamItem } from "@/lib/news/types";
import type { SeaRegion } from "@/lib/sea/regions";

const SHIPPING_RE =
  /ship|vessel|tanker|cargo|container|maritime|navy|naval|port|strait|insurance|war risk|freight|선박|유조선|화물선|해운|해군|항구|해협|보험|운임/i;

export type RankedNews = NewsStreamItem & { relevance: 0 | 1 | 2 };

export function newsRelevance(item: NewsStreamItem, region: SeaRegion): 0 | 1 | 2 {
  const text = [item.title, item.titleKo, item.summary, item.bodyKo].filter(Boolean).join(" ");
  const inRegion = region.newsKeywords.test(text);
  if (inRegion && SHIPPING_RE.test(text)) return 2;
  if (inRegion) return 1;
  return 0;
}

/** 관련도 높은 순 → 최신순. 관련 없는 기사도 아래에 남긴다 (전세계 피드). */
export function rankNewsForRegion(items: readonly NewsStreamItem[], region: SeaRegion): RankedNews[] {
  const seen = new Set<string>();
  const out: RankedNews[] = [];
  for (const it of items) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    out.push({ ...it, relevance: newsRelevance(it, region) });
  }
  return out.sort((a, b) => b.relevance - a.relevance || b.pubDate.localeCompare(a.pubDate));
}
