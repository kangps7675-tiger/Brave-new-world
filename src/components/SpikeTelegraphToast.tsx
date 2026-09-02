"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/contexts/LocaleContext";
import { tickerDisplayName } from "@/lib/stockTickers";
import type { TickerTelegraphDirection } from "@/lib/tickerSpikeTelegraph";
import { zc } from "@/lib/uiStack";

export type SpikeTelegraphToastPayload = {
  symbol: string;
  changePercent: number;
  direction: TickerTelegraphDirection;
  atMs: number;
};

const AUTO_DISMISS_MS = 8_000;

type SpikeTelegraphToastProps = {
  payload: SpikeTelegraphToastPayload;
  onDismiss: () => void;
  onOpenMarkets: () => void;
  /**
   * dock — 하단 독 위(기본 전보 카드)
   * corner — 뉴스 인사이트 중 좌측 하단 무음 미니 칩
   */
  placement?: "dock" | "corner";
};

function formatLocalHm(atMs: number): string {
  try {
    return new Date(atMs).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export function SpikeTelegraphToast({
  payload,
  onDismiss,
  onOpenMarkets,
  placement = "dock",
}: SpikeTelegraphToastProps) {
  const { lang, t } = useLocale();

  useEffect(() => {
    const id = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [payload.symbol, payload.atMs, onDismiss]);

  const name = tickerDisplayName(payload.symbol, lang);
  const pctAbs = Math.abs(payload.changePercent).toFixed(1);
  const sign = payload.changePercent >= 0 ? "+" : "−";
  const isUp = payload.direction === "up";
  const toneClass = isUp ? "text-emerald-300" : "text-rose-300";
  const trendLabel = isUp ? t("spikeTelegraphTrendUp") : t("spikeTelegraphTrendDown");

  if (placement === "corner") {
    const chip = (
      <div
        className={`pointer-events-auto fixed bottom-[max(5.5rem,calc(var(--bottom-intel-stack-clearance,8.5rem)+0.5rem))] left-3 ${zc("panelScrim")} w-[min(11.5rem,42vw)] overflow-hidden rounded-lg border border-white/12 bg-[#0a0e14]/88 shadow-lg backdrop-blur-md`}
        role="status"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={onOpenMarkets}
          className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left transition hover:bg-white/[0.04]"
        >
          <div className="flex items-center justify-between gap-1">
            <span
              className={`text-micro font-semibold uppercase tracking-[0.14em] ${
                isUp ? "text-emerald-400/80" : "text-rose-400/80"
              }`}
            >
              {trendLabel}
            </span>
            <span className="text-micro text-slate-600">{formatLocalHm(payload.atMs)}</span>
          </div>
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate font-mono text-micro font-medium text-slate-200">
              {payload.symbol}
            </span>
            <span className={`shrink-0 font-mono text-xs font-bold tabular-nums ${toneClass}`}>
              {sign}
              {pctAbs}%
            </span>
          </div>
          <span className="truncate text-micro text-slate-500">{name}</span>
        </button>
      </div>
    );
    if (typeof document === "undefined") return null;
    return createPortal(chip, document.body);
  }

  return (
    <div
      className="pointer-events-auto mb-2 overflow-hidden rounded-xl border border-amber-400/35 bg-[#120e08]/94 shadow-xl backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onOpenMarkets}
        className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition hover:brightness-110"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-micro font-bold uppercase tracking-[0.2em] text-amber-200/90">
            {t("spikeTelegraphStamp")}
          </span>
          <span className="text-micro text-slate-500">{formatLocalHm(payload.atMs)}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-sm font-semibold text-slate-50">{payload.symbol}</span>
          <span className="text-xs text-slate-400">{name}</span>
          <span className={`font-mono text-sm font-bold ${toneClass}`}>
            {sign}
            {pctAbs}%
          </span>
        </div>
        <p className="text-micro text-slate-500">{t("spikeTelegraphHint")}</p>
      </button>
      <div className="flex items-center justify-end border-t border-white/10 px-2 py-1">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-2 py-1 text-micro text-slate-500 transition hover:text-slate-300"
        >
          {t("spikeTelegraphDismiss")}
        </button>
      </div>
    </div>
  );
}
