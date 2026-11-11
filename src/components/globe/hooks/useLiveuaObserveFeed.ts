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
import { translateTextsBatch } from "@/lib/koreanTranslate";
import { applyKoPatches, bodyNeedsKo, titleNeedsKo, type KoPatch } from "@/lib/liveuamap/koFallback";

const LIVEUA_FEED_POLL_MS = 15_000;
/** 속보함·양피지 큐에 올리는 최근 구간 — 그 이전 이력은 지도 핀으로만 */
const LIVEUA_BREAKING_WINDOW_MS = 6 * 60 * 60 * 1000;
/** 하이브리드전 사건은 드물어 더 길게 큐에 둔다 */
const LIVEUA_HYBRID_WINDOW_MS = 24 * 60 * 60 * 1000;
/** 큐 상한 — 최신순으로 자른다 */
const LIVEUA_BREAKING_MAX = 30;

export type UseLiveuaObserveFeedOptions = {
  /**
   * 피드 폴링 여부. 기본은 위성 뷰어일 때만이지만, 일반 지도의 사건 스택도
   * 같은 피드를 쓰므로 호출 쪽에서 true로 켠다. 양피지 자동 오픈·순환은 위성 뷰어 전용으로 유지.
   */
  pollFeed?: boolean;
  /**
   * 한글 UI일 때 true — 서버가 못 채운(번역 실패로 비었거나 영어 그대로인) titleKo·bodyKo를
   * 클라이언트에서 한 번 더 번역해 속보함·양피지·사건 스택이 한글로 보이게 한다.
   */
  koreanFallback?: boolean;
};

export type UseLiveuaObserveFeedResult = {
  liveuaFeed: LiveuamapFeedPayload | null;
  setLiveuaFeed: Dispatch<SetStateAction<LiveuamapFeedPayload | null>>;
  /** 원본 전체 (지도 핀 등) */
  liveuaEvents: LiveuamapEvent[];
  /**
   * 관측대 속보함·양피지용 — 주제 무관, 최근 6시간 최신순 (최대 30건).
   * 양피지 자동 오픈은 접속 후 새로 들어온 것만.
   */
  liveuaBreakingEvents: LiveuamapEvent[];
  liveuaToast: LiveuamapEvent | null;
  setLiveuaToast: Dispatch<SetStateAction<LiveuamapEvent | null>>;
  /** 속보 큐 중 미열람 수 */
  liveuaUnread: number;
  liveuaReadIds: ReadonlySet<string>;
  markLiveuaRead: (id: string) => void;
  markAllLiveuaRead: () => void;
  /** liveuaBreakingEvents 기준 인덱스 */
  liveuaParchmentIndex: number | null;
  setLiveuaParchmentIndex: Dispatch<SetStateAction<number | null>>;
  focusedLiveuaId: string | null;
  setFocusedLiveuaId: Dispatch<SetStateAction<string | null>>;
  focusedLiveuaEvent: LiveuamapEvent | null;
  resetLiveuaUi: () => void;
};

/**
 * 관측(Cesium) LiveUA 피드.
 * 속보함·양피지는 주제 구분 없이 최근 속보 — 자동 오픈은 접속 후 새로 도착한 것만.
 */
