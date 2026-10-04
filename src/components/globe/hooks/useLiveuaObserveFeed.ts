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
import { emitBreakingDispatchSound } from "@/components/SoundEffectsBridge";
import type { LiveuamapEvent, LiveuamapFeedPayload } from "@/lib/liveuamap/types";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";

const LIVEUA_FEED_POLL_MS = 15_000;
const LIVEUA_PARCHMENT_AUTO_ADVANCE_MS = 12_000;
const LIVEUA_PARCHMENT_IDLE_ROTATE_MS = 18_000;

export type UseLiveuaObserveFeedOptions = {
  isSatelliteViewer: boolean;
  theaterSitrepRegion: TheaterSitrepRegionId | null;
  /** LiveUA parchment opens → clear RSS breaking flash */
  clearBreakingFlash: () => void;
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
 * 관측(Cesium) LiveUA 피드 폴링 · 양피지 자동/유휴 순환 — GlobeDashboard에서 추출.
 */
export function useLiveuaObserveFeed({
  isSatelliteViewer,
  theaterSitrepRegion,
  clearBreakingFlash,
}: UseLiveuaObserveFeedOptions): UseLiveuaObserveFeedResult {
  const [liveuaFeed, setLiveuaFeed] = useState<LiveuamapFeedPayload | null>(null);
  const [liveuaToast, setLiveuaToast] = useState<LiveuamapEvent | null>(null);
  const [liveuaUnread, setLiveuaUnread] = useState(0);
  const [liveuaParchmentIndex, setLiveuaParchmentIndex] = useState<number | null>(null);
  const [focusedLiveuaId, setFocusedLiveuaId] = useState<string | null>(null);

  const liveuaSeenIdsRef = useRef<Set<string>>(new Set());
  const liveuaSoundAtRef = useRef(0);
  const liveuaParchmentOpenRef = useRef(false);
  liveuaParchmentOpenRef.current = liveuaParchmentIndex != null;
  const theaterSitrepOpenRef = useRef(false);
  theaterSitrepOpenRef.current = theaterSitrepRegion != null;
  const liveuaEvents = useMemo(() => liveuaFeed?.events ?? [], [liveuaFeed?.events]);
  const liveuaEventsRef = useRef(liveuaEvents);
  liveuaEventsRef.current = liveuaEvents;
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
        if (
          isFirst &&
          events.length > 0 &&
          !theaterSitrepOpenRef.current &&
          !liveuaParchmentOpenRef.current
        ) {
          clearBreakingFlash();
          liveuaRotateCursorRef.current = 0;
          liveuaCycleStepsRef.current = 0;
          setLiveuaParchmentIndex(0);
          setLiveuaToast(events[0] ?? null);
        } else if (!isFirst && newcomers.length > 0) {
          if (theaterSitrepOpenRef.current) {
            setLiveuaUnread((n) => n + newcomers.length);
          } else {
            const newest = newcomers[0];
            setLiveuaToast(newest);
            const now = Date.now();
            if (now - liveuaSoundAtRef.current >= 5_000) {
              liveuaSoundAtRef.current = now;
              emitBreakingDispatchSound();
            }
            if (!liveuaParchmentOpenRef.current) {
              const idx = events.findIndex((e) => e.id === newest.id);
              if (idx >= 0) {
                clearBreakingFlash();
                liveuaRotateCursorRef.current = idx;
                setLiveuaParchmentIndex(idx);
                setLiveuaUnread((n) => n + Math.max(0, newcomers.length - 1));
              } else {
                setLiveuaUnread((n) => n + newcomers.length);
              }
            } else {
              setLiveuaUnread((n) => n + newcomers.length);
            }
          }
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
  }, [clearBreakingFlash, isSatelliteViewer]);

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

  useEffect(() => {
    if (!isSatelliteViewer || theaterSitrepRegion) return;
    const timer = window.setInterval(() => {
      if (liveuaParchmentOpenRef.current) return;
      if (theaterSitrepOpenRef.current) return;
      const events = liveuaEventsRef.current;
      if (!events.length) return;
      const next = (liveuaRotateCursorRef.current + 1) % events.length;
      liveuaRotateCursorRef.current = next;
      clearBreakingFlash();
      setLiveuaParchmentIndex(next);
    }, LIVEUA_PARCHMENT_IDLE_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [clearBreakingFlash, isSatelliteViewer, theaterSitrepRegion]);

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
