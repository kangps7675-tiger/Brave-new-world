"use client";

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  liveNewfeedsPollMs,
  liveTelegramPollMs,
  liveTelegramSyncPollMs,
  liveTzevaPollMs,
  shouldDeferLiveNetworkRefresh,
} from "@/lib/liveRenderGuard";
import { runWhenIdle } from "@/lib/deferIdle";
import type { TelegramAlert, TelegramAlertsPayload } from "@/lib/telegramAlerts";
import type { TzevaAdomAlert, TzevaAdomPayload } from "@/lib/tzevaAdom";
import type { NewfeedsAttackPoint, NewfeedsAttacksPayload } from "@/lib/newfeeds";
import type { ViewerChromePreset } from "@/lib/viewerChrome";

type TelegramStatus = "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
type TzevaAdomStatus = "idle" | "loading" | "ok" | "error" | "stub" | "geo-blocked";
type NewfeedsStatus = "idle" | "loading" | "ok" | "error";

type UseLiveOsintPollingOptions = {
  isCameraMovingRef: MutableRefObject<boolean>;
  isEconomyViewer: boolean;
  globeReady: boolean;
  showTelegramOsint: boolean;
  intelSheetOpen: boolean;
  viewerChromePreset: ViewerChromePreset;
  telegramEmbedMode: boolean;
  setTelegramAlerts: Dispatch<SetStateAction<TelegramAlert[]>>;
  setTelegramLive: Dispatch<SetStateAction<boolean>>;
  setTelegramStatus: Dispatch<SetStateAction<TelegramStatus>>;
  setTelegramEmbedMode: Dispatch<SetStateAction<boolean>>;
  setTelegramNeedsAuth: Dispatch<SetStateAction<boolean>>;
  setTelegramSessionExists: Dispatch<SetStateAction<boolean>>;
  setTzevaAdomActive: Dispatch<SetStateAction<TzevaAdomAlert[]>>;
  setTzevaAdomHistory: Dispatch<SetStateAction<TzevaAdomAlert[]>>;
  setTzevaAdomLive: Dispatch<SetStateAction<boolean>>;
  setTzevaAdomGeoRestricted: Dispatch<SetStateAction<boolean>>;
  setTzevaAdomError: Dispatch<SetStateAction<string | null>>;
  setTzevaAdomStatus: Dispatch<SetStateAction<TzevaAdomStatus>>;
  setNewfeedsAttacks: Dispatch<SetStateAction<NewfeedsAttackPoint[]>>;
  setNewfeedsThreatLabel: Dispatch<SetStateAction<string | null>>;
  setNewfeedsLive: Dispatch<SetStateAction<boolean>>;
  setNewfeedsError: Dispatch<SetStateAction<string | null>>;
  setNewfeedsStatus: Dispatch<SetStateAction<NewfeedsStatus>>;
};

/**
 * OSINT 라이브 폴링(텔레그램·Tzeva Adom·NewFeeds 이란) — GlobeDashboard에서 추출 (분리 2단계).
 * 동작 변경 없음: 원본 콜백/이펙트를 그대로 옮김.
 */
