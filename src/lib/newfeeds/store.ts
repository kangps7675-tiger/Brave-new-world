/**
 * NewFeeds Iran — 프로세스 메모리 스냅샷 (cron sync가 채움).
 * Attribution: https://github.com/ktoetotam/NewFeeds (MIT)
 */

import type { NewfeedsAttacksPayload } from "@/lib/newfeeds";
import type { NewsStreamItem } from "@/lib/news/types";

export const NEWFEEDS_ATTACKS_CACHE_KEY = "newfeeds-attacks";
export const NEWFEEDS_IRAN_NEWS_CACHE_KEY = "newfeeds-iran-news";

let attacksPayload: NewfeedsAttacksPayload | null = null;
let iranNewsItems: NewsStreamItem[] = [];
let iranNewsFetchedAt: string | null = null;
let lastError: string | null = null;

export function getNewfeedsAttacksMemory(): NewfeedsAttacksPayload | null {
  return attacksPayload;
}

export function setNewfeedsAttacksMemory(payload: NewfeedsAttacksPayload) {
  attacksPayload = payload;
  lastError = payload.error ?? null;
}

export function getNewfeedsIranNewsMemory(): {
  items: NewsStreamItem[];
  fetchedAt: string | null;
} {
  return { items: iranNewsItems, fetchedAt: iranNewsFetchedAt };
}

export function setNewfeedsIranNewsMemory(
  items: NewsStreamItem[],
  fetchedAt: string,
) {
  iranNewsItems = items;
  iranNewsFetchedAt = fetchedAt;
}

export function getNewfeedsStoreMeta() {
  return {
    attacksCount: attacksPayload?.attacks.length ?? 0,
    iranCount: attacksPayload?.iranCount ?? 0,
    iranNewsCount: iranNewsItems.length,
    attacksFetchedAt: attacksPayload?.fetchedAt ?? null,
    iranNewsFetchedAt,
    lastError,
  };
}

export function setNewfeedsLastError(error: string | null) {
  lastError = error;
}
