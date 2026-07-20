"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { theaterLabel } from "@/lib/uiStrings";
import { tickerDisplayName, type MarketReactionItem } from "@/lib/stockTickers";
import type { TheaterMarketFilter } from "@/lib/theaterAssets";
import type { ViewerMode } from "@/lib/viewPackages";
import type { LogisticsChokepointId } from "@/data/majorEventTimeline";
import {
  eventMarketAnchorForViewerMode,
  pickCounterfactualSymbol,
  type EventMarketAnchor,
} from "@/lib/eventMarketAnchors";
import { renderCounterfactualInvestCard } from "@/lib/counterfactualInvestCard";
import { shareOrDownloadImageBlob } from "@/lib/captureShareImage";
import { trackEvent } from "@/lib/trackClient";

type CounterfactualInvestCardProps = {
  theater: TheaterMarketFilter;
  ageMinutes: number;
  /** conflict=지정학 타임테이블, economy=경제·시장 타임테이블 */
  viewerMode?: ViewerMode;
  chokepointId?: LogisticsChokepointId | null;
  /** 히어로 스트립용 — 더 크게 */
  prominent?: boolean;
};

type ReactionPayload = {
  items?: MarketReactionItem[];
  anchor?: EventMarketAnchor | null;
  at?: string | null;
  source?: "catalog" | "date" | "age";
  preferredSymbols?: string[];
};

const STAKE_KRW = 1_000_000;
const STAKE_USD = 1_000;