export function useLiveuaObserveFeed({
  pollFeed,
  koreanFallback = false,
}: UseLiveuaObserveFeedOptions): UseLiveuaObserveFeedResult {
  const shouldPoll = pollFeed ?? false;
  const [liveuaFeed, setLiveuaFeed] = useState<LiveuamapFeedPayload | null>(null);
  const [liveuaToast, setLiveuaToast] = useState<LiveuamapEvent | null>(null);
  const [readState, setReadState] = useState<LiveuaReadState | null>(null);
  const [liveuaParchmentIndex, setLiveuaParchmentIndex] = useState<number | null>(null);
  const [focusedLiveuaId, setFocusedLiveuaId] = useState<string | null>(null);

  const rawLiveuaEvents = useMemo(() => liveuaFeed?.events ?? [], [liveuaFeed?.events]);

  // 클라이언트 한글 보강 — 번역 요청은 이벤트당 한 번만(실패해도 다시 두들기지 않는다)
  const [koPatches, setKoPatches] = useState<ReadonlyMap<string, KoPatch>>(() => new Map());
  const koRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!koreanFallback) return;
    const pending = rawLiveuaEvents
      .filter((ev) => !koRequestedRef.current.has(ev.id) && (titleNeedsKo(ev) || bodyNeedsKo(ev)))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, 40);
    if (pending.length === 0) return;
    for (const ev of pending) koRequestedRef.current.add(ev.id);
    void (async () => {
      for (let i = 0; i < pending.length; i += 10) {
        const slice = pending.slice(i, i + 10);
        const texts: string[] = [];
        const refs: { id: string; field: "titleKo" | "bodyKo" }[] = [];
        for (const ev of slice) {
          if (titleNeedsKo(ev)) {
            texts.push(ev.title);
            refs.push({ id: ev.id, field: "titleKo" });
          }
          if (bodyNeedsKo(ev)) {
            texts.push(ev.body.slice(0, 800));
            refs.push({ id: ev.id, field: "bodyKo" });
          }
        }
        if (texts.length === 0) continue;
        const out = await translateTextsBatch(texts, "ko");
        setKoPatches((prev) => {
          const next = new Map(prev);
          refs.forEach((r, idx) => {
            next.set(r.id, { ...(next.get(r.id) ?? {}), [r.field]: out[idx] });
          });
          return next;
        });
      }
    })();
  }, [koreanFallback, rawLiveuaEvents]);

  const liveuaEvents = useMemo(
    () => applyKoPatches(rawLiveuaEvents, koPatches),
    [rawLiveuaEvents, koPatches],
  );
  const liveuaBreakingEvents = useMemo(() => {
    const now = Date.now();
    const cutoff = now - LIVEUA_BREAKING_WINDOW_MS;
    const hybridCutoff = now - LIVEUA_HYBRID_WINDOW_MS;
    return liveuaEvents
      .map((e) => ({ e, at: Date.parse(e.publishedAt) }))
      .filter(
        ({ e, at }) =>
          Number.isFinite(at) &&
          at >= ((e.tags ?? []).includes("hybrid") ? hybridCutoff : cutoff),
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, LIVEUA_BREAKING_MAX)
      .map(({ e }) => e);
  }, [liveuaEvents]);

  useEffect(() => {
    if (readState) saveLiveuaReadState(readState);
  }, [readState]);

  const liveuaUnread = useMemo(
    () =>
      readState
        ? liveuaBreakingEvents.filter((e) => isLiveuaUnreadArrival(readState, e.id))
            .length
        : 0,
    [liveuaBreakingEvents, readState],
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
    const ids = liveuaBreakingEvents.map((e) => e.id);
    setReadState((prev) =>
      markLiveuaIdsRead(prev ?? loadLiveuaReadState() ?? createLiveuaReadState(), ids),
    );
  }, [liveuaBreakingEvents]);

  const openedLiveuaId =
    liveuaParchmentIndex != null
      ? liveuaBreakingEvents[liveuaParchmentIndex]?.id ?? null
      : focusedLiveuaId;
  useEffect(() => {
    if (openedLiveuaId) markLiveuaRead(openedLiveuaId);
  }, [openedLiveuaId, markLiveuaRead]);
  /** 이 접속에서 첫 피드에 이미 들어 있던 id — 자동 오픈 대상이 아니다 */
  const baselineIdsRef = useRef<Set<string> | null>(null);

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
    if (!shouldPoll) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/liveuamap", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as LiveuamapFeedPayload;
        if (cancelled) return;
        const ids = (payload.events ?? []).map((e) => e.id);
        if (baselineIdsRef.current === null && payload.status !== "error") {
          baselineIdsRef.current = new Set(ids);
        }
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
  }, [shouldPoll]);

  // 속보 목록이 줄어 인덱스가 벗어나면 보정
  useEffect(() => {
    if (liveuaParchmentIndex == null) return;
    if (liveuaBreakingEvents.length === 0) {
      setLiveuaParchmentIndex(null);
      return;
    }
    if (liveuaParchmentIndex >= liveuaBreakingEvents.length) {
      setLiveuaParchmentIndex(liveuaBreakingEvents.length - 1);
    }
  }, [liveuaBreakingEvents.length, liveuaParchmentIndex]);

  return {
    liveuaFeed,
    setLiveuaFeed,
    liveuaEvents,
    liveuaBreakingEvents,
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
