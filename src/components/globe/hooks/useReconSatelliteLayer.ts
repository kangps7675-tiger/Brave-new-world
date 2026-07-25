"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReconTleSatellite } from "@/lib/reconSatelliteTypes";
import {
  cullReconSatellites,
  propagateReconSatellites,
  type ReconSatelliteMarker,
} from "@/lib/reconSatellitePropagate";

const TICK_MS = 45_000;
const MAX_VISIBLE = 140;

type Status = "idle" | "loading" | "ok" | "error";

export function useReconSatelliteLayer(opts: {
  enabled: boolean;
  filterCenter: { lat: number; lng: number };
  keepMarkerId?: string | null;
}) {
  const { enabled, filterCenter, keepMarkerId } = opts;
  const [tle, setTle] = useState<ReconTleSatellite[]>([]);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshTle = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus((prev) => (prev === "ok" ? prev : "loading"));
    setError(null);
    try {
      const res = await fetch("/api/satellites", {
        signal: ctrl.signal,
        // 브라우저 HTTP 캐시 + 서버 CDN — 초단위 재요청 금지
        cache: "default",
      });
      if (!res.ok) throw new Error(`satellites HTTP ${res.status}`);
      const payload = (await res.json()) as {
        satellites?: ReconTleSatellite[];
        fetchedAt?: string;
        error?: string;
      };
      if (ctrl.signal.aborted) return;
      setTle(payload.satellites ?? []);
      setFetchedAt(payload.fetchedAt ?? new Date().toISOString());
      setStatus("ok");
      if (payload.error) setError(payload.error);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "TLE fetch failed");
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    void refreshTle();
    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, refreshTle]);

  useEffect(() => {
    if (!enabled || tle.length === 0) return;
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, tle.length]);

  const satellites = useMemo(() => {
    if (!enabled || tle.length === 0) return [] as ReconSatelliteMarker[];
    void tick;
    const now = new Date();
    const all = propagateReconSatellites(tle, now);
    return cullReconSatellites(all, filterCenter, MAX_VISIBLE, keepMarkerId);
  }, [enabled, filterCenter, keepMarkerId, tick, tle]);

  return {
    satellites,
    tleCount: tle.length,
    status,
    error,
    fetchedAt,
    refreshTle,
  };
}
