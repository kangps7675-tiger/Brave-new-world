"use client";

import { useSyncExternalStore } from "react";
import { COMPACT_QUERY } from "@/hooks/compactQuery";

export { COMPACT_QUERY };

function readCompactMatch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(COMPACT_QUERY).matches;
  } catch {
    return false;
  }
}

function subscribeCompact(onStoreChange: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

/**
 * 모바일·터치 간이 뷰 게이트.
 * useSyncExternalStore + `<html data-compact>` 인라인 스크립트로
 * SSR→hydration 레이아웃 플래시를 줄인다.
 */
export function useCompactUi(): boolean {
  return useSyncExternalStore(subscribeCompact, readCompactMatch, () => false);
}

export function isCompactUiMatch(): boolean {
  return readCompactMatch();
}
