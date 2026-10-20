/**
 * LLM 뉴스 다이제스트 스키마 (캐시 전용).
 * @see docs/llm-news-digest.md
 * Telegram OSINT 텍스트는 절대 포함하지 않는다.
 */

import type { NewsTheater } from "@/lib/news/types";

export type DigestConfidence = "high" | "medium" | "low";

export type NewsDigestItem = {
  articleId: string;
  link: string;
  source: string;
  theater: NewsTheater | null;
  /** 정확히 3문장. 없으면 null → UI는 원문 제목만 */
  summaryLines: [string, string, string] | null;
  confidence: DigestConfidence;
  /** Yahoo 심볼 — 매매 권유 아님 */
  relatedSymbols?: string[];
  model: string;
  generatedAt: string;
  disclaimer: "reference-only";
};

export type NewsDigestCache = {
  version: 1;
  generatedAt: string;
  /** LLM 배치가 아직 없으면 false */
  llmEnabled: false | true;
  items: NewsDigestItem[];
  note?: string;
};

export function emptyNewsDigestCache(): NewsDigestCache {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    llmEnabled: false,
    items: [],
    note: "Cache-only. LLM batch not wired. Telegram excluded.",
  };
}

export function isNewsDigestItem(value: unknown): value is NewsDigestItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.articleId !== "string" || typeof v.link !== "string") return false;
  if (typeof v.source !== "string") return false;
  if (v.disclaimer !== "reference-only") return false;
  if (v.summaryLines != null) {
    if (!Array.isArray(v.summaryLines) || v.summaryLines.length !== 3) return false;
    if (!v.summaryLines.every((line) => typeof line === "string")) return false;
  }
  return true;
}

export function findDigestByArticleId(
  cache: NewsDigestCache,
  articleId: string,
): NewsDigestItem | null {
  const id = articleId.trim();
  if (!id) return null;
  return cache.items.find((item) => item.articleId === id) ?? null;
}
