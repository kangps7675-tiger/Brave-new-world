"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  formatTickerChangePercent,
  tickerChangeTone,
  tickerDisplayName,
  verdictLabel,
  type MarketReactionItem,
  type MarketReactionVerdict,
} from "@/lib/stockTickers";
import type { TheaterMarketFilter } from "@/lib/theaterAssets";

type EventMarketReactionCardProps = {
  theater: TheaterMarketFilter;
  ageMinutes: number;
  /** 히어로 스트립용 — 더 크게 */
  prominent?: boolean;
};

type ReactionPayload = {
  items?: MarketReactionItem[];
  verdict?: MarketReactionVerdict;
  peakSigma?: number | null;
  marketOpen?: boolean;
};

const TONE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-slate-400",
} as const;

const VERDICT_CLASS: Record<MarketReactionVerdict, string> = {
  impact: "border-rose-400/45 bg-rose-500/15 text-rose-200",
  mild: "border-amber-400/40 bg-amber-500/12 text-amber-200",
  none: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  pending: "border-slate-600/40 bg-slate-700/10 text-slate-400",
};

/**
 * "이 사건이 시장에 영향을 줬나" 판정 카드.
 * prominent=true면 기본 펼침·큰 타이포로 알림 상단에 꽂는다.
 */
export function EventMarketReactionCard({
  theater,
  ageMinutes,
  prominent = false,
}: EventMarketReactionCardProps) {
  const { lang } = useLocale();
  const ko = lang !== "en";
  const [payload, setPayload] = useState<ReactionPayload | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      theater,
      ageMinutes: String(Math.round(ageMinutes)),
    });
    fetch(`/api/stock-tickers/reaction?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: ReactionPayload) => {
        if (!cancelled) {
          setPayload(data);
          if (data.verdict === "impact" || data.verdict === "mild" || prominent) {
            setExpanded(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPayload({ items: [], verdict: "pending" });
      });
    return () => {
      cancelled = true;
    };
  }, [theater, ageMinutes, prominent]);

  if (payload === null) {
    return (
      <div
        className={`border-t border-white/8 bg-black/20 ${prominent ? "px-3.5 py-2.5" : "px-3 py-1.5"}`}
      >
        <span className="text-[10px] text-slate-600">…</span>
      </div>
    );
  }

  const items = (payload.items ?? []).filter((item) => item.changePercentSinceEvent !== null);
  const verdict: MarketReactionVerdict = payload.verdict ?? "pending";
  if (items.length === 0) return null;

  const peak = payload.peakSigma;
  const sigmaText =
    peak != null && Number.isFinite(peak) ? `${Math.abs(peak).toFixed(1)}σ` : null;
  const headline =
    verdict === "impact"
      ? ko
        ? "이 사건 → 시장이 흔들림"
        : "This event moved markets"
      : verdict === "mild"
        ? ko
          ? "이 사건 → 약한 시장 반응"
          : "Mild market reaction"
        : verdict === "none"
          ? ko
            ? "이 사건 → 뚜렷한 시장 영향 없음"
            : "No clear market impact"
          : ko
            ? "시장 영향 판정 중"
            : "Assessing market impact";

  return (
    <div
      className={`border-t border-amber-400/20 bg-gradient-to-r from-black/35 via-amber-950/20 to-black/25 ${
        prominent ? "px-3.5 py-2.5" : "px-3 py-2"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`shrink-0 font-semibold uppercase tracking-wide text-amber-200/90 ${
            prominent ? "text-[10px]" : "text-[9px]"
          }`}
        >
          {ko ? "전쟁 ↔ 이익" : "War ↔ Markets"}
        </span>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-semibold ${VERDICT_CLASS[verdict]} ${
            prominent ? "text-[11px]" : "text-[10px]"
          }`}
        >
          {verdictLabel(verdict, ko)}
        </span>
        {sigmaText && verdict !== "pending" ? (
          <span className="font-mono text-[10px] text-slate-400">{sigmaText}</span>
        ) : null}
        <span
          className={`min-w-0 flex-1 truncate ${prominent ? "text-[12px] text-slate-200" : "text-[10px] text-slate-400"}`}
        >
          {headline}
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-slate-500">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
          {items.map((item) => {
            const tone = tickerChangeTone(item.changePercentSinceEvent);
            const excess = item.excessChangePercent;
            return (
              <div
                key={item.symbol}
                className={`flex items-baseline justify-between gap-2 ${
                  prominent ? "text-[12px]" : "text-[10px]"
                }`}
              >
                <span className="min-w-0 truncate text-slate-300" title={item.symbol}>
                  {tickerDisplayName(item.symbol, lang)}
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className={`font-mono font-semibold ${TONE_CLASS[tone]}`}>
                    {formatTickerChangePercent(item.changePercentSinceEvent)}
                  </span>
                  {excess != null ? (
                    <span className="font-mono text-slate-500">
                      {ko ? "지수대비 " : "vs idx "}
                      {formatTickerChangePercent(excess)}
                    </span>
                  ) : null}
                  {item.sigma != null && Number.isFinite(item.sigma) ? (
                    <span className="font-mono text-slate-500">
                      {Math.abs(item.sigma).toFixed(1)}σ
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
          <p className="pt-0.5 text-[9px] leading-snug text-slate-500">
            {ko
              ? "S&P500 동일구간 변동을 뺀 뒤, 종목별 평소 일간 변동폭(σ)으로 환산한 값입니다."
              : "Benchmark-adjusted move, scaled by each symbol’s typical daily volatility (σ)."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
