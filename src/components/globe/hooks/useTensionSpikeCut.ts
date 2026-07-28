"use client";

import { useCallback, useEffect, useState } from "react";
import type { DailyRanksPayload } from "@/lib/dailyRanks";
import {
  dismissTensionCutToday,
  evaluateTaiwanTensionSpike,
  tensionCutDismissedToday,
  type TensionCutDestination,
  type TensionSpikeSnapshot,
} from "@/lib/tensionSpikeCut";

type Options = {
  enabled: boolean;
  /** 게이트·모드픽커·공습 브리핑 등으로 차단 */
  blocked: boolean;
  calendarDayKey: string;
};

/**
 * 대만 해협 긴장 스파이크 → 컷 오퍼.
 * GlobeDashboard 폴링에서 분리한 순수 훅.
 */
export function useTensionSpikeCut({ enabled, blocked, calendarDayKey }: Options) {
  const [spike, setSpike] = useState<TensionSpikeSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSpike(null);
      return;
    }
    if (blocked || tensionCutDismissedToday()) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/daily-ranks?limit=8", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as DailyRanksPayload;
          const next = evaluateTaiwanTensionSpike({
            theater: data.theater,
            chokepoint: data.chokepoint,
            worldTension: data.worldTension,
          });
          if (!cancelled) setSpike(next);
        } catch {
          if (!cancelled) setSpike(null);
        }
      })();
    }, 1_800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [blocked, calendarDayKey, enabled]);

  const dismiss = useCallback(() => {
    dismissTensionCutToday();
    setSpike(null);
  }, []);

  const clear = useCallback(() => setSpike(null), []);

  return {
    tensionSpike: spike,
    dismissTensionSpike: dismiss,
    clearTensionSpike: clear,
  };
}

export type { TensionCutDestination, TensionSpikeSnapshot };
