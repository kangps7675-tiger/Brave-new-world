"use client";

import { useEffect, useRef, useState } from "react";
import type { TransportPath } from "@/data/geoTypes";
import type { GlobeLodTier } from "@/lib/globeLod";
import type { ViewportPathLayer } from "@/lib/viewportPathTypes";

type Options = {
  layer: ViewportPathLayer;
  enabled: boolean;
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: GlobeLodTier;
  max?: number;
  maxScalerank?: number;
  arterialMaxRank?: number;
  /** 뷰 이동 debounce ms */
  debounceMs?: number;
};

function roundCoord(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * 대형 path 레이어를 서버 뷰포트 API로 받아 통째 JSON 로드를 피한다.
 */
export function useViewportPaths(options: Options) {
  const [paths, setPaths] = useState<TransportPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!options.enabled) {
      setPaths([]);
      setLoading(false);
      return;
    }

    const debounceMs = options.debounceMs ?? 350;
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        layer: options.layer,
        lat: String(roundCoord(options.lat)),
        lng: String(roundCoord(options.lng)),
        radius: String(options.radiusDeg),
        tier: options.tier,
      });
      if (options.max != null) params.set("max", String(options.max));
      if (options.maxScalerank != null) {
        params.set("maxScalerank", String(options.maxScalerank));
      }
      if (options.arterialMaxRank != null) {
        params.set("arterialMaxRank", String(options.arterialMaxRank));
      }

      void fetch(`/api/layers/viewport-paths?${params}`, {
        cache: "no-store",
        signal: ac.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`viewport-paths ${res.status}`);
          const payload = (await res.json()) as { paths?: TransportPath[] };
          if (ac.signal.aborted) return;
          setPaths(Array.isArray(payload.paths) ? payload.paths : []);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setError(err instanceof Error ? err.message : "viewport-paths failed");
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [
    options.arterialMaxRank,
    options.debounceMs,
    options.enabled,
    options.lat,
    options.layer,
    options.lng,
    options.max,
    options.maxScalerank,
    options.radiusDeg,
    options.tier,
  ]);

  return { paths, loading, error };
}
