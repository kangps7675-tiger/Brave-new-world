import type { VideoNewsTopic } from "@/lib/news/videoTypes";
import type { ViewPackageId } from "@/lib/viewPackages";
import { isEconomyNewsMode } from "@/lib/news/feedCatalog";

export type VideoFeedDef = {
  channelId: string;
  name: string;
  topic: VideoNewsTopic;
};

/**
 * 동영상 뉴스 폴링 — 공신력 있는 방송·와이어만.
 * (Atom RSS, API 키 불필요. 채널 ID는 실제 feeds.videos.xml 200 응답으로 검증.)
 *
 * 반서방 충돌사 다큐/스토리는 여기 넣지 않음 — 에피소드 큐레이션(스토리)이며 폴링 대상 아님.
 */

/** 지정학 — 국제·안보 현실 뉴스 */
export const DEFENSE_VIDEO_FEEDS: VideoFeedDef[] = [
  { channelId: "UC16niRr50-MSBwiO3YDb3RA", name: "BBC News", topic: "defense" },
  { channelId: "UChqUTb7kYRX8-EiaN3XFrSQ", name: "Reuters", topic: "defense" },
  { channelId: "UC52X5wxOL_s5yw0dQk7NtgA", name: "Associated Press", topic: "defense" },
  { channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg", name: "Al Jazeera English", topic: "defense" },
  { channelId: "UCknLrEdhRCp1aegoMqRaCZg", name: "DW News", topic: "defense" },
];

/** 지경학 — 시장·매크로 현실 뉴스 */
export const ECONOMY_VIDEO_FEEDS: VideoFeedDef[] = [
  { channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", name: "Bloomberg Television", topic: "economy" },
  { channelId: "UCo7a6riBFJ3tkeHjvkXPn1g", name: "CNBC International", topic: "economy" },
  { channelId: "UCoUxsWakJucWg46KW5RsvPw", name: "Financial Times", topic: "economy" },
  { channelId: "UChqUTb7kYRX8-EiaN3XFrSQ", name: "Reuters", topic: "economy" },
];

export function youtubeAtomUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

export function videoTopicForPackages(packages?: ViewPackageId[]): VideoNewsTopic {
  return isEconomyNewsMode(packages ?? []) ? "economy" : "defense";
}

export function feedsForVideoTopic(topic: VideoNewsTopic): VideoFeedDef[] {
  return topic === "economy" ? ECONOMY_VIDEO_FEEDS : DEFENSE_VIDEO_FEEDS;
}
