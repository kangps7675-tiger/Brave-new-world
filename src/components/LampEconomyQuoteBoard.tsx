"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { LampFeaturedNews } from "@/lib/news/periodicBriefing";
import { pickEconomyLampRelatedSymbols } from "@/lib/news/lampEconomyRelatedTickers";
import { liveTickerPollMs } from "@/lib/liveRenderGuard";
import {
  formatTickerChangePercent,
  formatTickerPrice,
  tickerChangeTone,
  tickerDisplayName,
  yahooQuoteUrl,
  type StockTickerItem,
} from "@/lib/stockTickers";

type Props = {
  news: LampFeaturedNews[];
  lang: LabelLanguage;
};

type StockTickersResponse = {
  tickers?: StockTickerItem[];
};

type LadderLevel = {
  price: number;
  qty: number;
  side: "ask" | "bid";
};

/**
 * 지경학 등불 좌측 — 관련 기업 호가창 UI.
 * 매도(파랑) / 매수(빨강) 레이어. 잔량은 표시용 합성(실시간 order book 아님).
 */
export function LampEconomyQuoteBoard({ news, lang }: Props) {
  const symbols = useMemo(() => pickEconomyLampRelatedSymbols(news, 6), [news]);
  const symbolSet = useMemo(() => new Set(symbols), [symbols]);
  const [tickers, setTickers] = useState<StockTickerItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stock-tickers", { cache: "no-store" });
      const data = (await res.json()) as StockTickersResponse;
      if (res.ok && Array.isArray(data.tickers) && data.tickers.length > 0) {
        setTickers(data.tickers);
      }
    } catch {
      /* keep last */
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
    if (!tickers) return [];
    const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));
    return symbols
      .map((sym) => bySymbol.get(sym))
      .filter((t): t is StockTickerItem => t != null && symbolSet.has(t.symbol));
  }, [tickers, symbols, symbolSet]);

  useEffect(() => {
    if (rows.length === 0) {
      setActiveSymbol(null);
      return;
    }
    if (!activeSymbol || !rows.some((r) => r.symbol === activeSymbol)) {
      setActiveSymbol(rows[0]!.symbol);
    }
  }, [rows, activeSymbol]);

  const active = rows.find((r) => r.symbol === activeSymbol) ?? rows[0] ?? null;

  const title = lang === "en" ? "Related order book" : "관련 기업 호가";
  const hint =
    lang === "en"
      ? "Blue = ask · Red = bid · display ladder (not live depth) · not advice"
      : "파랑=매도 · 빨강=매수 · 표시용 호가 레이어(실시간 잔량 아님) · 투자 권유 아님";

  return (
    <div className="lamp-quote-board mt-4 px-1">
      <p className="mb-1 text-micro font-semibold uppercase tracking-[0.18em] text-[#3d2a18]">
        {title}
      </p>
      <p className="mb-2 text-meta leading-snug text-[#5a4428]">{hint}</p>

      {loading && rows.length === 0 ? (
        <p className="py-3 text-center text-caption text-[#5a4428]">
          {lang === "en" ? "Loading quotes…" : "시세 불러오는 중…"}
        </p>
      ) : rows.length === 0 || !active ? (
        <p className="py-3 text-center text-caption text-[#5a4428]">
          {lang === "en" ? "Quotes unavailable right now." : "시세를 불러오지 못했습니다."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-[#8b6914]/35 bg-[#fbf4e4] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
          {/* 종목 탭 */}
          <div className="flex gap-0.5 overflow-x-auto border-b border-[#8b6914]/25 bg-[#efe2c0]/80 px-1 py-1">
            {rows.map((item) => {
              const tone = tickerChangeTone(item.changePercent);
              const selected = item.symbol === active.symbol;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setActiveSymbol(item.symbol)}
                  className={`shrink-0 rounded-sm px-2 py-1 text-left transition ${
                    selected
                      ? "bg-[#fffaf0] ring-1 ring-[#8b6914]/40"
                      : "hover:bg-[#f7ecd4]"
                  }`}
                >
                  <span className="block max-w-[4.8rem] truncate text-[0.65rem] font-medium text-[#3d2a18]">
                    {tickerDisplayName(item.symbol, lang)}
                  </span>
                  <span
                    className={`block text-[0.62rem] font-semibold tabular-nums ${
                      tone === "up"
                        ? "quote-up text-[#b42318]"
                        : tone === "down"
                          ? "quote-down text-[#1d4ed8]"
                          : "text-[#6b4a22]"
                    }`}
                  >
                    {formatTickerChangePercent(item.changePercent)}
                  </span>
                </button>
              );
            })}
          </div>

          <OrderBookPanel item={active} lang={lang} />
        </div>
      )}
    </div>
  );
}