export function useLiveOsintPolling({
  isCameraMovingRef,
  isEconomyViewer,
  globeReady,
  showTelegramOsint,
  intelSheetOpen,
  viewerChromePreset,
  telegramEmbedMode,
  setTelegramAlerts,
  setTelegramLive,
  setTelegramStatus,
  setTelegramEmbedMode,
  setTelegramNeedsAuth,
  setTelegramSessionExists,
  setTzevaAdomActive,
  setTzevaAdomHistory,
  setTzevaAdomLive,
  setTzevaAdomGeoRestricted,
  setTzevaAdomError,
  setTzevaAdomStatus,
  setNewfeedsAttacks,
  setNewfeedsThreatLabel,
  setNewfeedsLive,
  setNewfeedsError,
  setNewfeedsStatus,
}: UseLiveOsintPollingOptions) {
  const refreshTelegramAlerts = useCallback(async () => {
    if (!viewerChromePreset.fetchTelegram) {
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      return;
    }
    if (!showTelegramOsint && !intelSheetOpen) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTelegramStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const [alertsRes, statusRes] = await Promise.all([
        fetch("/api/telegram-alerts", { cache: "no-store" }),
        fetch("/api/telegram-alerts/status", { cache: "no-store" }),
      ]);
      if (!alertsRes.ok) throw new Error(`HTTP ${alertsRes.status}`);
      const payload = (await alertsRes.json()) as TelegramAlertsPayload;
      setTelegramAlerts(payload.alerts ?? []);
      setTelegramLive(Boolean(payload.live) || (payload.alerts?.length ?? 0) > 0);
      if (statusRes.ok) {
        const status = (await statusRes.json()) as {
          needsAuth?: boolean;
          sessionExists?: boolean;
          embedMode?: boolean;
        };
        setTelegramEmbedMode(status.embedMode !== false);
        setTelegramNeedsAuth(Boolean(status.needsAuth));
        setTelegramSessionExists(Boolean(status.sessionExists));
      }
      setTelegramStatus(
        payload.stub ? "stub" : payload.waiting ? "waiting" : "ok",
      );
    } catch {
      setTelegramStatus("error");
    }
  }, [
    intelSheetOpen,
    isCameraMovingRef,
    setTelegramAlerts,
    setTelegramEmbedMode,
    setTelegramLive,
    setTelegramNeedsAuth,
    setTelegramSessionExists,
    setTelegramStatus,
    showTelegramOsint,
    viewerChromePreset.fetchTelegram,
  ]);

  const syncTelegramEmbed = useCallback(async () => {
    if (!viewerChromePreset.fetchTelegram) {
      setTelegramAlerts([]);
      setTelegramLive(false);
      setTelegramStatus("idle");
      return;
    }
    if (!showTelegramOsint && !intelSheetOpen) return;
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTelegramStatus("loading");
    try {
      // 스크레이핑 트리거는 Cron 전용(POST /api/telegram-alerts/sync + 시크릿).
      // 브라우저는 이미 수집된 알림을 읽기만 한다 — 방문자마다 120초짜리
      // 외부 스크레이핑을 유발하던 경로를 제거했다.
      await refreshTelegramAlerts();
    } catch {
      // 공개 embed는 t.me 응답/타임아웃이 흔함. 캐시/대기 상태를 살리고 다음 폴링에서 재시도한다.
      await refreshTelegramAlerts();
      setTelegramStatus((prev) =>
        telegramEmbedMode && (prev === "idle" || prev === "loading" || prev === "error")
          ? "waiting"
          : prev === "error"
            ? "error"
            : prev,
      );
    }
  }, [
    intelSheetOpen,
    isCameraMovingRef,
    refreshTelegramAlerts,
    setTelegramAlerts,
    setTelegramLive,
    setTelegramStatus,
    showTelegramOsint,
    telegramEmbedMode,
    viewerChromePreset.fetchTelegram,
  ]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) {
      if (!showTelegramOsint && !intelSheetOpen) {
        setTelegramAlerts([]);
        setTelegramLive(false);
        setTelegramStatus("idle");
      }
      return;
    }
    const cancel = runWhenIdle(() => {
      void syncTelegramEmbed();
    }, 3500);
    return cancel;
  }, [globeReady, intelSheetOpen, setTelegramAlerts, setTelegramLive, setTelegramStatus, showTelegramOsint, syncTelegramEmbed]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) return;
    const timer = window.setInterval(() => {
      void syncTelegramEmbed();
    }, liveTelegramSyncPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, intelSheetOpen, showTelegramOsint, syncTelegramEmbed]);

  useEffect(() => {
    if ((!showTelegramOsint && !intelSheetOpen) || !globeReady) return;
    const timer = window.setInterval(() => {
      void refreshTelegramAlerts();
    }, liveTelegramPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, intelSheetOpen, refreshTelegramAlerts, showTelegramOsint]);

  const refreshTzevaAdom = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setTzevaAdomStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const res = await fetch("/api/tzeva-adom", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as TzevaAdomPayload;
      setTzevaAdomActive(payload.active ?? []);
      setTzevaAdomHistory(payload.history ?? []);
      setTzevaAdomLive(Boolean(payload.live));
      setTzevaAdomGeoRestricted(Boolean(payload.geoRestricted));
      setTzevaAdomError(payload.error ?? null);
      setTzevaAdomStatus(
        payload.stub ? "stub" : payload.geoRestricted ? "geo-blocked" : "ok",
      );
    } catch {
      setTzevaAdomStatus("error");
    }
  }, [
    isCameraMovingRef,
    setTzevaAdomActive,
    setTzevaAdomError,
    setTzevaAdomGeoRestricted,
    setTzevaAdomHistory,
    setTzevaAdomLive,
    setTzevaAdomStatus,
  ]);

  /** 이스라엘·이란 공습 — 레이어 OFF여도 백그라운드 폴링 (자동 ON/OFF용) */
  useEffect(() => {
    if (isEconomyViewer || !globeReady) return;
    void refreshTzevaAdom();
    const pollMs = liveTzevaPollMs();
    const timer = window.setInterval(() => {
      void refreshTzevaAdom();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [globeReady, isEconomyViewer, refreshTzevaAdom]);

  const refreshNewfeedsIran = useCallback(async () => {
    if (shouldDeferLiveNetworkRefresh(isCameraMovingRef.current)) return;
    setNewfeedsStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      const attacksRes = await fetch("/api/newfeeds-attacks?iran=1", { cache: "no-store" });
      if (!attacksRes.ok) throw new Error(`attacks HTTP ${attacksRes.status}`);
      const attacksPayload = (await attacksRes.json()) as NewfeedsAttacksPayload;
      setNewfeedsAttacks(attacksPayload.attacks ?? []);
      setNewfeedsThreatLabel(attacksPayload.threatLabel ?? null);
      setNewfeedsLive(Boolean(attacksPayload.live));
      setNewfeedsError(attacksPayload.error ?? null);
      setNewfeedsStatus("ok");
    } catch (err) {
      setNewfeedsStatus("error");
      setNewfeedsLive(false);
      setNewfeedsError(err instanceof Error ? err.message : "newfeeds fetch failed");
    }
  }, [
    isCameraMovingRef,
    setNewfeedsAttacks,
    setNewfeedsError,
    setNewfeedsLive,
    setNewfeedsStatus,
    setNewfeedsThreatLabel,
  ]);

  /** NewFeeds 이란 — 레이어 OFF여도 백그라운드 폴링 */
  useEffect(() => {
    if (isEconomyViewer || !globeReady) return;
    void refreshNewfeedsIran();
    const timer = window.setInterval(() => {
      void refreshNewfeedsIran();
    }, liveNewfeedsPollMs());
    return () => window.clearInterval(timer);
  }, [globeReady, isEconomyViewer, refreshNewfeedsIran]);

  return {
    refreshTelegramAlerts,
    syncTelegramEmbed,
    refreshTzevaAdom,
    refreshNewfeedsIran,
  };
}
