"use client";

import { useEffect, useState } from "react";
import type { ChokepointAisObservation } from "@/lib/chokepointStressForUi";
import type { ChokeTransitStress } from "@/lib/portWatch";

type PortWatchApiPayload = {
  byChokeId?: Record<string, ChokepointAisObservation>;
  transits?: Record<string, ChokeTransitStress>;
  error?: string;
};

export type PortWatchClientSnapshot = {
  byChokeId: Record<string, ChokepointAisObservation>;
  transits: Record<string, ChokeTransitStress>;
};

/**
 * IMF PortWatch B급 관측 (초크 id → aisObservation + today/baseline stress).
 * CDN/서버가 6–12h 캐시 — 클라이언트는 마운트 시 1회만 요청.
 */
export function usePortWatchObservations(): PortWatchClientSnapshot {
  const [snapshot, setSnapshot] = useState<PortWatchClientSnapshot>({
    byChokeId: {},
    transits: {},
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portwatch", { cache: "force-cache" });
        if (!res.ok) return;
        const payload = (await res.json()) as PortWatchApiPayload;
        if (cancelled) return;
        setSnapshot({
          byChokeId: payload.byChokeId ?? {},
          transits: payload.transits ?? {},
        });
      } catch {
        /* 실패 시 빈 맵 — computeChokepointStress가 관측 부족 처리 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return snapshot;
}
