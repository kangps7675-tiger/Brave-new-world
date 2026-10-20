"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 취소 가능한 자동 fly — 첫 90초 3단계.
 *
 * 자동 이동이 불안한 이유는 "움직여서"가 아니라 **"멈출 수 없어서"**다.
 * P3-4: 개입 시 중단만이 아니라 **목적지 스냅**(duration 0) — 양피지 타자 스킵과 동일 원칙.
 */

export type FlyTarget = { lat: number; lng: number; altitude: number };

type FlyFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
) => void;

export type CancelableFly = {
  /** fly가 진행 중인가 */
  flying: boolean;
  /** 사용자가 개입해 취소됐는가 */
  canceled: boolean;
  /** 자동 이동 시작 */
  start: (target: FlyTarget) => void;
  /** 수동 취소 (「전역으로」 버튼 등) — 목적지 스냅 포함 */
  cancel: () => void;
};

/** 기본 이동 시간 — reduced-motion이면 0(컷)으로 대체된다 */
export const AUTO_FLY_MS = 2_400;

/**
 * @param flyTo      지도 이동 함수
 * @param mapElement 사용자 입력을 감지할 요소 (보통 지도 컨테이너)
 */
export function useCancelableFly(
  flyTo: FlyFn | null,
  mapElement: HTMLElement | null,
): CancelableFly {
  const [flying, setFlying] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef<FlyTarget | null>(null);
  const flyToRef = useRef(flyTo);
  flyToRef.current = flyTo;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    const target = targetRef.current;
    const fn = flyToRef.current;
    clearTimer();
    if (target && fn) {
      // P3-4: 애니메이션이 사용자를 인질로 잡지 않도록 목적지 즉시 스냅
      fn(target.lat, target.lng, target.altitude, 0);
    }
    targetRef.current = null;
    setFlying(false);
    setCanceled(true);
  }, [clearTimer]);

  const start = useCallback(
    (target: FlyTarget) => {
      if (!flyTo) return;
      const reduced = prefersReducedMotion();
      const duration = reduced ? 0 : AUTO_FLY_MS;

      targetRef.current = target;
      setCanceled(false);
      setFlying(true);
      flyTo(target.lat, target.lng, target.altitude, duration);

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setFlying(false);
        targetRef.current = null;
        timerRef.current = null;
      }, duration + 120);
    },
    [clearTimer, flyTo],
  );

  /**
   * 사용자 입력 감시 — fly 중에만.
   * `pointerdown`/`wheel`/`touchstart`는 지도 조작의 시작 신호다.
   */
  useEffect(() => {
    if (!flying || !mapElement) return;
    const onIntervene = () => cancel();
    const opts: AddEventListenerOptions = { passive: true };
    mapElement.addEventListener("pointerdown", onIntervene, opts);
    mapElement.addEventListener("wheel", onIntervene, opts);
    mapElement.addEventListener("touchstart", onIntervene, opts);
    return () => {
      mapElement.removeEventListener("pointerdown", onIntervene);
      mapElement.removeEventListener("wheel", onIntervene);
      mapElement.removeEventListener("touchstart", onIntervene);
    };
  }, [cancel, flying, mapElement]);

  useEffect(() => clearTimer, [clearTimer]);

  return { flying, canceled, start, cancel };
}
