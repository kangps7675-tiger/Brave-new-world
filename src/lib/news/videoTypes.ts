/** 동영상 뉴스 — 메타만 (재생은 클릭 시). 본 RSS 스트림과 분리. */

export type VideoNewsTopic = "defense" | "economy";

export type VideoNewsItem = {
  id: string;
  videoId: string;
  title: string;
  /** watch URL */
  link: string;
  source: string;
  publishedAt: string;
  thumbnailUrl: string;
  topic: VideoNewsTopic;
  summary?: string;
};

export type VideoNewsPayload = {
  fetchedAt: string;
  topic: VideoNewsTopic;
  items: VideoNewsItem[];
  stats: { total: number; sources: number };
  source?: "memory" | "d1" | "live";
  waiting?: boolean;
  error?: string;
};
