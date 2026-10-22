/**
 * 속보 하나에 붙일 "연관 사진" 찾기 — 이미 받아 둔 RSS 뉴스(news-stream)에서
 * 같은 사건을 다룬 기사를 골라 그 기사의 대표 사진을 쓴다.
 * 레퍼런스(매체·기사 제목·링크)가 없는 사진은 돌려주지 않는다.
 */

import type { NewsStreamItem } from "@/lib/news/types";

export type RelatedPhoto = {
  imageUrl: string;
  articleUrl: string;
  outlet: string;
  articleTitle: string;
};

const STOP = new Set([
  "the", "and", "for", "with", "from", "that", "this", "has", "have", "was", "were", "are", "its",
  "after", "over", "into", "amid", "says", "said", "new", "news", "report", "reports", "reported",
  "attack", "attacks", "strike", "strikes", "army", "forces", "military", "russia", "russian",
  "속보", "기자", "뉴스", "관련", "대한", "에서", "으로", "있다", "했다", "밝혔다",
]);

export function photoTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!raw || STOP.has(raw)) continue;
    const isHangul = /[ㄱ-힝]/.test(raw);
    if (raw.length < (isHangul ? 2 : 4)) continue;
    out.add(raw);
  }
  return out;
}

const WINDOW_MS = 48 * 3_600_000;
const MIN_SHARED = 2;

export function findRelatedPhoto(
  event: { text: string; at: number },
  pool: readonly NewsStreamItem[],
): RelatedPhoto | null {
  const want = photoTokens(event.text);
  if (want.size === 0) return null;
  let best: { score: number; item: NewsStreamItem } | null = null;
  for (const item of pool) {
    if (!item.imageUrl || !/^https?:\/\//i.test(item.imageUrl)) continue;
    if (!item.link || !/^https?:\/\//i.test(item.link)) continue;
    const at = Date.parse(item.pubDate);
    if (Number.isFinite(at) && Math.abs(at - event.at) > WINDOW_MS) continue;
    const have = photoTokens(`${item.title} ${item.titleKo ?? ""} ${item.summary ?? ""}`);
    let shared = 0;
    for (const t of want) if (have.has(t)) shared += 1;
    if (shared < MIN_SHARED) continue;
    if (!best || shared > best.score) best = { score: shared, item };
  }
  if (!best) return null;
  const { item } = best;
  return {
    imageUrl: item.imageUrl!,
    articleUrl: item.link,
    outlet: item.publisher || item.source,
    articleTitle: item.title,
  };
}
