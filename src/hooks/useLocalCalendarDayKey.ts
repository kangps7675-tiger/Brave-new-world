"use client";

import { useEffect, useState } from "react";
import { localCalendarDayKey } from "@/lib/news/periodicBriefing";

/**
 * 로컬 자정이 지나면 dayKey가 바뀐다.
 * (탭 복귀 시에도 재동기화 — 백그라운드 타이머 드리프트 보정)
 */
export function useLocalCalendarDayKey(): string {
  const [dayKey, setDayKey] = useState(() =>
    typeof window === "undefined" ? "daily-0000-00-00" : localCalendarDayKey(),
  );

  useEffect(() => {
    let timer: number | undefined;

    const sync = () => {
      setDayKey(localCalendarDayKey());
    };

    const scheduleNextMidnight = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
      const delay = Math.max(500, next.getTime() - now.getTime());
      timer = window.setTimeout(() => {
        sync();
        scheduleNextMidnight();
      }, delay);
    };

    sync();
    scheduleNextMidnight();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sync();
        scheduleNextMidnight();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return dayKey;
}
