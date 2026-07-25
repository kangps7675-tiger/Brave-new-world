"use client";

import { useEffect, useState } from "react";
import type { ChokepointAisObservation } from "@/lib/chokepointStressForUi";

type PortWatchApiPayload = {
  byChokeId?: Record<string, ChokepointAisObservation>;
  error?: string;
};

/**
 * IMF PortWatch B급 관측 (초크 id → aisObservation).
 * CDN/서버가 6–12h 캐시 — 클라이언트는 마운트 시 1회만 요청.
 */
export function usePortWatchObservations(): Record<string, ChokepointAisObservation> {
  const [byChokeId, setByChokeId] = useState<Record<string, ChokepointAisObservation>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portwatch", { cache: "force-cache" });
        if (!res.ok) return;
        const payload = (await res.json()) as PortWatchApiPayload;
        if (cancelled || !payload.byChokeId) return;
        setByChokeId(payload.byChokeId);
      } catch {
        /* 실패 시 빈 맵 — computeChokepointStress가 관측 부족 처리 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return byChokeId;
}
