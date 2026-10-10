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
import {
  createLiveuaReadState,
  isLiveuaUnreadArrival,
  loadLiveuaReadState,
  markLiveuaIdsRead,
  registerLiveuaArrivals,
  saveLiveuaReadState,
  type LiveuaReadState,
} from "@/lib/liveuamap/readState";
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
  /** 첫 방문 이후 도착했고 아직 열지 않은 속보 수 */
  liveuaUnread: number;
  liveuaReadIds: ReadonlySet<string>;
  markLiveuaRead: (id: string) => void;
  markAllLiveuaRead: () => void;
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
 * 양피지·포커스 카드로 연 속보는 읽음으로 남는다 (localStorage, 48시간).
 */
export function useLiveuaObserveFeed({
  isSatelliteViewer,
  theaterSitrepRegion,
}: UseLiveuaObserveFeedOptions): UseLiveuaObserveFeedResult {
  const [liveuaFeed, setLiveuaFeed] = useState<LiveuamapFeedPayload | null>(null);
  const [liveuaToast, setLiveuaToast] = useState<LiveuamapEvent | null>(null);
  const [readState, setReadState] = useState<LiveuaReadState | null>(null);
  const [liveuaParchmentIndex, setLiveuaParchmentIndex] = useState<number | null>(null);
  const [focusedLiveuaId, setFocusedLiveuaId] = useState<string | null>(null);

  const liveuaEvents = useMemo(() => liveuaFeed?.events ?? [], [liveuaFeed?.events]);

  useEffect(() => {
    if (readState) saveLiveuaReadState(readState);
  }, [readState]);

  const liveuaUnread = useMemo(
    () =>
      readState
        ? liveuaEvents.filter((e) => isLiveuaUnreadArrival(readState, e.id)).length
        : 0,
    [liveuaEvents, readState],
  );

  const liveuaReadIds = useMemo(
    () => new Set(Object.keys(readState?.read ?? {})),
    [readState],
  );

  const markLiveuaRead = useCallback((id: string) => {
    setReadState((prev) =>
      markLiveuaIdsRead(prev ?? loadLiveuaReadState() ?? createLiveuaReadState(), [id]),
    );
  }, []);

  const markAllLiveuaRead = useCallback(() => {
    const ids = liveuaEvents.map((e) => e.id);
    setReadState((prev) =>
      markLiveuaIdsRead(prev ?? loadLiveuaReadState() ?? createLiveuaReadState(), ids),
    );
  }, [liveuaEvents]);

  const openedLiveuaId =
    liveuaParchmentIndex != null
      ? liveuaEvents[liveuaParchmentIndex]?.id ?? null
      : focusedLiveuaId;
  useEffect(() => {
    if (openedLiveuaId) markLiveuaRead(openedLiveuaId);
  }, [openedLiveuaId, markLiveuaRead]);
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
        const ids = (payload.events ?? []).map((e) => e.id);
        const nowMs = Date.now();
        // 첫 방문이면 since = 지금 → 이번에 받은 이력은 배지로 세지 않는다
        setReadState((prev) =>
          registerLiveuaArrivals(
            prev ?? loadLiveuaReadState(nowMs) ?? createLiveuaReadState(nowMs),
            ids,
            nowMs,
          ),
        );
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
    liveuaReadIds,
    markLiveuaRead,
    markAllLiveuaRead,
    liveuaParchmentIndex,
    setLiveuaParchmentIndex,
    focusedLiveuaId,
    setFocusedLiveuaId,
    focusedLiveuaEvent,
    resetLiveuaUi,
  };
}
