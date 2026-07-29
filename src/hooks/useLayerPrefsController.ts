"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  DEFAULT_LAYER_PREFS,
  loadLayerPrefs,
  saveLayerPrefs,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import {
  activeLayerCap,
  canEnableLayer,
  clampPrefsToActiveCap,
  enableLayerEvictingCap,
  enableLayerWithCap,
  isLayerCapCountedKey,
} from "@/lib/layerExclusiveCap";
import { emitLayerCapRejected } from "@/lib/layerCapNotice";

export type LayerRenderIntent = "immediate" | "deferred";

const BATCH_WINDOW_MS = 400;
const BATCH_DEBOUNCE_MS = 400;
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

  const scheduleBatchFlush = useCallback(() => {
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

      if (value === true && isLayerCapCountedKey(key)) {
        if (!canEnableLayer(draftRef.current, key, ultra)) {
          // 일반: 거부. Ultra: 낮은 우선순위 레이어를 비워 자리 확보
          if (ultra) {
            next = enableLayerEvictingCap(draftRef.current, key, true);
          } else {
            /**
             * 예전에는 여기서 그냥 return했다("패널이 경고"라는 전제).
             * 그런데 레이어를 켜는 경로는 패널만이 아니다 — 퀵 드롭다운·고정 토글·
             * 「묻기」는 아무 반응 없이 실패했다. 거부 사실을 알려서
             * 조용한 실패를 없앤다. (레이어 패널은 자체 인라인 경고를 계속 쓴다.)
             */
            emitLayerCapRejected({
              key: String(key),
              cap: activeLayerCap(ultra),
              ultraLite: ultra,
            });
            return;
          }
        } else {
          next = enableLayerWithCap(draftRef.current, key, ultra);
        }
      } else {
        next = { ...draftRef.current, [key]: value };
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
      let next = { ...draftRef.current, ...updates };
      next = clampPrefsToActiveCap(next, ultra);
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

  /**
   * 레이어 패널 체크용 — 지도에는 곧 반영하되 immediate 우회·동기 재계산을 피함.
   * 연속 토글은 BATCH_DEBOUNCE_MS로 합쳐서 한 번만 flush.
   * deferMapApplyRef가 true면 지도에 안 올리고 draft만 갱신 (확인 바에서 적용).
   */
  const patchLayerPrefsSoft = useCallback(
    (patch: Partial<LayerPrefs>) => {
      const ultra = ultraLiteRef?.current ?? false;
      let next = { ...draftRef.current, ...patch };
      next = clampPrefsToActiveCap(next, ultra);
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
