"use client";

import { useEffect, useState } from "react";
import type { DailyRanksPayload } from "@/lib/dailyRanks";

const REFRESH_MS = 120_000;

let cached: DailyRanksPayload | null = null;
let cachedAt = 0;
let inFlight: Promise<DailyRanksPayload | null> | null = null;

async function fetchRanks(limit: number): Promise<DailyRanksPayload | null> {
  const res = await fetch(`/api/daily-ranks?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as DailyRanksPayload;
}

/** 전장 사이드바 인사이트 — daily-ranks 짧은 스냅샷 (세션 캐시 공유) */
export function useDailyRanksBrief(limit = 12): {
  payload: DailyRanksPayload | null;
  loading: boolean;
} {
  const [payload, setPayload] = useState<DailyRanksPayload | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    if (cached && now - cachedAt < REFRESH_MS) {
      setPayload(cached);
      setLoading(false);
      return;
    }

    if (!inFlight) {
      inFlight = fetchRanks(limit).finally(() => {
        inFlight = null;
      });
    }

    void inFlight.then((data) => {
      if (cancelled) return;
      if (data) {
        cached = data;
        cachedAt = Date.now();
      }
      setPayload(data);
      setLoading(false);
    });

    const interval = window.setInterval(() => {
      void fetchRanks(limit).then((data) => {
        if (cancelled || !data) return;
        cached = data;
        cachedAt = Date.now();
        setPayload(data);
      });
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [limit]);

  return { payload, loading };
}
