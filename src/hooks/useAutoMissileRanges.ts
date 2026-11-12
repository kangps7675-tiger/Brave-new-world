"use client";

import { useEffect, useState } from "react";
import { fromWire, type AutoRangeSpec, type AutoRangeWire } from "@/lib/missileRangeAuto";

/** 뉴스에서 자동 추출한 새 기종 사거리를 한 번 받아 모든 속보 카드가 나눠 쓴다(30분 캐시). 실패하면 빈 목록. */
const TTL_MS = 30 * 60_000;
let cache: { at: number; specs: AutoRangeSpec[] } | null = null;
let inflight: Promise<AutoRangeSpec[]> | null = null;

function load(): Promise<AutoRangeSpec[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.specs);
  inflight ??= fetch("/api/missile-ranges/auto")
    .then((res) => (res.ok ? (res.json() as Promise<{ specs?: AutoRangeWire[] }>) : { specs: [] }))
    .then((json) => {
      const specs = Array.isArray(json.specs) ? json.specs.map(fromWire) : [];
      cache = { at: Date.now(), specs };
      return specs;
    })
    .catch(() => [] as AutoRangeSpec[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const EMPTY: AutoRangeSpec[] = [];

export function useAutoMissileRanges(enabled = true): AutoRangeSpec[] {
  const [specs, setSpecs] = useState<AutoRangeSpec[]>(() => cache?.specs ?? EMPTY);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void load().then((rows) => {
      if (alive) setSpecs(rows);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return specs;
}
