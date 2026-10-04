"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  nextStraitId,
  OBSERVE_STRAIT_DEFAULT_ID,
  OBSERVE_STRAIT_TOUR_DWELL_MS,
  OBSERVE_STRAIT_TOUR_FLY_MS,
  observeStraitPreset,
  type ObserveStraitId,
} from "@/lib/cesiumStraitScene";
import {
  getStraitReplayEnabled,
  subscribeStraitReplayEnabled,
} from "@/lib/straitReplay/uiBridge";

type FlyFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
  camera?: { pitch?: number; bearing?: number },
) => void;

/**
 * 관측 모드 — 호르무즈 → 홍해·수에즈 → 말라카 자동 순회.
 * 유저가 fly/클릭하면 일시정지(수동 resume).
 */
export function useObserveStraitTour(options: {
  enabled: boolean;
  ready: boolean;
  flyTo: FlyFn;
  /** 딥링크·안건 포커스가 있으면 투어 시작 안 함 */
  hasPendingFly: boolean;
}) {
  const [activeId, setActiveId] = useState<ObserveStraitId>(OBSERVE_STRAIT_DEFAULT_ID);
  const [touring, setTouring] = useState(true);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const bootDoneRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const straitHistoryOn = useSyncExternalStore(
    subscribeStraitReplayEnabled,
    getStraitReplayEnabled,
    () => false,
  );

  const flyToPreset = useCallback(
    (id: ObserveStraitId, durationMs = OBSERVE_STRAIT_TOUR_FLY_MS) => {
      const p = observeStraitPreset(id);
      options.flyTo(p.lat, p.lng, p.altitude, durationMs, {
        pitch: p.pitch,
        bearing: p.bearing,
      });
      setActiveId(id);
    },
    [options.flyTo],
  );

  const pauseTour = useCallback(() => {
    setTouring(false);
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeTour = useCallback(() => {
    setTouring(true);
  }, []);

  const goToStrait = useCallback(
    (id: ObserveStraitId) => {
      pauseTour();
      flyToPreset(id);
    },
    [flyToPreset, pauseTour],
  );

  // 해협 이력이 켜지면 라이브 순회 정지
  useEffect(() => {
    if (straitHistoryOn) pauseTour();
  }, [pauseTour, straitHistoryOn]);

  // 관측 진입 시 호르무즈 스냅 → 이후 자동 순회
  // 속보/안건/딥링크 진입이면 카메라를 덮지 않고 순회만 끈 채 대기
  useEffect(() => {
    if (!options.enabled) {
      bootDoneRef.current = false;
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!options.ready) return;
    if (bootDoneRef.current) return;
    bootDoneRef.current = true;
    if (options.hasPendingFly) {
      setTouring(false);
      return;
    }
    setTouring(true);
    flyToPreset(OBSERVE_STRAIT_DEFAULT_ID, OBSERVE_STRAIT_TOUR_FLY_MS);
  }, [
    flyToPreset,
    options.enabled,
    options.hasPendingFly,
    options.ready,
  ]);

  // dwell 후 다음 해협
  useEffect(() => {
    if (!options.enabled || !options.ready || !touring || straitHistoryOn) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setTimeout(() => {
      const next = nextStraitId(activeIdRef.current);
      flyToPreset(next);
    }, OBSERVE_STRAIT_TOUR_DWELL_MS);
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    activeId,
    flyToPreset,
    options.enabled,
    options.ready,
    straitHistoryOn,
    touring,
  ]);

  return {
    activeId,
    activePreset: observeStraitPreset(activeId),
    touring,
    pauseTour,
    resumeTour,
    goToStrait,
    setActiveId,
  };
}
