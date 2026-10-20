import type { NewsStreamItem } from "@/lib/news/types";

/** 우측 패널 Selection.kind === "news-insight" 페이로드 */
export type NewsInsightSelectionItem = {
  article: NewsStreamItem;
  displayTitle?: string;
  displaySummary?: string;
};