function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function formatDollar(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** theaterLabel은 NewsTheater 전용 — "all"(전체) 케이스만 별도 처리 */
function safeTheaterLabel(theater: TheaterMarketFilter, lang: "ko" | "en"): string {
  if (theater === "all") return lang === "en" ? "this event" : "이 사건";
  return theaterLabel(theater, lang);
}

/**
 * "그때 샀으면 얼마였을까" 반사실 카드.
 * - conflict: 전장 개전·위기 시점
 * - economy: 경제 타임테이블(금·VIX·증시) 또는 초크포인트 물류 앵커
 */
export function CounterfactualInvestCard({
  theater,
  ageMinutes,
  viewerMode = "conflict",
  chokepointId = null,
  prominent = false,
}: CounterfactualInvestCardProps) {
  const { lang } = useLocale();
  const ko = lang !== "en";
  const isEconomy = viewerMode === "economy";
  const [payload, setPayload] = useState<ReactionPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const catalog = useMemo(
    () =>
      eventMarketAnchorForViewerMode({
        viewerMode,
        theater,
        chokepointId,
      }),
    [viewerMode, theater, chokepointId],
  );

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      theater,
      mode: "counterfactual",
      viewerMode,
      ageMinutes: String(Math.round(ageMinutes)),
    });
    if (catalog) {
      params.set("anchorDate", catalog.anchorDate);
      params.set("anchorId", catalog.id);
    }
    if (chokepointId) params.set("chokepointId", chokepointId);
    fetch(`/api/stock-tickers/reaction?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: ReactionPayload) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setPayload({ items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [theater, ageMinutes, viewerMode, chokepointId, catalog?.id, catalog?.anchorDate]);

  if (payload === null) return null;

  const preferred = payload.preferredSymbols ?? catalog?.preferredSymbols ?? [];
  const top = pickCounterfactualSymbol(payload.items ?? [], preferred);
  if (!top || top.changePercentSinceEvent == null) return null;

  const pct = top.changePercentSinceEvent;
  const isGain = pct >= 0;
  const resultKrw = STAKE_KRW * (1 + pct / 100);
  const resultUsd = STAKE_USD * (1 + pct / 100);
  const symbol = top.symbol;
  const symbolName = tickerDisplayName(symbol, lang);
  const priceAt = top.priceAt;
  const priceNow = top.priceNow;
  const anchor = payload.anchor ?? catalog;
  const eventLabel = anchor
    ? ko
      ? anchor.labelKo
      : anchor.labelEn
    : safeTheaterLabel(theater, lang);
  const dateHint = anchor?.anchorDate
    ? ko
      ? `${anchor.anchorDate} 기준`
      : `as of ${anchor.anchorDate}`
    : null;
  const priceHint =
    priceAt != null && priceNow != null
      ? ko
        ? `당시 ${priceAt.toLocaleString("en-US", { maximumFractionDigits: 2 })} → 지금 ${priceNow.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
        : `${priceAt.toLocaleString("en-US", { maximumFractionDigits: 2 })} then → ${priceNow.toLocaleString("en-US", { maximumFractionDigits: 2 })} now`
      : null;
  const laneHint = isEconomy
    ? ko
      ? "경제 타임테이블"
      : "Economy timeline"
    : ko
      ? "지정학 타임테이블"
      : "Geopolitics timeline";

  async function handleShare() {
    if (busy) return;
    trackEvent(
      "counterfactual_card_share_click",
      { theater, symbol, viewerMode },
      { lang, viewerMode },
    );
    setBusy(true);
    try {
      const blob = await renderCounterfactualInvestCard({
        lang: ko ? "ko" : "en",
        changePercent: pct,
        symbolLabel: symbolName,
        eventLabel,
        stakeKrw: STAKE_KRW,
        stakeUsd: STAKE_USD,
      });
      if (!blob) return;
      await shareOrDownloadImageBlob(
        blob,
        `what-if-${theater}.png`,
        ko
          ? isEconomy
            ? "만약에 — 시장과 이익"
            : "만약에 — 전쟁과 이익"
          : isEconomy
            ? "What if — markets & profit"
            : "What if — war & profit",
        ko
          ? `${eventLabel} 날 ${symbolName}에 넣었다면 지금 ${formatWon(resultKrw)}`
          : `Had you bought ${symbolName} on ${eventLabel}, it'd be ${formatDollar(resultUsd)} now`,
      );
      trackEvent(
        "counterfactual_card_share_success",
        { theater, symbol, viewerMode },
        { lang, viewerMode },
      );
    } finally {
      setBusy(false);
    }
  }

  const accentBorder = isEconomy ? "border-emerald-400/20" : "border-amber-400/20";
  const accentBg = isEconomy
    ? "from-black/35 via-emerald-950/20 to-black/25"
    : "from-black/35 via-amber-950/20 to-black/25";
  const accentLabel = isEconomy ? "text-emerald-200/90" : "text-amber-200/90";
  const accentBtn =
    isEconomy
      ? "border-emerald-400/30 text-emerald-200/80 hover:border-emerald-300/50 hover:text-emerald-100"
      : "border-amber-400/30 text-amber-200/80 hover:border-amber-300/50 hover:text-amber-100";

  return (
    <div
      className={`border-t bg-gradient-to-r ${accentBorder} ${accentBg} ${
        prominent ? "px-3.5 py-2.5" : "px-3 py-2"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 font-semibold uppercase tracking-wide ${accentLabel} ${
            prominent ? "text-[10px]" : "text-[9px]"
          }`}
        >
          {ko ? "만약에" : "What if"}
        </span>
        <span className={`min-w-0 flex-1 truncate text-slate-400 ${prominent ? "text-[11px]" : "text-[10px]"}`}>
          {ko
            ? `${eventLabel} 날 ${symbolName}에 넣었다면`
            : `Had you bought ${symbolName} on ${eventLabel} —`}
        </span>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={busy}
          className={`shrink-0 rounded border bg-black/30 px-2 py-1 text-[9px] font-medium transition disabled:opacity-40 ${accentBtn}`}
        >
          {ko ? "공유" : "Share"}
        </button>
      </div>
      <p
        className={`mt-1.5 font-mono font-bold ${isGain ? "text-emerald-300" : "text-rose-300"} ${
          prominent ? "text-xl" : "text-base"
        }`}
      >
        {ko ? `지금 ${formatWon(resultKrw)}` : `now ${formatDollar(resultUsd)}`}
        <span className="ml-2 text-[11px] font-semibold text-slate-400">
          ({isGain ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      </p>
      {dateHint || priceHint ? (
        <p className="mt-1 text-[9px] leading-snug text-slate-500">
          {[laneHint, dateHint, priceHint].filter(Boolean).join(" · ")}
        </p>
      ) : (
        <p className="mt-1 text-[9px] leading-snug text-slate-500">{laneHint}</p>
      )}
      <p className="mt-1 text-[9px] leading-snug text-slate-600">
        {ko
          ? `${formatWon(STAKE_KRW)} 가정 · 실제 투자 조언 아님 · 수수료·세금 미반영`
          : "Hypothetical stake · not investment advice · excludes fees & taxes"}
      </p>
    </div>
  );
}
