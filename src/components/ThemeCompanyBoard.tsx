"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatTickerChangePercent,
  formatTickerPrice,
  tickerChangeTone,
  tickerDisplayName,
  yahooQuoteUrl,
  type StockTickerItem,
} from "@/lib/stockTickers";
import {
  companyThemeNote,
  companyThemeSymbols,
  type CompanyThemeId,
} from "@/lib/themeCompanyAssets";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import { useLocale } from "@/contexts/LocaleContext";

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

function TickerSparkline({
  data,
  tone,
}: {
  data: number[];
  tone: keyof typeof SPARKLINE_STROKE;
}) {
  const width = 72;
  const height = 28;

  if (data.length < 2) {
    return <span className="block h-7 w-full rounded bg-white/5" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={SPARKLINE_STROKE[tone]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function matchesTickerSearch(
  item: StockTickerItem,
  query: string,
  lang: "ko" | "en",
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = tickerDisplayName(item.symbol, lang).toLowerCase();
  return (
    name.includes(q) ||
    item.label.toLowerCase().includes(q) ||
    item.symbol.toLowerCase().includes(q)
  );
}

type ThemeCompanyBoardProps = {
  themeId: CompanyThemeId;
  fullPage?: boolean;
  searchQuery?: string;
};

export function ThemeCompanyBoard({
  themeId,
  fullPage = false,
  searchQuery = "",
}: ThemeCompanyBoardProps) {
  const { lang, t } = useLocale();
  const [tickers, setTickers] = useState<StockTickerItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const symbols = useMemo(() => companyThemeSymbols(themeId), [themeId]);
  const symbolSet = useMemo(() => new Set(symbols), [symbols]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stock-tickers", { cache: "no-store" });
      const data = (await res.json()) as StockTickersResponse;
      if (res.ok && Array.isArray(data.tickers) && data.tickers.length > 0) {
        setTickers(data.tickers);
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

  const rows = useMemo(() => {
    const bySymbol = new Map((tickers ?? []).map((item) => [item.symbol, item]));
    return symbols
      .map((symbol) => {
        const hit = bySymbol.get(symbol);
        if (hit) return hit;
        return {
          symbol,
          label: symbol,
          price: null,
          changePercent: null,
          sparkline: [],
        } satisfies StockTickerItem;
      })
      .filter((item) => matchesTickerSearch(item, searchQuery, lang));
  }, [tickers, symbols, searchQuery, lang]);

  const accent =
    themeId === "defense"
      ? "border-sky-400/20 bg-sky-950/20"
      : "border-emerald-400/20 bg-emerald-950/20";
  const note = companyThemeNote(themeId, lang);

  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 ${
        fullPage ? "pb-8" : ""
      }`}
    >
      <div className={`mb-3 rounded-xl border px-3 py-2.5 ${accent}`}>
        <p className="text-meta leading-snug text-slate-200/90">{note}</p>
        <p className="mt-1 text-micro text-slate-500">{t("marketsNotAdvice")}</p>
      </div>

      {loading && tickers == null ? (
        <p className="py-10 text-center text-sm text-slate-500">
          {lang === "en" ? "Loading quotes…" : "시세 불러오는 중…"}
        </p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          {searchQuery.trim()
            ? lang === "en"
              ? `No matches for “${searchQuery.trim()}”.`
              : `“${searchQuery.trim()}” 검색 결과가 없습니다.`
            : lang === "en"
              ? "No symbols in this board."
              : "표시할 종목이 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((item) => {
            const tone = tickerChangeTone(item.changePercent);
            const name = tickerDisplayName(item.symbol, lang);
            const inCatalog = symbolSet.has(item.symbol);
            if (!inCatalog) return null;
            return (
              <li
                key={item.symbol}
                className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-50">{name}</p>
                    <p className="text-micro text-slate-500">{item.symbol}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-100">
                      {formatTickerPrice(item.price)}
                    </p>
                    <p className={`text-micro font-medium tabular-nums ${TONE_CLASS[tone]}`}>
                      {formatTickerChangePercent(item.changePercent)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <TickerSparkline data={item.sparkline} tone={tone} />
                  </div>
                  <a
                    href={yahooQuoteUrl(item.symbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-micro font-medium text-emerald-300/80 underline-offset-2 hover:text-emerald-200 hover:underline"
                  >
                    {t("openYahoo")}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-center text-micro text-slate-600">
        Yahoo Finance · 10분 캐시 · {t("marketsNotAdvice")}
      </p>
    </div>
  );
}
