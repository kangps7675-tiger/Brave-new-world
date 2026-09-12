/**
 * 선물 SPIKE → 양피지 투자 인사이트 (역피라미드 3~4문단 줄글 + 전장·이미지).
 * 육하원칙은 라벨이 아니라 문장 순서에 녹인다.
 */

import type { SpikeTelegraphBannerOffer } from "@/components/SpikeTelegraphBanner";
import type { BreakingDispatchBed } from "@/components/SoundEffectsBridge";
import { FUTURES_LIVE_CHANGE_WINDOW_SEC } from "@/lib/databento/futuresLiveConstants";
import {
  isDatabentoFuturesSymbol,
  type DatabentoFuturesYahooSymbol,
} from "@/lib/databento/symbolMap";
import { josa } from "@/lib/koreanJosa";
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
  /** 왜 이 심볼을 보는지 — 한 문장 (ko) */
  whyKo: string;
  whyEn: string;
  /** 어디서·어떤 축인지 (ko) */
  whereKo: string;
  whereEn: string;
};

const META: Record<DatabentoFuturesYahooSymbol, SymbolInsightMeta> = {
  "CL=F": {
    theater: "middle-east",
    imagePath: "/assets/invest-insight/energy.svg",
    whereKo: "중동·에너지 축과 페르시아만 출하 경로",
    whereEn: "the Middle East energy axis and Gulf export routes",
    whyKo:
      "원유 선물은 호르무즈·홍해 같은 에너지 병목의 위험을 가격에 먼저 담는 경우가 많습니다.",
    whyEn:
      "Crude futures often price energy-chokepoint risk around Hormuz and the Red Sea first.",
  },
  "BZ=F": {
    theater: "middle-east",
    imagePath: "/assets/invest-insight/energy.svg",
    whereKo: "중동·브렌트 에너지 축과 해상 원유 흐름",
    whereEn: "the Brent / Middle East energy axis and seaborne crude flows",
    whyKo:
      "브렌트는 해상 원유와 중동 공급 충격을 세계 유가 기준으로 옮기는 창구입니다.",
    whyEn:
      "Brent is a window that carries seaborne crude and Middle East supply shocks into the world oil benchmark.",
  },
  "NG=F": {
    theater: "atlantic",
    imagePath: "/assets/invest-insight/energy.svg",
    whereKo: "유럽·대서양 가스 공급 축",
    whereEn: "the Europe–Atlantic gas supply axis",
    whyKo:
      "천연가스 선물은 유럽 재고·LNG 도착·겨울 수요가 한꺼번에 흔들릴 때 빠르게 반응합니다.",
    whyEn:
      "Natural-gas futures move quickly when European inventories, LNG arrivals, and winter demand shift together.",
  },
  "GC=F": {
    theater: "global",
    imagePath: "/assets/invest-insight/metals.svg",
    whereKo: "글로벌 리스크오프·귀금속 시장",
    whereEn: "global risk-off and precious-metals markets",
    whyKo:
      "금은 안전자산으로 읽히는 경우가 많아, 지정학 긴장이나 금리 기대가 바뀌면 함께 움직입니다.",
    whyEn:
      "Gold is often read as a haven, so geopolitical tension or rate expectations can move it in tandem.",
  },
  "SI=F": {
    theater: "global",
    imagePath: "/assets/invest-insight/metals.svg",
    whereKo: "글로벌 귀금속·산업금속 교차 구간",
    whereEn: "the global precious and industrial metals cross",
    whyKo:
      "은은 안전자산과 산업 수요가 겹쳐, 위험 회피와 제조 경기 신호가 한 가격에 섞일 수 있습니다.",
    whyEn:
      "Silver blends haven demand with industrial use, so risk-off and manufacturing signals can share one price.",
  },
  "HG=F": {
    theater: "china-taiwan",
    imagePath: "/assets/invest-insight/metals.svg",
    whereKo: "중국·동아시아 산업금속 수요 축",
    whereEn: "China and East Asia industrial-metals demand",
    whyKo:
      "구리는 중국 제조·전력·건설 수요의 바로미터로 읽히는 경우가 많습니다.",
    whyEn:
      "Copper is often read as a barometer of Chinese manufacturing, power, and construction demand.",
  },
  "ZW=F": {
    theater: "russia-ukraine",
    imagePath: "/assets/invest-insight/grains.svg",
    whereKo: "흑해·곡물 공급 회랑",
    whereEn: "the Black Sea grains corridor",
    whyKo:
      "밀 선물은 흑해 출하·전쟁위험 보험·가뭄이 식량 가격에 미치는 충격을 빠르게 반영합니다.",
    whyEn:
      "Wheat futures quickly reflect Black Sea export, war-risk insurance, and drought shocks on food prices.",
  },
  "ZC=F": {
    theater: "global",
    imagePath: "/assets/invest-insight/grains.svg",
    whereKo: "글로벌 곡물·사료 공급망",
    whereEn: "the global grains and feed supply chain",
    whyKo:
      "옥수수 선물은 사료·바이오연료·남미·북미 작황이 한꺼번에 흔들릴 때 민감하게 움직입니다.",
    whyEn:
      "Corn futures react when feed, biofuels, and North–South American crops shift together.",
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
 * 역피라미드 3~4문단 — 첫 문단에 등락 숫자(리드), 이어서 축·의미·한계.
 * companionParagraph는 과거 동행 사례를 세 번째 문단에 끼워 넣습니다.
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
  const moveKo = rising ? "급등했습니다" : "급락했습니다";
  const moveEn = rising ? "surged" : "dropped";
  const companion = opts?.companionParagraph?.trim() || null;

  const paragraphs: string[] = [];

  if (ko) {
    // 1) 리드 — 누가(심볼)·무엇을(등락)·언제(관측 창)
    const asOfBit = opts?.asOf ? ` 관측 시각은 ${opts.asOf}입니다.` : "";
    paragraphs.push(
      `${josa(`${name} 선물`, "이/가")} 최근 ${windowSec}초 창에서 ${pct} ${moveKo}.${asOfBit} 숫자는 Databento 시세를 기준으로 한 관측치이며, 수수료·세금은 반영하지 않았습니다.`,
    );

    // 2) 어디서·왜
    paragraphs.push(
      `움직임이 잡힌 축은 ${meta.whereKo}입니다. ${meta.whyKo} 지도는 관련 전장·항로로 시선을 옮길 수 있습니다.`,
    );

    // 3) 어떻게·배경 (과거 동행이 있으면 녹임)
    if (companion) {
      paragraphs.push(
        `${companion} 과거 구간과 오늘 창을 나란히 두면, 같은 방향의 민감도가 반복되는지 가늠할 수 있습니다. 다만 과거 움직임이 미래를 보장하지는 않습니다.`,
      );
    } else {
      paragraphs.push(
        `짧은 창의 급변은 유동성·호가 공백·지정학 헤드라인에 한꺼번에 반응한 결과일 수 있습니다. 원인 하나를 단정하지 않고, 전장 뉴스와 시세를 나란히 확인하는 편이 안전합니다.`,
      );
    }

    // 4) 꼬리 — 한계
    paragraphs.push(
      `이 양피지는 투자 권유가 아닙니다. 매매·포지션 결정은 원자료와 본인 판단에 맡깁니다.`,
    );
  } else {
    const asOfBit = opts?.asOf ? ` As of ${opts.asOf}.` : "";
    paragraphs.push(
      `${name} futures ${moveEn} ${pct} over the last ${windowSec}s.${asOfBit} Figures are Databento observations and exclude fees and taxes.`,
    );
    paragraphs.push(
      `The move sits on ${meta.whereEn}. ${meta.whyEn} The map may shift toward the related theater or routes.`,
    );
    if (companion) {
      paragraphs.push(
        `${companion} Reading that window beside today’s spike helps gauge whether the same sensitivity repeats. Past moves do not guarantee the future.`,
      );
    } else {
      paragraphs.push(
        `A short-window spike can reflect liquidity gaps, thin books, and geopolitics headlines at once. Do not lock a single cause—keep theater news and the tape side by side.`,
      );
    }
    paragraphs.push(
      `This parchment is not investment advice. Trading decisions stay with primary sources and your own judgment.`,
    );
  }

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

/** counterfactual API 결과 → 동행 단락 (완전한 문장) */
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
    ? `과거 ${input.eventLabel} 구간에서 ${josa(input.symbolLabel, "은/는")} ${pct} 움직였습니다.`
    : `In the ${input.eventLabel} window, ${input.symbolLabel} moved ${pct}.`;
}
