import type { OfficialDocMeta } from "@/data/officialDocs";
import { rareTagsOf, sameEventText } from "@/lib/news/eventScenarios";
import type { NewsStreamItem } from "@/lib/news/types";

const MAX_DOCS = 3;
const MAX_ARTICLES = 4;
const ARTICLE_WINDOW_MS = 72 * 3_600_000;

/**
 * 속보 글에서 읽힌 희귀 지명이 문서의 relatedTags와 겹칠 때만 근거로 붙인다.
 * 나라 이름만으로는 붙이지 않는다(미국이 나왔다고 미국 문서를 다 붙이면 근거가 아니라 잡음이다).
 */
export function docsForFlash(text: string, docs: readonly OfficialDocMeta[]): OfficialDocMeta[] {
  const tags = new Set(rareTagsOf(text));
  if (tags.size === 0) return [];
  return docs
    .filter((doc) => doc.relatedTags.some((tag) => tags.has(tag)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_DOCS);
}

export type RelatedArticle = {
  title: string;
  url: string;
  source: string;
  at: number;
  /** 3 = 당사자(정부·국영) 매체. 그 나라의 입장이다. */
  tier: 1 | 2 | 3;
};

/** 같은 사건을 다룬 최근 기사. 매체 등급을 같이 준다. 속보 자체와 같은 주소는 뺀다. */
export function articlesForFlash(
  text: string,
  at: number,
  pool: readonly NewsStreamItem[],
  ownUrl?: string,
): RelatedArticle[] {
  const seen = new Set<string>();
  const out: RelatedArticle[] = [];
  for (const row of pool) {
    if (!row.title?.trim() || !/^https?:\/\//i.test(row.link) || row.link === ownUrl || seen.has(row.link)) continue;
    const rowAt = Date.parse(row.pubDate);
    if (!Number.isFinite(rowAt) || Math.abs(rowAt - at) > ARTICLE_WINDOW_MS) continue;
    if (!sameEventText(text, row.title)) continue;
    seen.add(row.link);
    out.push({
      title: row.title.trim(),
      url: row.link,
      source: (row.publisher || row.source).trim(),
      at: rowAt,
      tier: row.trustTier,
    });
  }
  return out.sort((a, b) => a.tier - b.tier || b.at - a.at).slice(0, MAX_ARTICLES);
}