function OrderBookPanel({
  item,
  lang,
}: {
  item: StockTickerItem;
  lang: LabelLanguage;
}) {
  const tone = tickerChangeTone(item.changePercent);
  const name = tickerDisplayName(item.symbol, lang);
  const ladder = useMemo(() => buildDisplayLadder(item), [item]);
  const maxQty = Math.max(1, ...ladder.map((l) => l.qty));
  const asks = ladder.filter((l) => l.side === "ask").reverse();
  const bids = ladder.filter((l) => l.side === "bid");
  const priceColor =
    tone === "up"
      ? "quote-up text-[#b42318]"
      : tone === "down"
        ? "quote-down text-[#1d4ed8]"
        : "text-[#3d2a18]";

  return (
    <div>
      <div className="flex items-end justify-between gap-2 border-b border-[#8b6914]/25 bg-[#fffaf0] px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-caption font-semibold text-[#3d2a18]">{name}</p>
          <p className="text-micro tabular-nums text-[#6b4a22]">{item.symbol}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-[1.15rem] font-bold tabular-nums leading-none ${priceColor}`}>
            {formatTickerPrice(item.price)}
          </p>
          <p className={`mt-0.5 text-micro font-semibold tabular-nums ${priceColor}`}>
            {formatTickerChangePercent(item.changePercent, { withBasis: true, lang })}
          </p>
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1 border-b border-[#8b6914]/25 bg-[#f7ecd4]/80 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em]">
        <span className="quote-ask text-left text-[#1d4ed8]">
          {lang === "en" ? "Ask qty" : "매도잔량"}
        </span>
        <span className="text-center text-[#6b4a22]">
          {lang === "en" ? "Price" : "호가"}
        </span>
        <span className="quote-bid text-right text-[#b42318]">
          {lang === "en" ? "Bid qty" : "매수잔량"}
        </span>
      </div>

      <div className="bg-[#fffaf0] px-1.5 py-1 font-mono text-[0.7rem] leading-none">
        {/* 매도 — 파란 레이어 */}
        {asks.map((level) => (
          <LadderRow key={`ask-${level.price}`} level={level} maxQty={maxQty} />
        ))}

        {/* 현재가 구분선 */}
        <div
          className={`my-0.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-sm px-1 py-1.5 ${
            tone === "up"
              ? "bg-[#fecaca]/80 ring-1 ring-[#b42318]/40"
              : tone === "down"
                ? "bg-[#bfdbfe]/80 ring-1 ring-[#1d4ed8]/40"
                : "bg-[#efe2c0]/90 ring-1 ring-[#8b6914]/35"
          }`}
        >
          <span className="text-micro font-medium text-[#6b4a22]">
            {lang === "en" ? "Last" : "현재"}
          </span>
          <span className={`px-1 text-center text-[0.8rem] font-bold tabular-nums ${priceColor}`}>
            {formatTickerPrice(item.price)}
          </span>
          <span className="text-right text-micro font-medium text-[#6b4a22]">
            {lang === "en" ? "Last" : "현재"}
          </span>
        </div>

        {/* 매수 — 빨간 레이어 */}
        {bids.map((level) => (
          <LadderRow key={`bid-${level.price}`} level={level} maxQty={maxQty} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#8b6914]/25 bg-[#f7ecd4]/70 px-2.5 py-1.5">
        <p className="text-[0.58rem] leading-snug text-[#5a4428]">
          {lang === "en"
            ? "Synthetic depth for UI · not exchange order book"
            : "UI용 합성 호가 · 거래소 잔량 아님"}
        </p>
        <a
          href={yahooQuoteUrl(item.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="quote-link shrink-0 text-micro font-medium text-[#1d4ed8] underline-offset-2 hover:underline"
        >
          {lang === "en" ? "Yahoo" : "시세"}
        </a>
      </div>
    </div>
  );
}

function LadderRow({
  level,
  maxQty,
}: {
  level: LadderLevel;
  maxQty: number;
}) {
  const widthPct = Math.max(8, Math.round((level.qty / maxQty) * 100));
  const isAsk = level.side === "ask";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1 py-[1px]">
      {/* 매도 잔량 (왼쪽, 파랑) */}
      <div className="relative flex h-5 items-center justify-end overflow-hidden rounded-[1px]">
        {isAsk ? (
          <>
            <div
              className="absolute inset-y-0 right-0 bg-[#93c5fd]/70"
              style={{ width: `${widthPct}%` }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 right-0 border-r-2 border-[#1d4ed8]"
              style={{ width: `${widthPct}%` }}
              aria-hidden
            />
            <span className="quote-ask relative z-[1] pr-1 font-semibold tabular-nums text-[#1e3a8a]">
              {formatQty(level.qty)}
            </span>
          </>
        ) : null}
      </div>

      {/* 호가 */}
      <div
        className={`flex min-w-[4.2rem] items-center justify-center px-1 font-semibold tabular-nums ${
          isAsk
            ? "quote-ask bg-[#dbeafe] text-[#1d4ed8]"
            : "quote-bid bg-[#fee2e2] text-[#b42318]"
        }`}
      >
        {formatLadderPrice(level.price)}
      </div>

      {/* 매수 잔량 (오른쪽, 빨강) */}
      <div className="relative flex h-5 items-center justify-start overflow-hidden rounded-[1px]">
        {!isAsk ? (
          <>
            <div
              className="absolute inset-y-0 left-0 bg-[#fca5a5]/70"
              style={{ width: `${widthPct}%` }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 left-0 border-l-2 border-[#b42318]"
              style={{ width: `${widthPct}%` }}
              aria-hidden
            />
            <span className="quote-bid relative z-[1] pl-1 font-semibold tabular-nums text-[#7f1d1d]">
              {formatQty(level.qty)}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** 표시용 호가 사다리 — 현재가·스파크라인 변동폭으로 합성 */
function buildDisplayLadder(item: StockTickerItem): LadderLevel[] {
  const price = item.price;
  if (price == null || !Number.isFinite(price) || price <= 0) return [];

  const spark = item.sparkline.filter((n) => Number.isFinite(n) && n > 0);
  const span =
    spark.length >= 2
      ? Math.max(Math.abs(Math.max(...spark) - Math.min(...spark)) / spark.length, price * 0.0008)
      : price * 0.0015;
  const tick = niceTick(span);

  const seed = hashSymbol(item.symbol);
  const levels: LadderLevel[] = [];

  for (let i = 5; i >= 1; i -= 1) {
    levels.push({
      price: roundPrice(price + tick * i),
      qty: 40 + ((seed * (i + 3)) % 220) + i * 12,
      side: "ask",
    });
  }
  for (let i = 1; i <= 5; i += 1) {
    levels.push({
      price: roundPrice(price - tick * i),
      qty: 45 + ((seed * (i + 7)) % 210) + i * 10,
      side: "bid",
    });
  }
  return levels;
}

function niceTick(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0.01;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const nice = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return nice * pow;
}

function roundPrice(price: number): number {
  if (price >= 1000) return Math.round(price * 100) / 100;
  if (price >= 100) return Math.round(price * 100) / 100;
  if (price >= 1) return Math.round(price * 1000) / 1000;
  return Math.round(price * 10000) / 10000;
}

function formatLadderPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function formatQty(qty: number): string {
  if (qty >= 1000) return `${(qty / 1000).toFixed(1)}k`;
  return String(Math.round(qty));
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}
