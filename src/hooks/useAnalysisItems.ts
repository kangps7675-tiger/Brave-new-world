"use client";

import { useEffect, useState } from "react";
import type { AnalysisItem } from "@/lib/analysis/feed";

/** 싱크탱크 분석 목록을 한 번 받아 모든 속보 카드가 나눠 쓴다(15분 캐시). 실패하면 빈 목록. */
const TTL_MS = 15 * 60_000;
let cache: { at: number; items: AnalysisItem[] } | null = null;
let inflight: Promise<AnalysisItem[]> | null = null;

function load(): Promise<AnalysisItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.items);
  inflight ??= fetch("/api/analysis")
    .then((res) => (res.ok ? (res.json() as Promise<{ items?: AnalysisItem[] }>) : { items: [] }))
    .then((json) => {
      const items = Array.isArray(json.items) ? json.items : [];
      cache = { at: Date.now(), items };
      return items;
    })
    .catch(() => [] as AnalysisItem[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useAnalysisItems(enabled = true): AnalysisItem[] {
  const [items, setItems] = useState<AnalysisItem[]>(() => cache?.items ?? []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void load().then((rows) => {
      if (alive) setItems(rows);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return items;
}
