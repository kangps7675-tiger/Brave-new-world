"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  allowsOnboarding,
  isSequenceActive,
  phaseDurationMs,
  resolveNextPhase,
  showsGtiHero,
  type FirstImpressionPhase,
} from "@/lib/firstImpression";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useCancelableFly } from "@/hooks/useCancelableFly";
import type { HotTheaterFocus } from "@/lib/hotTheaterLayers";
import {
  markHotTheaterSessionApplied,
} from "@/lib/hotTheaterLayers";
import { clampToFirstImpression } from "@/lib/firstImpression";
import type { LayerPrefs } from "@/lib/layerPrefs";

/** 세션당 1회 — 재방문·리프레시에서 다시 연출하지 않음 */
const SESSION_KEY = "geowatch-first-impression-v1";

function sessionAlreadyDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionDone(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

type FlyFn = (
  lat: number,
  lng: number,
  altitude?: number,
  durationMs?: number,
) => void;

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export type FirstImpressionController = {
  phase: FirstImpressionPhase;
  gtiHeroVisible: boolean;
  /** 온보딩 넛지·핫전장 배너를 띄워도 되는가 (done 이후) */
  onboardingReady: boolean;
  /** 시퀀스 진행 중 — 핫전장 배너 억제 */
  suppressHotTheaterOffer: boolean;
};

/**
 * 첫 90초 시퀀스 오케스트레이션.
 *
 * GlobeDashboard는 enabled/데이터/flyTo만 넘기고, 단계 전이·fly·양보는 여기서 처리한다.
 */
export function useFirstImpressionController(options: {
  /** 게이트·피커가 모두 닫힌 뒤에만 true */
  enabled: boolean;
  isPhone: boolean;
  hasGti: boolean;
  hasMarketLink: boolean;
  hotTheaterFocus: HotTheaterFocus | null;
  flyTo: FlyFn;
  mapElement: HTMLElement | null;
  /** fly 단계에서 레이어 패치 적용 */
  onApplyHotTheaterPatch: (patch: Partial<Record<BooleanLayerKey, boolean>>) => void;
  /** 자동 fly로 핫전장을 소비했을 때 — 배너 state 정리용 */
  onHotTheaterAutoConsumed?: () => void;
}): FirstImpressionController {
  const {
    enabled,
    isPhone,
    hasGti,
    hasMarketLink,
    hotTheaterFocus,
    flyTo,
    mapElement,
    onApplyHotTheaterPatch,
    onHotTheaterAutoConsumed,
  } = options;

  const [phase, setPhase] = useState<FirstImpressionPhase>(() =>
    sessionAlreadyDone() ? "done" : "idle",
  );
  const [userTookControl, setUserTookControl] = useState(false);
  const flyStartedRef = useRef(false);
  const focusRef = useRef<HotTheaterFocus | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  if (hotTheaterFocus) focusRef.current = hotTheaterFocus;

  const cancelable = useCancelableFly(flyTo, mapElement);
  const startFlyRef = useRef(cancelable.start);
  startFlyRef.current = cancelable.start;

  const finish = useCallback(() => {
    setPhase("done");
    markSessionDone();
  }, []);

  // 사용자 개입 — 시퀀스 전 구간
  useEffect(() => {
    if (!isSequenceActive(phase) || !mapElement) return;
    const onIntervene = () => setUserTookControl(true);
    const opts: AddEventListenerOptions = { passive: true };
    mapElement.addEventListener("pointerdown", onIntervene, opts);
    mapElement.addEventListener("wheel", onIntervene, opts);
    mapElement.addEventListener("touchstart", onIntervene, opts);
    return () => {
      mapElement.removeEventListener("pointerdown", onIntervene);
      mapElement.removeEventListener("wheel", onIntervene);
      mapElement.removeEventListener("touchstart", onIntervene);
    };
  }, [mapElement, phase]);

  // cancelable fly 취소도 통제권 양보
  useEffect(() => {
    if (cancelable.canceled) setUserTookControl(true);
  }, [cancelable.canceled]);

  // 단계 전이 타이머
  useEffect(() => {
    if (!enabled || phase === "done") return;
    if (sessionAlreadyDone() && phase === "idle") {
      setPhase("done");
      return;
    }

    const reduced = prefersReducedMotion();
    const focus = focusRef.current ?? hotTheaterFocus;
    const input = {
      globeReady: true,
      hasHotTheater: Boolean(focus?.fly),
      hasGti,
      hasMarketLink: hasMarketLink || Boolean(focus?.theaterId || focus?.chokeId),
      userTookControl,
      reducedMotion: reduced,
      isPhone,
    };

    if (phase === "idle") {
      const next = resolveNextPhase("idle", input);
      if (next !== "idle") setPhase(next);
      return;
    }

    if (userTookControl || isPhone) {
      finish();
      return;
    }

    const duration = phaseDurationMs(phase, reduced);

    // fly 단계: 레이어 + 자동 이동 (1회)
    if (phase === "fly" && !flyStartedRef.current && focus?.fly) {
      flyStartedRef.current = true;
      const keep = Object.keys(focus.patch).filter(
        (k) => focus.patch[k as BooleanLayerKey] === true,
      ) as BooleanLayerKey[];
      onApplyHotTheaterPatch(clampToFirstImpression(focus.patch, keep));
      markHotTheaterSessionApplied();
      onHotTheaterAutoConsumed?.();
      startFlyRef.current(focus.fly);
    }

    const advance = () => {
      const next = resolveNextPhase(phaseRef.current, {
        ...input,
        userTookControl: false,
      });
      if (next === "done") finish();
      else setPhase(next);
    };

    if (duration <= 0) {
      advance();
      return;
    }

    const id = window.setTimeout(advance, duration);
    return () => window.clearTimeout(id);
  }, [
    enabled,
    finish,
    hasGti,
    hasMarketLink,
    hotTheaterFocus,
    isPhone,
    onApplyHotTheaterPatch,
    onHotTheaterAutoConsumed,
    phase,
    userTookControl,
  ]);

  return {
    phase,
    gtiHeroVisible: showsGtiHero(phase),
    onboardingReady: allowsOnboarding(phase),
    suppressHotTheaterOffer: isSequenceActive(phase) || phase === "idle",
  };
}
