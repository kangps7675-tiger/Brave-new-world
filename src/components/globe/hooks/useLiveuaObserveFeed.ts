"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LiveuamapEvent, LiveuamapFeedPayload } from "@/lib/liveuamap/types";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";

const LIVEUA_FEED_POLL_MS = 15_000;
const LIVEUA_PARCHMENT_AUTO_ADVANCE_MS = 12_000;

export type UseLiveuaObserveFeedOptions = {
  isSatelliteViewer: boolean;
  theaterSitrepRegion: TheaterSitrepRegionId | null;
};

export type UseLiveuaObserveFeedResult = {
  liveuaFeed: LiveuamapFeedPayload | null;
  setLiveuaFeed: Dispatch<SetStateAction<LiveuamapFeedPayload | null>>;
  liveuaEvents: LiveuamapEvent[];
  liveuaToast: LiveuamapEvent | null;
  setLiveuaToast: Dispatch<SetStateAction<LiveuamapEvent | null>>;
  liveuaUnread: number;
  setLiveuaUnread: Dispatch<SetStateAction<number>>;
  liveuaParchmentIndex: number | null;
  setLiveuaParchmentIndex: Dispatch<SetStateAction<number | null>>;
  focusedLiveuaId: string | null;
  setFocusedLiveuaId: Dispatch<SetStateAction<string | null>>;
  focusedLiveuaEvent: LiveuamapEvent | null;
  resetLiveuaUi: () => void;
};

/**
 * 관측(Cesium) LiveUA 피드 폴링 — GlobeDashboard에서 추출.
 * 새 속보는 우상단 레일(LiveuaFlashDock)에 쌓이고 unread 배지만 오른다.
 * 토스트·양피지 자동 오픈·유휴 순환은 하지 않는다 — 유저가 레일에서 직접 연다.
 */
export function useLiveuaObserveFeed({
  isSatelliteViewer,
  theaterSitrepRegion,
}: UseLiveuaObserveFeedOptions): UseLiveuaObserveFeedResult {
  const [liveuaFeed, setLiveuaFeed] = useState<LiveuamapFeedPayload | null>(null);
  const [liveuaToast, setLiveuaToast] = useState<LiveuamapEvent | null>(null);
  const [liveuaUnread, setLiveuaUnread] = useState(0);
  const [liveuaParchmentIndex, setLiveuaParchmentIndex] = useState<number | null>(null);
  const [focusedLiveuaId, setFocusedLiveuaId] = useState<string | null>(null);

  const liveuaSeenIdsRef = useRef<Set<string>>(new Set());
  const liveuaEvents = useMemo(() => liveuaFeed?.events ?? [], [liveuaFeed?.events]);
  const liveuaRotateCursorRef = useRef(0);
  const liveuaCycleStepsRef = useRef(0);

  const focusedLiveuaEvent = useMemo(
    () =>
      focusedLiveuaId
        ? liveuaEvents.find((e) => e.id === focusedLiveuaId) ?? null
        : null,
    [focusedLiveuaId, liveuaEvents],
  );

  const resetLiveuaUi = useCallback(() => {
    setLiveuaParchmentIndex(null);
    setLiveuaToast(null);
  }, []);

  useEffect(() => {
    if (!isSatelliteViewer) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/liveuamap", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as LiveuamapFeedPayload;
        if (cancelled) return;
        const events = payload.events ?? [];
        const seen = liveuaSeenIdsRef.current;
        const isFirst = seen.size === 0;
        const newcomers = events.filter((e) => !seen.has(e.id));
        for (const e of events) seen.add(e.id);
        // 첫 로드는 기존 이력 — unread 로 세지 않는다. 이후 새 이벤트만 배지로 쌓는다.
        if (!isFirst && newcomers.length > 0) {
          setLiveuaUnread((n) => n + newcomers.length);
        }
        setLiveuaFeed(payload);
      } catch {
        if (!cancelled) {
          setLiveuaFeed((prev) =>
            prev
              ? { ...prev, status: "error", error: "fetch failed" }
              : {
                  fetchedAt: new Date().toISOString(),
                  events: [],
                  status: "error",
                  error: "fetch failed",
                  source: "empty",
                },
          );
        }
      }
    };
    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, LIVEUA_FEED_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSatelliteViewer]);

  useEffect(() => {
    if (!isSatelliteViewer || liveuaParchmentIndex == null) return;
    if (theaterSitrepRegion) return;
    const n = liveuaEvents.length;
    if (n <= 0) return;
    const timer = window.setTimeout(() => {
      liveuaCycleStepsRef.current += 1;
      if (liveuaCycleStepsRef.current >= Math.max(1, n)) {
        liveuaCycleStepsRef.current = 0;
        setLiveuaParchmentIndex(null);
        return;
      }
      const next = (liveuaParchmentIndex + 1) % n;
      liveuaRotateCursorRef.current = next;
      setLiveuaParchmentIndex(next);
    }, LIVEUA_PARCHMENT_AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    isSatelliteViewer,
    liveuaParchmentIndex,
    liveuaEvents.length,
    theaterSitrepRegion,
  ]);

  return {
    liveuaFeed,
    setLiveuaFeed,
    liveuaEvents,
    liveuaToast,
    setLiveuaToast,
    liveuaUnread,
    setLiveuaUnread,
    liveuaParchmentIndex,
    setLiveuaParchmentIndex,
    focusedLiveuaId,
    setFocusedLiveuaId,
    focusedLiveuaEvent,
    resetLiveuaUi,
  };
}
