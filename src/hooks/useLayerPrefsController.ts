"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  DEFAULT_LAYER_PREFS,
  loadLayerPrefs,
  saveLayerPrefs,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import {
  clampPrefsToActiveCap,
  enableLayerEvictingCap,
  isLayerCapCountedKey,
} from "@/lib/layerExclusiveCap";
import {
  diffTurnedOffLayers,
  emitLayerCapEvicted,
  onLayerCapUndo,
} from "@/lib/layerCapNotice";

export type LayerRenderIntent = "immediate" | "deferred";

const BATCH_WINDOW_MS = 400;
/**
 * P1-1: 연속 토글 병합 창.
 *
 * 예전 값은 400ms였다 — 도허티 임계(<400ms)와 **정확히 같아서** 안전 마진이 0이었고,
 * 여기에 startTransition + 레이어 재계산이 얹혀 체감은 600~900ms였다.
 * README의 "체크 즉시 지도 반영"과도 맞지 않았다.
 *
 * 120ms로 줄이고 아래 `scheduleBatchFlush`를 leading-edge로 바꿨다.
 * 첫 토글은 기다리지 않고 즉시 반영되고, 폭풍처럼 몰아치는 연속 토글만 병합된다.
 */
const BATCH_DEBOUNCE_MS = 120;
/** 단일 토글 직후 쓰로틀·카메라 동결 우회 유지 시간 */
export const LAYER_IMMEDIATE_RENDER_MS = 900;

