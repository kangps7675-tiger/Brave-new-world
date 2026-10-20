"use client";

import { useEffect, useState } from "react";
import type { SafecastSiteReading, SafecastSnapshot } from "@/lib/safecast";

/**
 * Load Safecast near-nuclear readings when nuclear layer is enabled.
 * CDN/server caches ~1h — client refetches hourly while enabled.
 */
export function useSafecastNearNuclear(enabled: boolean): SafecastSiteReading[] {
  const [readings, setReadings] = useState<SafecastSiteReading[]>([]);

  useEffect(() => {
    if (!enabled) {
      setReadings([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/safecast", { cache: "force-cache" });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as SafecastSnapshot;
        if (!cancelled && Array.isArray(payload.readings)) {
          setReadings(payload.readings.filter((r) => r.usvPerH != null));
        }
      } catch {
        /* keep previous */
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return readings;
}
