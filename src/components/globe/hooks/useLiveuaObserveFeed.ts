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
import { filterLiveuaEnergySupplyFlashes } from "@/lib/news/energySupplyFlash";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";

const LIVEUA_FEED_POLL_MS = 15_000;
const LIVEUA_PARCHMENT_AUTO_ADVANCE_MS = 12_000;
/** 새 에너지 속보 도착 후 양피지 자동 오픈까지 짧은 유예 */
const LIVEUA_ENERGY_AUTO_OPEN_MS = 1_200;

export type UseLiveuaObserveFeedOptions = {
  isSatelliteViewer: boolean;
  theaterSitrepRegion: TheaterSitrepRegionId | null;
};

export type UseLiveuaObserveFeedResult = {
  liveuaFeed: LiveuamapFeedPayload | null;
  setLiveuaFeed: Dispatch<SetStateAction<LiveuamapFeedPayload | null>>;
  /** 원본 전체 (지도 핀 등) */
  liveuaEvents: LiveuamapEvent[];
  /**
   * 관측대 속보함·양피지용 — 유가·가스·초크·공급망만.
   * 개수 제한 없음.
   */
  liveuaEnergyEvents: LiveuamapEvent[];
  liveuaToast: LiveuamapEvent | null;
  setLiveuaToast: Dispatch<SetStateAction<LiveuamapEvent | null>>;
  /** 에너지 속보 중 미열람 수 */
  liveuaUnread: number;
  liveuaReadIds: ReadonlySet<string>;
  markLiveuaRead: (id: string) => void;
  markAllLiveuaRead: () => void;
  /** liveuaEnergyEvents 기준 인덱스 */
  liveuaParchmentIndex: number | null;
  setLiveuaParchmentIndex: Dispatch<SetStateAction<number | null>>;
  focusedLiveuaId: string | null;
  setFocusedLiveuaId: Dispatch<SetStateAction<string | null>>;
  focusedLiveuaEvent: LiveuamapEvent | null;
  resetLiveuaUi: () => void;
};

/**
 * 관측(Cesium) LiveUA 피드.
 * 속보함·양피지는 유가·가스·초크·공급망만 — 해당하면 몇 개든 큐에 올린다.
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
  const liveuaEnergyEvents = useMemo(
    () => filterLiveuaEnergySupplyFlashes(liveuaEvents),
    [liveuaEvents],
  );

  useEffect(() => {
    if (readState) saveLiveuaReadState(readState);
  }, [readState]);

  const liveuaUnread = useMemo(
    () =>
      readState
        ? liveuaEnergyEvents.filter((e) => isLiveuaUnreadArrival(readState, e.id))
            .length
        : 0,
    [liveuaEnergyEvents, readState],
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
    const ids = liveuaEnergyEvents.map((e) => e.id);
    setReadState((prev) =>
      markLiveuaIdsRead(prev ?? loadLiveuaReadState() ?? createLiveuaReadState(), ids),
    );
  }, [liveuaEnergyEvents]);

  const openedLiveuaId =
    liveuaParchmentIndex != null
      ? liveuaEnergyEvents[liveuaParchmentIndex]?.id ?? null
      : focusedLiveuaId;
  useEffect(() => {
    if (openedLiveuaId) markLiveuaRead(openedLiveuaId);
  }, [openedLiveuaId, markLiveuaRead]);
  const liveuaCycleStepsRef = useRef(0);
  const autoOpenedIdsRef = useRef<Set<string>>(new Set());

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

  /** 에너지 속보가 새로 오면 양피지 자동 오픈 (몇 개든 큐) */
  useEffect(() => {
    if (!isSatelliteViewer || theaterSitrepRegion) return;
    if (liveuaParchmentIndex != null) return;
    if (focusedLiveuaId) return;
    if (!readState || liveuaEnergyEvents.length === 0) return;

    const unreadIdx = liveuaEnergyEvents.findIndex(
      (e) =>
        isLiveuaUnreadArrival(readState, e.id) &&
        !autoOpenedIdsRef.current.has(e.id),
    );
    if (unreadIdx < 0) return;

    const targetId = liveuaEnergyEvents[unreadIdx]!.id;
    const timer = window.setTimeout(() => {
      autoOpenedIdsRef.current.add(targetId);
      liveuaCycleStepsRef.current = 0;
      setLiveuaParchmentIndex(unreadIdx);
    }, LIVEUA_ENERGY_AUTO_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [
    isSatelliteViewer,
    theaterSitrepRegion,
    liveuaParchmentIndex,
    focusedLiveuaId,
    liveuaEnergyEvents,
    readState,
  ]);

  /** 에너지 큐 순환 — 한 바퀴면 닫고 속보함으로 */
  useEffect(() => {
    if (!isSatelliteViewer || liveuaParchmentIndex == null) return;
    if (theaterSitrepRegion) return;
    const n = liveuaEnergyEvents.length;
    if (n <= 0) {
      setLiveuaParchmentIndex(null);
      return;
    }
    const timer = window.setTimeout(() => {
      liveuaCycleStepsRef.current += 1;
      if (liveuaCycleStepsRef.current >= Math.max(1, n)) {
        liveuaCycleStepsRef.current = 0;
        setLiveuaParchmentIndex(null);
        return;
      }
      const next = (liveuaParchmentIndex + 1) % n;
      setLiveuaParchmentIndex(next);
    }, LIVEUA_PARCHMENT_AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    isSatelliteViewer,
    liveuaParchmentIndex,
    liveuaEnergyEvents.length,
    theaterSitrepRegion,
  ]);

  // 에너지 목록이 줄어 인덱스가 벗어나면 보정
  useEffect(() => {
    if (liveuaParchmentIndex == null) return;
    if (liveuaEnergyEvents.length === 0) {
      setLiveuaParchmentIndex(null);
      return;
    }
    if (liveuaParchmentIndex >= liveuaEnergyEvents.length) {
      setLiveuaParchmentIndex(liveuaEnergyEvents.length - 1);
    }
  }, [liveuaEnergyEvents.length, liveuaParchmentIndex]);

  return {
    liveuaFeed,
    setLiveuaFeed,
    liveuaEvents,
    liveuaEnergyEvents,
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
