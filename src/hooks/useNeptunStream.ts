"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isClientApiStubMode, isClientNeptunEnabled } from "@/lib/runtimeConfig.client";
import { readResponseBodyText } from "@/lib/fetchJsonStream";
import { prefetchNeptun, writeNeptunCache, clearNeptunCache } from "@/lib/neptunPrefetch";
import { NEPTUN_PUBLISH_THROTTLE_MS } from "@/lib/globePerformance";
import {
  isNeptunThreatVisible,
  neptunPredict,
  type NeptunAlerts,
  type NeptunArchivedThreat,
  type NeptunLiveThreat,
  type NeptunPayload,
  type NeptunThreat,
  NEPTUN_WS_URL,
} from "@/lib/neptun";
import {
  createNeptunImpactFlash,
  pruneNeptunImpactFlashes,
  type NeptunImpactFlash,
} from "@/lib/neptunImpactFlash";

export type { NeptunLiveThreat, NeptunArchivedThreat } from "@/lib/neptun";
export type { NeptunImpactFlash } from "@/lib/neptunImpactFlash";

export type NeptunStreamStatus = "idle" | "loading" | "ok" | "error" | "stub";

type StreamEnvelope =
  | { type: "snapshot"; ts: string; data: { threats?: NeptunThreat[] } }
  | { type: "upsert"; ts: string; data: NeptunThreat }
  | { type: "remove"; ts: string; data: { id: string } }
  | { type: "alerts"; ts: string; data: NeptunAlerts }
  | { type: "heartbeat"; ts: string };

const EMPTY_ALERTS: NeptunAlerts = { raions: [], oblasts: [] };
const STUB_POLL_MS = 120_000;
/** WS 모드에서도 경보 해제를 놓치지 않도록 REST alerts 주기 확인 */
const ALERTS_REST_POLL_MS = 30_000;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
const MAX_ARCHIVED_TRAILS = 96;

function neptunEnabled(): boolean {
  return isClientNeptunEnabled();
}

function neptunClientLoadEnabled(): boolean {
  return neptunEnabled() || isClientApiStubMode();
}

function neptunWsEnabled(): boolean {
  return neptunEnabled() && !isClientApiStubMode();
}

function withPrediction(threats: NeptunThreat[], nowMs: number): NeptunLiveThreat[] {
  return threats
    .filter(isNeptunThreatVisible)
    .map((threat) => {
      const p = neptunPredict(threat, nowMs);
      return {
        ...threat,
        predictedLat: p.lat,
        predictedLon: p.lon,
        predictedHeading: p.heading,
        flying: p.flying,
      };
    });
}

function hasArchivableTrail(threat: NeptunThreat): boolean {
  if ((threat.trail?.length ?? 0) >= 2) return true;
  return Number.isFinite(threat.lat) && Number.isFinite(threat.lon);
}

function archiveThreat(
  archivedRef: Map<string, NeptunArchivedThreat>,
  threat: NeptunThreat,
  archivedAt: string,
) {
  if (!hasArchivableTrail(threat)) return;
  archivedRef.set(threat.id, { ...threat, archivedAt });
  if (archivedRef.size <= MAX_ARCHIVED_TRAILS) return;

  const oldest = [...archivedRef.values()].sort((a, b) =>
    a.archivedAt.localeCompare(b.archivedAt),
  )[0];
  if (oldest) archivedRef.delete(oldest.id);
}

function publishArchived(
  archivedRef: Map<string, NeptunArchivedThreat>,
  publish: (threats: NeptunArchivedThreat[]) => void,
) {
  publish(
    [...archivedRef.values()].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
  );
}

type NeptunStreamOptions = {
  /** 카메라 드래그·fly-to 중 React state publish 보류 */
  pausePublish?: boolean;
};