const INSTANT_KEYS = new Set<keyof LayerPrefs>(["labelLanguage"]);

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export function useLayerPrefsController(
  deferMapApplyRef?: RefObject<boolean>,
  options?: { ultraLiteRef?: RefObject<boolean> },
) {
  const [layerPrefs, setLayerPrefs] = useState<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const [draftPrefs, setDraftPrefs] = useState<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const [batchPending, setBatchPending] = useState(false);
  const [applyGeneration, setApplyGeneration] = useState(0);

  const draftRef = useRef<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const committedRef = useRef<LayerPrefs>(DEFAULT_LAYER_PREFS);
  const lastToggleAtRef = useRef(0);
  /** 마지막 실제 flush 시각 — leading-edge 판정용 (P1-1) */
  const lastFlushAtRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const immediateUntilRef = useRef(0);
  const ultraLiteRef = options?.ultraLiteRef;

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushPrefs = useCallback(
    (next: LayerPrefs, intent: LayerRenderIntent) => {
      const ultra = ultraLiteRef?.current ?? false;
      const clamped = clampPrefsToActiveCap(next, ultra);
      draftRef.current = clamped;
      // leading-edge 판정 기준 — immediate/deferred 어느 경로든 여기서 기록 (P1-1)
      lastFlushAtRef.current = Date.now();
      if (intent === "immediate") {
        saveLayerPrefs(clamped);
        immediateUntilRef.current = Date.now() + LAYER_IMMEDIATE_RENDER_MS;
      } else {
        // soft batch도 경로 레이어(BRI/DFC 등)가 카메라 쓰로틀에 막히지 않게 짧게 우회
        immediateUntilRef.current = Date.now() + LAYER_IMMEDIATE_RENDER_MS;
        // localStorage 동기 write가 체크 입력과 겹치지 않게
        window.setTimeout(() => saveLayerPrefs(draftRef.current), 0);
      }
      startTransition(() => {
        setLayerPrefs(clamped);
        setDraftPrefs(clamped);
        committedRef.current = clamped;
        // deferred(패널 체크)에서는 generation 강제 재계산을 건너뛰어 순간 정지를 줄임
        if (intent === "immediate") {
          setApplyGeneration((n) => n + 1);
        }
      });
    },
    [ultraLiteRef],
  );

  /**
   * Leading-edge debounce (P1-1).
   *
   * 예전에는 trailing만 있었다 — 체크를 하나 눌러도 무조건 debounce를 다 기다렸다.
   * 사용자 입장에서 **단발 클릭이 가장 흔한데** 그게 가장 느렸다.
   *
   * 이제 마지막 flush로부터 충분히 지났으면 즉시 반영하고(leading),
   * 그 직후 몰아치는 연속 토글만 trailing으로 합친다.
   */
  const scheduleBatchFlush = useCallback(() => {
    const now = Date.now();
    if (now - lastFlushAtRef.current >= BATCH_DEBOUNCE_MS) {
      clearDebounce();
      setBatchPending(false);
      flushPrefs(draftRef.current, "deferred");
      return;
    }

    clearDebounce();
    setBatchPending(true);
    debounceTimerRef.current = setTimeout(() => {
      flushPrefs(draftRef.current, "deferred");
      setBatchPending(false);
      debounceTimerRef.current = null;
    }, BATCH_DEBOUNCE_MS);
  }, [clearDebounce, flushPrefs]);

  useEffect(() => {
    const loaded = loadLayerPrefs();
    const ultra = ultraLiteRef?.current ?? false;
    const clamped = clampPrefsToActiveCap(loaded, ultra);
    draftRef.current = clamped;
    committedRef.current = clamped;
    setLayerPrefs(clamped);
    setDraftPrefs(clamped);
    return () => clearDebounce();
  }, [clearDebounce, ultraLiteRef]);

  const togglePref = useCallback(
    <K extends keyof LayerPrefs>(key: K, value: LayerPrefs[K]) => {
      const ultra = ultraLiteRef?.current ?? false;
      let next: LayerPrefs;
      const before = draftRef.current;

      if (value === true && isLayerCapCountedKey(key)) {
        if (before[key] === true) {
          next = before;
        } else {
          // P2-2: 일반/Ultra 모두 거부 대신 낮은 우선순위 자동 강등
          next = enableLayerEvictingCap(before, key, ultra);
          const evicted = diffTurnedOffLayers(before, next);
          if (evicted.length > 0) {
            emitLayerCapEvicted({ evicted, undo: before });
          }
        }
      } else {
        next = { ...before, [key]: value };
      }

      draftRef.current = next;

      if (INSTANT_KEYS.has(key)) {
        clearDebounce();
        setBatchPending(false);
        flushPrefs(next, "immediate");
        return;
      }

      if (deferMapApplyRef?.current) {
        setDraftPrefs(next);
        return;
      }

      setDraftPrefs(next);

      const now = Date.now();
      const isBurst = now - lastToggleAtRef.current < BATCH_WINDOW_MS;
      lastToggleAtRef.current = now;

      if (isBurst) {
        scheduleBatchFlush();
      } else {
        clearDebounce();
        setBatchPending(false);
        flushPrefs(next, "immediate");
      }
    },
    [clearDebounce, deferMapApplyRef, flushPrefs, scheduleBatchFlush, ultraLiteRef],
  );

  /** 카테고리 전체 켜기/끄기 — 항상 배치 모드 */
  const toggleCategoryPrefs = useCallback(
    (updates: Partial<Record<BooleanLayerKey, boolean>>) => {
      const ultra = ultraLiteRef?.current ?? false;
      const before = draftRef.current;
      let next = { ...before, ...updates };
      next = clampPrefsToActiveCap(next, ultra);
      const evicted = diffTurnedOffLayers(before, next);
      if (evicted.length > 0) emitLayerCapEvicted({ evicted, undo: before });
      draftRef.current = next;
      lastToggleAtRef.current = Date.now();
      setDraftPrefs(next);
      if (deferMapApplyRef?.current) return;
      scheduleBatchFlush();
    },
    [deferMapApplyRef, scheduleBatchFlush, ultraLiteRef],
  );

  const isLayerRenderImmediate = useCallback(() => {
    return Date.now() < immediateUntilRef.current;
  }, []);

  const flushPendingPrefs = useCallback(() => {
    if (debounceTimerRef.current == null) return;
    clearDebounce();
    setBatchPending(false);
    flushPrefs(draftRef.current, "deferred");
  }, [clearDebounce, flushPrefs]);

  const applyLayerPrefs = useCallback(
    (next: LayerPrefs) => {
      clearDebounce();
      setBatchPending(false);
      flushPrefs(next, "immediate");
    },
    [clearDebounce, flushPrefs],
  );

  /** 강등 토스트 [되돌리기] — prefs 스냅샷 복원 */
  useEffect(() => {
    return onLayerCapUndo((undo) => {
      clearDebounce();
      setBatchPending(false);
      flushPrefs(undo, "immediate");
    });
  }, [clearDebounce, flushPrefs]);

  /**
   * 레이어 패널 체크용 — 지도에는 곧 반영하되 immediate 우회·동기 재계산을 피함.
   * 연속 토글은 BATCH_DEBOUNCE_MS로 합쳐서 한 번만 flush.
   * deferMapApplyRef가 true면 지도에 안 올리고 draft만 갱신 (확인 바에서 적용).
   */
  const patchLayerPrefsSoft = useCallback(
    (patch: Partial<LayerPrefs>) => {
      const ultra = ultraLiteRef?.current ?? false;
      const before = draftRef.current;
      let next = { ...before, ...patch };
      next = clampPrefsToActiveCap(next, ultra);
      const evicted = diffTurnedOffLayers(before, next);
      if (evicted.length > 0) emitLayerCapEvicted({ evicted, undo: before });
      draftRef.current = next;
      lastToggleAtRef.current = Date.now();
      setDraftPrefs(next);

      if (deferMapApplyRef?.current) {
        return;
      }

      const onlyInstant =
        Object.keys(patch).length > 0 &&
        Object.keys(patch).every((k) => INSTANT_KEYS.has(k as keyof LayerPrefs));
      if (onlyInstant) {
        clearDebounce();
        setBatchPending(false);
        flushPrefs(next, "immediate");
        return;
      }
      scheduleBatchFlush();
    },
    [clearDebounce, deferMapApplyRef, flushPrefs, scheduleBatchFlush, ultraLiteRef],
  );

  /** 패널 체크만 초안 — 지도/저장은 건드리지 않음 */
  const patchDraftOnly = useCallback(
    (patch: Partial<LayerPrefs>) => {
      const ultra = ultraLiteRef?.current ?? false;
      let next = { ...draftRef.current, ...patch };
      next = clampPrefsToActiveCap(next, ultra);
      draftRef.current = next;
      setDraftPrefs(next);
    },
    [ultraLiteRef],
  );

  /** 미적용 draft를 현재 지도(committed)로 되돌림 */
  const discardDraftPrefs = useCallback(() => {
    clearDebounce();
    setBatchPending(false);
    const committed = committedRef.current;
    draftRef.current = committed;
    setDraftPrefs(committed);
  }, [clearDebounce]);

  return {
    layerPrefs,
    draftPrefs,
    togglePref,
    toggleCategoryPrefs,
    applyLayerPrefs,
    patchLayerPrefsSoft,
    patchDraftOnly,
    discardDraftPrefs,
    flushPendingPrefs,
    batchPending,
    applyGeneration,
    immediateUntilRef,
    isLayerRenderImmediate,
  };
}
