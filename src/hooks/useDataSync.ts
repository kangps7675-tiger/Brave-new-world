"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getClientSyncPollMs } from "@/lib/runtimeConfig.client";

export type DataSyncStatus = {
  ok?: boolean;
  stale?: boolean;
  running?: boolean;
  status?: {
    lastSuccessAt?: string | null;
    lastError?: string | null;
    running?: boolean;
    lastStartAt?: string | null;
  };
  sources?: Record<string, string | string[]>;
};

const STARTUP_DELAY_MS = 8_000;

/**
 * Periodically checks /api/data-sync and triggers snapshot refresh when stale.
 * Live feeds (GDELT/AIS/ADS-B) already poll their own APIs; this covers static snapshot refresh.
 */
export function useDataSync(options?: {
  enabled?: boolean;
  mode?: "quick" | "default" | "full";
  cameraMovingRef?: { current: boolean };
}) {
  const enabled = options?.enabled !== false;
  const mode = options?.mode || "default";
  const cameraMovingRef = options?.cameraMovingRef;
  const [syncInfo, setSyncInfo] = useState<DataSyncStatus | null>(null);
  const [syncGeneration, setSyncGeneration] = useState(0);
  const inFlightRef = useRef(false);
  const lastSuccessRef = useRef<string | null>(null);
  const hasPolledRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data-sync", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as DataSyncStatus;
      setSyncInfo(json);
      const success = json.status?.lastSuccessAt || null;
      if (success && success !== lastSuccessRef.current) {
        if (hasPolledRef.current) {
          setSyncGeneration((n) => n + 1);
        }
        lastSuccessRef.current = success;
      }
      hasPolledRef.current = true;
      return json;
    } catch {
      return null;
    }
  }, []);

  const pollUntilIdle = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 2_000));
    for (let i = 0; i < 40; i += 1) {
      const next = await refreshStatus();
      if (!next?.running) break;
      await new Promise((r) => setTimeout(r, 8_000));
    }
  }, [refreshStatus]);

  /**
   * 상태만 폴링한다. **브라우저는 더 이상 동기화 파이프라인을 트리거하지 않는다.**
   *
   * 이전 구현은 방문자 브라우저가 POST /api/data-sync 로 최대 15분짜리 서버
   * 자식 프로세스를 띄울 수 있었다(무인증 자원 고갈 벡터). 파이프라인 구동은
   * Cloudflare Cron(=INGEST_CRON_SECRET 보유)이 전담하고, 클라이언트는 결과를
   * 관찰만 한다. 새 스냅샷이 도착하면 syncGeneration 이 올라가 화면이 갱신된다.
   */
  const triggerIfStale = useCallback(async () => {
    if (inFlightRef.current) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (cameraMovingRef?.current) return;
    inFlightRef.current = true;
    try {
      const status = await refreshStatus();
      // 동기화가 서버에서 돌고 있다면 끝날 때까지 상태를 따라간다.
      if (status?.running) await pollUntilIdle();
    } finally {
      inFlightRef.current = false;
    }
  }, [cameraMovingRef, pollUntilIdle, refreshStatus]);

  /**
   * 수동 새로고침 버튼용.
   *
   * 프로덕션에서는 서버가 cron 시크릿을 요구하므로 401 이 돌아온다 —
   * 그 경우 조용히 상태 폴링으로 폴백한다(로컬 개발에서는 그대로 동작).
   */
  const forceSync = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`/api/data-sync?force=1&mode=${encodeURIComponent(mode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, mode }),
      }).catch(() => null);
      if (res?.ok) await pollUntilIdle();
      await refreshStatus();
    } finally {
      inFlightRef.current = false;
    }
  }, [mode, pollUntilIdle, refreshStatus]);

  useEffect(() => {
    if (!enabled) return;
    const startup = window.setTimeout(() => {
      void triggerIfStale();
    }, STARTUP_DELAY_MS);
    const pollMs = getClientSyncPollMs();
    const timer = window.setInterval(() => {
      void triggerIfStale();
    }, pollMs);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
    };
  }, [enabled, triggerIfStale]);

  return { syncInfo, syncGeneration, refreshStatus, triggerIfStale, forceSync };
}
