"use client";

import { useEffect, useMemo, useState } from "react";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  buildFuturesSpikeInsightBriefing,
  companionParagraphFromCounterfactual,
  type FuturesSpikeInsightBriefing,
} from "@/lib/futuresSpikeInsight";
import type { SpikeTelegraphBannerOffer } from "@/components/SpikeTelegraphBanner";
import { tickerDisplayName } from "@/lib/stockTickers";
import { pickCounterfactualSymbol } from "@/lib/eventMarketAnchors";
import type { MarketReactionItem } from "@/lib/stockTickers";

type FuturesSpikeInsightParchmentProps = {
  offer: SpikeTelegraphBannerOffer;
  lang: LabelLanguage;
  onDismiss: () => void;
};

type ReactionPayload = {
  items?: MarketReactionItem[];
  anchor?: { labelKo: string; labelEn: string } | null;
};

/**
 * 선물 SPIKE → 드롭캡+사진 두괄식 양피지.
 * 오픈 직후 counterfactual 1회로 과거 동행 단락을 보강한다.
 */
export function FuturesSpikeInsightParchment({
  offer,
  lang,
  onDismiss,
}: FuturesSpikeInsightParchmentProps) {
  const [companion, setCompanion] = useState<string | null>(null);

  const base = useMemo(
    () => buildFuturesSpikeInsightBriefing(offer, lang),
    [offer, lang],
  );

  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    const params = new URLSearchParams({
      theater: base.theater,
      mode: "counterfactual",
      viewerMode: "economy",
      ageMinutes: "5",
    });
    void fetch(`/api/stock-tickers/reaction?${params.toString()}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: ReactionPayload) => {
        if (cancelled) return;
        const preferred = [base.symbol];
        const top = pickCounterfactualSymbol(data.items ?? [], preferred);
        if (!top || top.changePercentSinceEvent == null) return;
        const anchor = data.anchor;
        const eventLabel = anchor
          ? lang === "en"
            ? anchor.labelEn
            : anchor.labelKo
          : lang === "en"
            ? "prior crisis"
            : "과거 위기";
        setCompanion(
          companionParagraphFromCounterfactual(lang, {
            eventLabel,
            symbolLabel: tickerDisplayName(top.symbol, lang === "en" ? "en" : "ko"),
            changePercent: top.changePercentSinceEvent,
          }),
        );
      })
      .catch(() => {
        /* keep lead + background only */
      });
    return () => {
      cancelled = true;
    };
  }, [base, lang]);

  const briefing: FuturesSpikeInsightBriefing | null = useMemo(() => {
    if (!base) return null;
    if (!companion) return base;
    return buildFuturesSpikeInsightBriefing(offer, lang, {
      companionParagraph: companion,
    });
  }, [base, companion, offer, lang]);

  if (!briefing) return null;

  const desk =
    lang === "en"
      ? "Futures desk · Databento · Not advice"
      : "선물 데스크 · Databento · 투자 권유 아님";

  return (
    <ParchmentLetter
      key={`${offer.symbol}-${offer.atMs}-${companion ? "full" : "base"}`}
      lang={lang}
      title={briefing.title}
      paragraphs={briefing.paragraphs}
      signOff={desk}
      ctaLabel={lang === "en" ? "Understood" : "확인"}
      onContinue={onDismiss}
      playUnfoldSound
      playBreakingDispatch
      breakingDispatchBed={briefing.dispatchBed}
      typewriter
      blackInk
      leadImageUrl={briefing.imageUrl}
      dropCap
      titleId="futures-spike-insight-title"
      zIndexClass="z-[900]"
    />
  );
}
