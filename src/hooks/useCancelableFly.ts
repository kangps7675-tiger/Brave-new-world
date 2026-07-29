"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 취소 가능한 자동 fly — 첫 90초 3단계.
 *
 * ── README 금지 조항과의 관계 ─────────────────────────────────────
 * README에는 "입장·로딩 중에는 허브/전장으로 **자동 fly·양피지 금지**"라고
 * 적혀 있다. 그 조항을 통째로 푸는 게 아니라 조건을 바꾼다.
 *
 * 자동 이동이 불안한 이유는 "움직여서"가 아니라 **"멈출 수 없어서"**다.
 * 그래서:
 *   ① 사용자가 지도를 만지면(드래그·휠·터치) 즉시 중단
 *   ② reduced-motion이면 이동 애니메이션 없이 컷 전환
 *   ③ 되돌아갈 수단(「전역으로」)을 항상 제공 — 호출측이 노출
 * 양피지 자동 펼침 금지는 **그대로 유지**한다 (조항의 나머지 절반).
 *
 * 되돌릴 수 있으면 자동은 놀람이 아니라 친절이 된다.
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
  /** 수동 취소 (「전역으로」 버튼 등) */
  cancel: () => void;
};

/** 기본 이동 시간 — reduced-motion이면 0(컷)으로 대체된다 */
export const AUTO_FLY_MS = 2_400;

/**
 * @param flyTo      지도 이동 함수
 * @param mapElement 사용자 입력을 감시할 요소 (보통 지도 컨테이너)
 */
export function useCancelableFly(
  flyTo: FlyFn | null,
  mapElement: HTMLElement | null,
): CancelableFly {
  const [flying, setFlying] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    setFlying(false);
    setCanceled(true);
  }, [clearTimer]);

  const start = useCallback(
    (target: FlyTarget) => {
      if (!flyTo) return;
      const reduced = prefersReducedMotion();
      const duration = reduced ? 0 : AUTO_FLY_MS;

      setCanceled(false);
      setFlying(true);
      flyTo(target.lat, target.lng, target.altitude, duration);

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setFlying(false);
        timerRef.current = null;
      }, duration + 120);
    },
    [clearTimer, flyTo],
  );

  /**
   * 사용자 입력 감시 — fly 중에만.
   * `pointerdown`/`wheel`/`touchstart`는 지도 조작의 시작 신호다.
   * passive 리스너로 등록해 스크롤 성능에 영향을 주지 않는다.
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