export function useNeptunStream(enabled: boolean, options: NeptunStreamOptions = {}) {
  const pausePublish = options.pausePublish ?? false;
  const [impactFlashes, setImpactFlashes] = useState<NeptunImpactFlash[]>([]);
  const [threats, setThreats] = useState<NeptunLiveThreat[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<NeptunArchivedThreat[]>([]);
  const [alerts, setAlerts] = useState<NeptunAlerts>(EMPTY_ALERTS);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<NeptunStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);

  const threatsRef = useRef<Map<string, NeptunThreat>>(new Map());
  const archivedRef = useRef<Map<string, NeptunArchivedThreat>>(new Map());
  const rafRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const lastPublishRef = useRef(0);
  const pausePublishRef = useRef(pausePublish);
  const pendingRef = useRef({ live: false, archived: false, alerts: false, impacts: false });
  const impactsRef = useRef<NeptunImpactFlash[]>([]);
  const sessionReadyRef = useRef(false);
  const PUBLISH_MS = NEPTUN_PUBLISH_THROTTLE_MS;

  pausePublishRef.current = pausePublish;

  const publishImpactsNow = useCallback((nowMs = Date.now()) => {
    const pruned = pruneNeptunImpactFlashes(impactsRef.current, nowMs);
    impactsRef.current = pruned;
    setImpactFlashes(pruned);
    pendingRef.current.impacts = false;
  }, []);

  const pushImpactFlash = useCallback(
    (threat: NeptunThreat, archivedAt: string) => {
      const flash = createNeptunImpactFlash(threat, Date.parse(archivedAt) || Date.now());
      if (!flash) return;
      impactsRef.current = [...impactsRef.current, flash].slice(-24);
      if (pausePublishRef.current) {
        pendingRef.current.impacts = true;
        return;
      }
      publishImpactsNow();
    },
    [publishImpactsNow],
  );

  const archiveThreatWithImpact = useCallback(
    (threat: NeptunThreat, archivedAt: string, emitFlash: boolean) => {
      archiveThreat(archivedRef.current, threat, archivedAt);
      if (emitFlash) pushImpactFlash(threat, archivedAt);
    },
    [pushImpactFlash],
  );

  const publishLiveNow = useCallback((nowMs: number) => {
    setThreats(withPrediction(Array.from(threatsRef.current.values()), nowMs));
    pendingRef.current.live = false;
  }, []);

  const publishArchivedNow = useCallback(() => {
    publishArchived(archivedRef.current, setArchivedThreats);
    pendingRef.current.archived = false;
  }, []);

  const applyThreatMap = useCallback(
    (nowMs: number) => {
      if (pausePublishRef.current) {
        pendingRef.current.live = true;
        return;
      }
      publishLiveNow(nowMs);
    },
    [publishLiveNow],
  );

  const flushPending = useCallback(() => {
    if (pausePublishRef.current) return;
    if (pendingRef.current.live) {
      publishLiveNow(Date.now());
    }
    if (pendingRef.current.archived) {
      publishArchivedNow();
    }
    if (pendingRef.current.impacts) {
      publishImpactsNow();
    }
  }, [publishArchivedNow, publishImpactsNow, publishLiveNow]);

  useEffect(() => {
    if (!pausePublish) flushPending();
  }, [flushPending, pausePublish]);

  const ingestPayload = useCallback(
    (payload: NeptunPayload) => {
      const nextIds = new Set(payload.threats.map((threat) => threat.id));
      for (const [id, threat] of threatsRef.current) {
        if (!nextIds.has(id)) {
          archiveThreatWithImpact(
            threat,
            payload.serverTime || payload.fetchedAt,
            sessionReadyRef.current,
          );
        }
      }
      threatsRef.current = new Map(payload.threats.map((t) => [t.id, t]));
      if (payload.archivedThreats?.length) {
        for (const archived of payload.archivedThreats) {
          if (hasArchivableTrail(archived)) {
            archivedRef.current.set(archived.id, archived);
          }
        }
      }
      if (pausePublishRef.current) {
        pendingRef.current.archived = true;
      } else {
        publishArchivedNow();
      }
      setAlerts(payload.alerts ?? EMPTY_ALERTS);
      setServerTime(payload.serverTime || payload.fetchedAt);
      setLive(Boolean(payload.live));
      setError(payload.error ?? null);
      setStatus(payload.stub ? "stub" : "ok");
      applyThreatMap(Date.now());
      sessionReadyRef.current = true;
    },
    [applyThreatMap, archiveThreatWithImpact, publishArchivedNow],
  );

  const refreshRest = useCallback(async () => {
    if (!enabled || !neptunClientLoadEnabled()) return;
    setStatus((prev) => (prev === "idle" ? "loading" : prev));
    try {
      // 캐시 hit로 return 하면 alerts가 비어 있어도 이전 경보가 남는다 → 항상 재fetch
      const payload = await prefetchNeptun();
      if (payload) {
        ingestPayload(payload);
        return;
      }

      const res = await fetch("/api/neptun", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const isStubStream = res.headers.get("X-Neptun-Stub") === "true";
      let next: NeptunPayload;
      if (isStubStream) {
        const text = await readResponseBodyText(res);
        next = { ...(JSON.parse(text) as NeptunPayload), live: false, stub: true };
      } else {
        next = (await res.json()) as NeptunPayload;
      }
      if (!next.alerts) next.alerts = EMPTY_ALERTS;
      writeNeptunCache(next);
      ingestPayload(next);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "fetch failed");
    }
  }, [enabled, ingestPayload]);

  const startAnimationLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const tick = (nowMs: number) => {
      if (pausePublishRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }
      if (nowMs - lastPublishRef.current >= PUBLISH_MS) {
        applyThreatMap(nowMs);
        lastPublishRef.current = nowMs;
      }
      if (impactsRef.current.length > 0) {
        const pruned = pruneNeptunImpactFlashes(impactsRef.current, nowMs);
        if (pruned.length !== impactsRef.current.length) {
          impactsRef.current = pruned;
          setImpactFlashes(pruned);
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, [applyThreatMap, PUBLISH_MS]);

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cleanupWs = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connect: () => void) => {
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    },
    [],
  );

  const connectWebSocket = useCallback(() => {
    if (!enabled || !neptunWsEnabled()) return;

    cleanupWs();
    setStatus((prev) => (prev === "idle" ? "loading" : prev));

    const ws = new WebSocket(NEPTUN_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setLive(true);
      setStatus("ok");
      setError(null);
      startAnimationLoop();
    };

    ws.onmessage = (event) => {
      try {
        const env = JSON.parse(event.data as string) as StreamEnvelope;
        const archivedAt = env.ts || new Date().toISOString();
        if (env.ts) setServerTime(env.ts);

        switch (env.type) {
          case "snapshot": {
            const list = Array.isArray(env.data?.threats) ? env.data.threats : [];
            const nextIds = new Set(list.map((threat) => threat.id));
            for (const [id, threat] of threatsRef.current) {
              if (!nextIds.has(id)) {
                archiveThreatWithImpact(threat, archivedAt, sessionReadyRef.current);
              }
            }
            threatsRef.current = new Map(list.map((t) => [t.id, t]));
            if (pausePublishRef.current) {
              pendingRef.current.archived = true;
            } else {
              publishArchivedNow();
            }
            applyThreatMap(Date.now());
            sessionReadyRef.current = true;
            break;
          }
          case "upsert":
            threatsRef.current.set(env.data.id, env.data);
            applyThreatMap(Date.now());
            break;
          case "remove": {
            const threat = threatsRef.current.get(env.data.id);
            if (threat) {
              archiveThreatWithImpact(threat, archivedAt, true);
              if (pausePublishRef.current) {
                pendingRef.current.archived = true;
              } else {
                publishArchivedNow();
              }
            }
            threatsRef.current.delete(env.data.id);
            applyThreatMap(Date.now());
            sessionReadyRef.current = true;
            break;
          }
          case "alerts":
            setAlerts(env.data ?? EMPTY_ALERTS);
            break;
          case "heartbeat":
            break;
          default:
            break;
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      setError("WebSocket error");
    };

    ws.onclose = () => {
      wsRef.current = null;
      stopAnimationLoop();
      if (!enabled || !neptunWsEnabled()) return;
      setLive(false);
      scheduleReconnect(connectWebSocket);
    };
  }, [applyThreatMap, archiveThreatWithImpact, cleanupWs, enabled, publishArchivedNow, scheduleReconnect, startAnimationLoop, stopAnimationLoop]);

  useEffect(() => {
    if (!enabled || !neptunClientLoadEnabled()) {
      threatsRef.current.clear();
      archivedRef.current.clear();
      impactsRef.current = [];
      sessionReadyRef.current = false;
      setThreats([]);
      setArchivedThreats([]);
      setImpactFlashes([]);
      setAlerts(EMPTY_ALERTS);
      setLive(false);
      setStatus("idle");
      setError(null);
      setServerTime(null);
      clearNeptunCache();
      stopAnimationLoop();
      cleanupWs();
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    if (isClientApiStubMode()) {
      void refreshRest();
      pollTimerRef.current = window.setInterval(() => {
        void refreshRest();
      }, STUB_POLL_MS);
    } else if (neptunWsEnabled()) {
      connectWebSocket();
      void refreshRest();
      // WS alerts 프레임이 비어 오지 않아도 REST로 해제를 반영
      pollTimerRef.current = window.setInterval(() => {
        void refreshRest();
      }, ALERTS_REST_POLL_MS);
    } else {
      void refreshRest();
      pollTimerRef.current = window.setInterval(() => {
        void refreshRest();
      }, ALERTS_REST_POLL_MS);
    }

    return () => {
      stopAnimationLoop();
      cleanupWs();
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [
    cleanupWs,
    connectWebSocket,
    enabled,
    refreshRest,
    startAnimationLoop,
    stopAnimationLoop,
  ]);

  return {
    threats,
    archivedThreats,
    impactFlashes,
    alerts,
    live,
    status,
    error,
    serverTime,
    alertCount: alerts.raions.length + alerts.oblasts.length,
  };
}
