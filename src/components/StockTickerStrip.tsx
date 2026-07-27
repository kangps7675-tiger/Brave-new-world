"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatTickerChangePercent,
  formatTickerPrice,
  mergeTickerStripSymbols,
  STOCK_TICKER_SYMBOLS,
  tickerChangeTone,
  tickerDisplayName,
  type StockTickerItem,
} from "@/lib/stockTickers";
import type { HeroStatus } from "@/lib/news/types";
import { TICKER_SPIKE_THRESHOLD_PERCENT, type IntelStackMode } from "@/lib/news/intelStackMode";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import { useLocale } from "@/contexts/LocaleContext";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type StockTickersResponse = {
  tickers?: StockTickerItem[];
  error?: string;
};

const TONE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
} as const;

const SPARKLINE_STROKE = {
  up: "#34d399",
  down: "#fb7185",
  flat: "#94a3b8",
} as const;

export type StockTickerStripProps = {
  mode?: IntelStackMode;
  highlightSymbols?: string[];
  alertTone?: HeroStatus;
  /** L2 패널 헤더 라벨 표시 */
  showHeader?: boolean;
  /** 카메라 이동 중 폴링·CSS 스크롤 정지 */
  paused?: boolean;
};

function orderStripSymbols(highlightSymbols: string[]): string[] {
  return mergeTickerStripSymbols(highlightSymbols);
}

function TickerSparkline({
  data,
  tone,
}: {
  data: number[];
  tone: keyof typeof SPARKLINE_STROKE;
}) {
  const width = 52;
  const height = 18;

  if (data.length < 2) {
    return <span className="inline-block h-[18px] w-[52px] shrink-0 rounded bg-white/5" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={SPARKLINE_STROKE[tone]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function SkeletonStrip({ symbols }: { symbols: string[] }) {
  return (
    <div className="flex h-10 min-w-0 items-center gap-4 overflow-hidden px-3">
      {symbols.map((symbol) => {
        const item = STOCK_TICKER_SYMBOLS.find((entry) => entry.symbol === symbol);
        if (!item) return null;
        return (
          <div key={item.symbol} className="flex shrink-0 items-center gap-2">
            <span className="h-3 w-12 animate-pulse rounded bg-white/10" />
            <span className="h-[18px] w-[52px] animate-pulse rounded bg-white/10" />
            <span className="h-3 w-16 animate-pulse rounded bg-white/10" />
            <span className="h-3 w-10 animate-pulse rounded bg-white/10" />
          </div>
        );
      })}
    </div>
  );
}

function formatSpikeBadge(changePercent: number | null): string | null {
  if (changePercent === null || Math.abs(changePercent) < TICKER_SPIKE_THRESHOLD_PERCENT) {
    return null;
  }
  const sign = changePercent > 0 ? "▲" : "▼";
  return `${sign}${Math.abs(changePercent).toFixed(1)}% SPIKE`;
}

function TickerRow({
  item,
  highlighted,
  showSpike,
  lang,
}: {
  item: StockTickerItem;
  highlighted?: boolean;
  showSpike?: boolean;
  lang: LabelLanguage;
}) {
  const tone = tickerChangeTone(item.changePercent);
  const changeText = formatTickerChangePercent(item.changePercent, {
    lang,
    withBasis: true,
  });
  const spikeBadge = showSpike && highlighted ? formatSpikeBadge(item.changePercent) : null;
  const name = tickerDisplayName(item.symbol, lang);
  const titleBits = [item.symbol];
  if (item.asOf) titleBits.push(lang === "en" ? `as of ${item.asOf}` : `${item.asOf} 관측`);
  titleBits.push(lang === "en" ? "change vs prior day" : "등락은 전일 대비");

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap ${
        highlighted ? (spikeBadge ? "ticker-row--spike" : "ticker-row--highlight") : ""
      }`}
    >
      <span className={highlighted ? "font-semibold text-rose-100" : "text-slate-300"} title={titleBits.join(" · ")}>
        {name}
      </span>
      <TickerSparkline data={item.sparkline} tone={tone} />
      <span className={highlighted ? "font-semibold text-white" : "text-slate-100"}>
        {formatTickerPrice(item.price)}
      </span>
      {spikeBadge ? (
        <span className="ticker-spike-badge rounded px-1 py-0.5 text-[10px] font-bold tracking-wide text-rose-100">
          {spikeBadge}
        </span>
      ) : (
        <span className={TONE_CLASS[tone]}>{changeText}</span>
      )}
    </span>
  );
}

function alertStripClass(mode: IntelStackMode, alertTone?: HeroStatus): string {
  if (mode !== "alert" || !alertTone) {
    return "border-y border-white/10 bg-[#0b0c10]/60";
  }
  if (alertTone === "confirmed") return "stock-ticker-strip--alert-confirmed border-y";
  if (alertTone === "unverified") return "stock-ticker-strip--alert-unverified border-y";
  return "stock-ticker-strip--alert-breaking border-y";
}

export function StockTickerStrip({
  mode = "calm",
  highlightSymbols = [],
  alertTone,
  showHeader = false,
  paused = false,
}: StockTickerStripProps) {
  const { lang } = useLocale();
  const [tickers, setTickers] = useState<StockTickerItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const orderedSymbols = useMemo(
    () => orderStripSymbols(highlightSymbols),
    [highlightSymbols],
  );

  const highlightSet = useMemo(() => new Set(highlightSymbols), [highlightSymbols]);

  const refresh = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const res = await fetch("/api/stock-tickers", { cache: "no-store" });
      const payload = (await res.json()) as StockTickersResponse;
      if (res.ok && Array.isArray(payload.tickers) && payload.tickers.length > 0) {
        setTickers(payload.tickers);
      }
    } catch {
      // keep last good values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), liveTickerPollMs());
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div
      className={`pointer-events-auto w-full overflow-hidden backdrop-blur-md ${alertStripClass(mode, alertTone)} ${
        showHeader ? "rounded-b-2xl" : "h-10 rounded-none"
      }`}
      aria-label={t("hoverStockTickerTheater", lang)}
      style={paused ? { animationPlayState: "paused" } : undefined}
    >
      {showHeader ? (
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200/85">
            {t("marketsStripTitle", lang)}
          </span>
          <span className="text-[10px] text-slate-500">
            {mode === "alert"
              ? t("marketsStripAlertHint", lang)
              : highlightSymbols.length > 0
                ? t("marketsStripTheaterHint", lang)
                : t("marketsStripCalmHint", lang)}
          </span>
        </div>
      ) : null}
      {loading && !tickers ? (
        <SkeletonStrip symbols={orderedSymbols} />
      ) : (
        <div className="stock-ticker-scroll flex h-10 items-center gap-5 overflow-x-auto px-3 text-xs font-mono">
          {orderedSymbols.map((symbol) => {
            const item =
              tickers?.find((entry) => entry.symbol === symbol) ??
              (() => {
                const config = STOCK_TICKER_SYMBOLS.find((entry) => entry.symbol === symbol);
                if (!config) return null;
                return {
                  ...config,
                  price: null,
                  changePercent: null,
                  sparkline: [],
                } satisfies StockTickerItem;
              })();
            if (!item) return null;
            const highlighted = highlightSet.has(item.symbol);
            return (
              <TickerRow
                key={item.symbol}
                item={item}
                highlighted={highlighted}
                showSpike={mode === "alert"}
                lang={lang}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
