"use client";

import { useEffect, useState } from "react";
import type { PolledDoc } from "@/lib/officialDocs/matchPolled";

/**
 * 워커가 모은 공식 문서(`/api/official-docs`)를 한 번 받아 모든 속보 카드가 나눠 쓴다.
 * 속보 카드마다 요청하지 않도록 모듈 안에 15분 캐시를 둔다. 실패하면 빈 목록(화면은 그 칸만 안 보인다).
 */
const TTL_MS = 15 * 60_000;
let cache: { at: number; docs: PolledDoc[] } | null = null;
let inflight: Promise<PolledDoc[]> | null = null;

function load(): Promise<PolledDoc[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.docs);
  inflight ??= fetch("/api/official-docs?days=30")
    .then((res) => (res.ok ? (res.json() as Promise<{ docs?: PolledDoc[] }>) : { docs: [] }))
    .then((json) => {
      const docs = Array.isArray(json.docs) ? json.docs : [];
      cache = { at: Date.now(), docs };
      return docs;
    })
    .catch(() => [] as PolledDoc[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function usePolledOfficialDocs(enabled = true): PolledDoc[] {
  const [docs, setDocs] = useState<PolledDoc[]>(() => cache?.docs ?? []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void load().then((rows) => {
      if (alive) setDocs(rows);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return docs;
}
