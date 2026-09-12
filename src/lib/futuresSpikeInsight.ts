/**
 * 선물 SPIKE → 양피지 투자 인사이트 브리핑 (두괄식 카피 + 전장·이미지).
 */

import type { SpikeTelegraphBannerOffer } from "@/components/SpikeTelegraphBanner";
import type { BreakingDispatchBed } from "@/components/SoundEffectsBridge";
import { FUTURES_LIVE_CHANGE_WINDOW_SEC } from "@/lib/databento/futuresLiveConstants";
import {
  isDatabentoFuturesSymbol,
  type DatabentoFuturesYahooSymbol,
} from "@/lib/databento/symbolMap";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import { tickerDisplayName } from "@/lib/stockTickers";

export type FuturesSpikeInsightBriefing = {
  id: string;
  title: string;
  paragraphs: string[];
  imageUrl: string;
  theater: NewsTheater;
  symbol: DatabentoFuturesYahooSymbol;
  changePercent: number;
  changeWindowSec: number;
  dispatchBed: BreakingDispatchBed;
};

type SymbolInsightMeta = {
  theater: NewsTheater;
  imagePath: string;
  axisKo: string;
  axisEn: string;
};

const META: Record<DatabentoFuturesYahooSymbol, SymbolInsightMeta> = {
  "CL=F": {
    theater: "middle-east",
    imagePath: "/assets/invest-insight/energy.svg",
    axisKo: "중동·에너지 축",
    axisEn: "Middle East energy axis",
  },
  "BZ=F": {
    theater: "middle-east",
    imagePath: "/assets/invest-insight/energy.svg",
    axisKo: "중동·브렌트 에너지 축",
    axisEn: "Brent / Middle East energy axis",
  },
  "NG=F": {
    theater: "atlantic",
    imagePath: "/assets/invest-insight/energy.svg",
    axisKo: "유럽·가스 공급 축",
    axisEn: "Europe gas supply axis",
  },
  "GC=F": {
    theater: "global",
    imagePath: "/assets/invest-insight/metals.svg",
    axisKo: "글로벌 리스크오프·귀금속",
    axisEn: "global risk-off / precious metals",
  },
  "SI=F": {
    theater: "global",
    imagePath: "/assets/invest-insight/metals.svg",
    axisKo: "글로벌 귀금속·산업금속",
    axisEn: "global precious / industrial metals",
  },
  "HG=F": {
    theater: "china-taiwan",
    imagePath: "/assets/invest-insight/metals.svg",
    axisKo: "중국·산업금속 수요 축",
    axisEn: "China industrial metals demand",
  },
  "ZW=F": {
    theater: "russia-ukraine",
    imagePath: "/assets/invest-insight/grains.svg",
    axisKo: "흑해·곡물 공급 축",
    axisEn: "Black Sea grains corridor",
  },
  "ZC=F": {
    theater: "global",
    imagePath: "/assets/invest-insight/grains.svg",
    axisKo: "글로벌 곡물·사료",
    axisEn: "global grains / feed",
  },
};

function metaFor(symbol: DatabentoFuturesYahooSymbol): SymbolInsightMeta {
  return META[symbol];
}

export function theaterForFuturesSymbol(symbol: string): NewsTheater {
  if (!isDatabentoFuturesSymbol(symbol)) return "global";
  return metaFor(symbol).theater;
}

function formatPct(changePercent: number): string {
  const abs = Math.abs(changePercent).toFixed(1);
  return changePercent >= 0 ? `+${abs}%` : `−${abs}%`;
}

/**
 * 두괄식 브리핑 — 첫 문장에 선물 등락 숫자.
 * companionParagraph는 나중에 counterfactual로 끼워 넣을 수 있음.
 */
export function buildFuturesSpikeInsightBriefing(
  offer: SpikeTelegraphBannerOffer,
  lang: LabelLanguage,
  opts?: { companionParagraph?: string | null; asOf?: string | null },
): FuturesSpikeInsightBriefing | null {
  if (!isDatabentoFuturesSymbol(offer.symbol)) return null;
  const symbol = offer.symbol;
  const meta = metaFor(symbol);
  const ko = lang !== "en";
  const name = tickerDisplayName(symbol, ko ? "ko" : "en");
  const pct = formatPct(offer.changePercent);
  const windowSec = offer.changeWindowSec ?? FUTURES_LIVE_CHANGE_WINDOW_SEC;
  const rising = offer.direction === "up" || offer.changePercent >= 0;
  const moveKo = rising ? "급등" : "급락";
  const moveEn = rising ? "surged" : "dropped";

  const lead = ko
    ? `${name} 선물이 ${pct} ${moveKo}했다.`
    : `${name} futures ${moveEn} ${pct}.`;

  const axis = ko ? meta.axisKo : meta.axisEn;
  const windowHint = ko
    ? `최근 ${windowSec}초 창 기준`
    : `over the last ${windowSec}s`;
  const asOfHint = opts?.asOf
    ? ko
      ? ` · 관측 ${opts.asOf}`
      : ` · as of ${opts.asOf}`
    : "";
  const background = ko
    ? `${axis} 시세와 동행하는 움직임이다. (${windowHint}${asOfHint})`
    : `It is moving with the ${axis}. (${windowHint}${asOfHint})`;

  const paragraphs = [lead, background];
  if (opts?.companionParagraph?.trim()) {
    paragraphs.push(opts.companionParagraph.trim());
  }
  paragraphs.push(
    ko
      ? "투자 권유 아님 · 수수료·세금 미반영 가정치"
      : "Not investment advice · hypothetical; excludes fees & taxes",
  );

  return {
    id: `futures-spike-${symbol}-${offer.atMs}`,
    title: ko ? `선물 전보 · ${name}` : `Futures dispatch · ${name}`,
    paragraphs,
    imageUrl: meta.imagePath,
    theater: meta.theater,
    symbol,
    changePercent: offer.changePercent,
    changeWindowSec: windowSec,
    dispatchBed: "cheer",
  };
}

/** counterfactual API 결과 → 동행 단락 */
export function companionParagraphFromCounterfactual(
  lang: LabelLanguage,
  input: {
    eventLabel: string;
    symbolLabel: string;
    changePercent: number;
  },
): string {
  const ko = lang !== "en";
  const pct = formatPct(input.changePercent);
  return ko
    ? `과거 ${input.eventLabel} 구간에서 ${input.symbolLabel}은 ${pct} 움직였다.`
    : `In the ${input.eventLabel} window, ${input.symbolLabel} moved ${pct}.`;
}
