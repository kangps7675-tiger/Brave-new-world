"use client";

import { useEffect } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { tickerDisplayName } from "@/lib/stockTickers";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import type { TickerTelegraphDirection } from "@/lib/tickerSpikeTelegraph";

export type SpikeTelegraphBannerOffer = {
  symbol: string;
  changePercent: number;
  direction: TickerTelegraphDirection;
  atMs: number;
  /** 초단위 창(초). 없으면 일봉 기준 카피 */
  changeWindowSec?: number;
};

type SpikeTelegraphBannerProps = {
  offer: SpikeTelegraphBannerOffer;
  lang: LabelLanguage;
  onDismiss: () => void;
  onOpenMarkets: () => void;
};

const COPY = {
  ko: {
    headline: "선물 SPIKE",
    stamp: "전보 · DISPATCH",
    hint: "투자 권유 아님 · 탭하면 인사이트 양피지",
    dismiss: "닫기",
    up: "오름세",
    down: "내림세",
  },
  en: {
    headline: "Futures SPIKE",
    stamp: "DISPATCH",
    hint: "Not advice · tap for insight letter",
    dismiss: "Dismiss",
    up: "Up",
    down: "Down",
  },
} as const;

/**
 * Databento 선물 급등락 — 웹 상단 고정 배너.
 * 공습경보와 같은 자리(z-800) · 호박 전보 톤으로 구분.
 */
export function SpikeTelegraphBanner({
  offer,
  lang,
  onDismiss,
  onOpenMarkets,
}: SpikeTelegraphBannerProps) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const name = tickerDisplayName(offer.symbol, lang);
  const pctAbs = Math.abs(offer.changePercent).toFixed(1);
  const sign = offer.changePercent >= 0 ? "+" : "−";
  const isUp = offer.direction === "up";

  useEffect(() => {
    if (prefersReducedMotion()) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(30);
      }
    } catch {
      /* ignore */
    }
  }, [offer.symbol, offer.atMs]);

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[800] w-[min(94vw,32rem)] -translate-x-1/2"
      role="alert"
      aria-live="assertive"
      aria-labelledby="spike-telegraph-title"
      aria-describedby="spike-telegraph-body"
    >
      <div
        className={`relative overflow-hidden rounded-none border shadow-[0_18px_56px_rgba(20,12,0,0.55)] ${
          isUp
            ? "border-emerald-300/70 bg-emerald-950"
            : "border-rose-300/70 bg-rose-950"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 w-1 ${isUp ? "bg-emerald-300" : "bg-rose-300"}`}
          aria-hidden
        />
        <button
          type="button"
          onClick={onOpenMarkets}
          className="relative w-full border-b border-white/10 px-4 py-3 pl-5 text-left transition hover:brightness-110"
        >
          <p
            id="spike-telegraph-title"
            className="text-micro font-bold uppercase tracking-[0.2em] text-amber-200/90"
          >
            {copy.stamp}
            <span className="ml-2 font-semibold tracking-wide text-amber-50/90">
              {copy.headline}
            </span>
            <span
              className={`ml-2 text-meta font-medium ${
                isUp ? "text-emerald-200/90" : "text-rose-200/90"
              }`}
            >
              {isUp ? copy.up : copy.down}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[16px] font-semibold text-white">
            <span className="font-mono">{offer.symbol}</span>
            <span className="text-sm font-medium text-white/70">{name}</span>
            <span
              className={`font-mono text-[16px] font-bold ${
                isUp ? "text-emerald-200" : "text-rose-200"
              }`}
            >
              {sign}
              {pctAbs}%
            </span>
          </p>
          <p id="spike-telegraph-body" className="mt-1 text-meta text-white/65">
            {copy.hint}
          </p>
        </button>
        <div className="relative flex justify-end bg-black/25 px-3 py-1.5 pl-5">
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-none border border-white/20 bg-black/30 px-2.5 py-1 text-meta text-white/80 transition hover:bg-black/50"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
