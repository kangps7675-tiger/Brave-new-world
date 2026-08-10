"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { Z_ABOVE_NAV } from "@/lib/uiStack";
import {
  BRIEFING_STEP_LABELS,
  getBriefingProgress,
  markBriefingStep,
  type BriefingStepId,
} from "@/lib/dailyBriefingProgress";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

const DailyRankSharePanel = dynamic(
  () =>
    import("@/components/DailyRankSharePanel").then((m) => m.DailyRankSharePanel),
  { ssr: false },
);

const PEAK_SHOWN_KEY = "geowatch-peak-end-shown-v1";
const SESSION_START = Date.now();
const PEAK_AFTER_MS = 90_000;

type Props = {
  lang: LabelLanguage;
  /** 게이트·모달 중에는 숨김 */
  suppressed?: boolean;
  /** GTI 칼럼 안에 쌓을 때 fixed 해제 */
  layout?: "fixed" | "stack";
  onOpenDailyPanel?: () => void;
};

/**
 * P3-7 Goal-Gradient — "오늘의 브리핑 N/5" 게이지.
 * Peak-End — 세션 90초 후 또는 4/5 달성 시 "오늘 본 것" 공유 카드.
 */
export function DailyBriefingChrome({
  lang,
  suppressed = false,
  layout = "fixed",
  onOpenDailyPanel,
}: Props) {
  const ko = lang !== "en";
  const [progress, setProgress] = useState(() => getBriefingProgress());
  const [peakOpen, setPeakOpen] = useState(false);
  const [leavingOffer, setLeavingOffer] = useState(false);

  const refresh = useCallback(() => {
    setProgress(getBriefingProgress());
  }, []);

  useEffect(() => {
    const onProg = () => refresh();
    window.addEventListener("geowatch-briefing-progress", onProg);
    return () => window.removeEventListener("geowatch-briefing-progress", onProg);
  }, [refresh]);

  /** Peak-End: 의미 있는 세션 뒤·백그라운드 복귀 시 1회 제안 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(PEAK_SHOWN_KEY) === "1") return;
    } catch {
      return;
    }

    const maybeOffer = () => {
      try {
        if (sessionStorage.getItem(PEAK_SHOWN_KEY) === "1") return;
      } catch {
        return;
      }
      const elapsed = Date.now() - SESSION_START;
      const { done } = getBriefingProgress();
      if (elapsed < PEAK_AFTER_MS && done < 3) return;
      setLeavingOffer(true);
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        // 이탈 직전 신호 — 복귀 시 카드를 띄울 플래그
        try {
          sessionStorage.setItem("geowatch-peak-pending", "1");
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        if (sessionStorage.getItem("geowatch-peak-pending") === "1") {
          sessionStorage.removeItem("geowatch-peak-pending");
          maybeOffer();
        }
      } catch {
        /* ignore */
      }
    };

    const timer = window.setTimeout(maybeOffer, PEAK_AFTER_MS + 500);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const openPeak = useCallback(() => {
    markBriefingStep("share");
    refresh();
    setPeakOpen(true);
    setLeavingOffer(false);
    try {
      sessionStorage.setItem(PEAK_SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }
    onOpenDailyPanel?.();
  }, [onOpenDailyPanel, refresh]);

  const dismissPeakOffer = useCallback(() => {
    setLeavingOffer(false);
    try {
      sessionStorage.setItem(PEAK_SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  if (suppressed) return null;

  const { done, total, steps } = progress;
  const pct = Math.round((done / total) * 100);
  const stacked = layout === "stack";

  const gauge = (
    <div className="rounded-xl border border-sky-400/25 bg-[#071018]/92 px-3 py-2 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-meta font-semibold text-sky-50/95">
          {ko ? `오늘의 브리핑 ${done}/${total}` : `Briefing ${done}/${total}`}
        </p>
        <span className="text-micro tabular-nums text-sky-200/55">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-sky-400/80 transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            transition: prefersReducedMotion() ? "none" : undefined,
          }}
        />
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-1">
        {(Object.keys(steps) as BriefingStepId[]).map((id) => (
          <li
            key={id}
            className={`rounded px-1.5 py-0.5 text-micro ${
              steps[id]
                ? "bg-sky-500/25 text-sky-100"
                : "bg-white/5 text-white/35"
            }`}
          >
            {BRIEFING_STEP_LABELS[id][ko ? "ko" : "en"]}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      {stacked ? (
        <div className="pointer-events-auto w-[min(92vw,16.5rem)]">{gauge}</div>
      ) : (
        <div
          className={`pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+0.5rem+env(safe-area-inset-bottom,0px))] left-3 ${Z_ABOVE_NAV} w-[min(92vw,16.5rem)]`}
        >
          {gauge}
        </div>
      )}

      {leavingOffer && !peakOpen ? (
        <div
          className={`pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+7.5rem+env(safe-area-inset-bottom,0px))] left-3 ${Z_ABOVE_NAV} w-[min(92vw,18rem)]`}
          role="dialog"
          aria-label={ko ? "오늘 본 것" : "Today's glance"}
        >
          <div className="rounded-xl border border-amber-400/35 bg-[#160f04]/96 px-3 py-3 shadow-xl backdrop-blur-md">
            <p className="text-body font-semibold text-amber-50">
              {ko ? "오늘 본 것, 공유할까요?" : "Share what you saw today?"}
            </p>
            <p className="mt-1 text-caption text-amber-100/75">
              {ko
                ? "GTI·위험 순위 카드로 한눈에 정리됩니다."
                : "A quick GTI / risk ranking card."}
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={openPeak}
                className="min-h-[36px] flex-1 rounded-lg border border-amber-300/50 bg-amber-400/20 text-body font-semibold text-amber-50"
              >
                {ko ? "오늘 본 것" : "Today's glance"}
              </button>
              <button
                type="button"
                onClick={dismissPeakOffer}
                className="min-h-[36px] rounded-lg border border-white/12 px-3 text-body text-white/65"
              >
                {ko ? "닫기" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {peakOpen ? (
        <div
          className={`pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+0.5rem+env(safe-area-inset-bottom,0px))] left-1/2 ${Z_ABOVE_NAV} w-[min(94vw,22rem)] -translate-x-1/2`}
        >
          <div className="relative max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-sky-400/30 bg-[#071018]/96 p-2 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              aria-label={ko ? "닫기" : "Close"}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/50 text-sm text-white/70"
              onClick={() => setPeakOpen(false)}
            >
              ✕
            </button>
            <p className="mb-2 px-2 pt-1 text-meta font-semibold text-sky-100">
              {ko ? "오늘 본 것" : "Today's glance"}
            </p>
            <DailyRankSharePanel lang={lang} compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
