"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDataWithFallback } from "@/lib/dataProfile";
import { runWhenIdle } from "@/lib/deferIdle";

export function useLazyJsonArray<T>(
  relativePath: string,
  enabled: boolean,
  expand: (raw: unknown[]) => T[],
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDataWithFallback(relativePath, { cache: "no-store" });
      if (!response.ok) throw new Error(`${relativePath}: ${response.status}`);
      const raw = (await response.json()) as unknown[];
      setData(expand(raw));
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [relativePath, expand]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  return { data, loading, error, load, loaded: loadedRef.current || data.length > 0 };
}

export function useLazyJsonObject<T>(
  relativePath: string,
  enabled: boolean,
  parse: (raw: unknown) => T,
  opts?: { deferUntilIdle?: boolean },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const deferUntilIdle = Boolean(opts?.deferUntilIdle);

  useEffect(() => {
    if (!enabled || loadedRef.current) return;
    let mounted = true;
    setLoading(true);

    const start = () => {
      if (!mounted || loadedRef.current) return;
      fetchDataWithFallback(relativePath, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return null;
          return parse(await response.json());
        })
        .then((parsed) => {
          if (!mounted || !parsed) return;
          setData(parsed);
          loadedRef.current = true;
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };

    if (!deferUntilIdle) {
      start();
      return () => {
        mounted = false;
      };
    }

    const cancelIdle = runWhenIdle(start, 4_000);
    return () => {
      mounted = false;
      cancelIdle();
    };
  }, [deferUntilIdle, enabled, relativePath, parse]);

  return { data, loading };
}
