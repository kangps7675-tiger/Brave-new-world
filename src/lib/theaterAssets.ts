/**
 * 전장·초크포인트 → 관련 ETF·원자재·지수 심볼 (해석용, 매매 권유 아님).
 * @see docs/retention-markets-roadmap.md
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";

export type TheaterMarketFilter = NewsTheater | "all";

export type TheaterAssetEntry = {
  symbols: string[];
  noteKo: string;
  noteEn: string;
};

/** 정본 매핑 — LLM이 심볼을 발명하지 않도록 코드 테이블이 우선 */
export const THEATER_ASSETS: Record<TheaterMarketFilter, TheaterAssetEntry> = {
  all: {
    symbols: ["^VIX", "CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "^GSPC", "^IXIC"],
    noteKo: "글로벌 리스크·에너지·주요 지수",
    noteEn: "Global risk · energy · major indices",
  },
  "middle-east": {
    symbols: ["CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "^VIX", "^GSPC", "^IXIC"],
    noteKo: "유가·금·달러 — 중동·호르무즈 리스크 프리미엄",
    noteEn: "Oil · gold · dollar — Middle East / Hormuz risk premium",
  },
  "russia-ukraine": {
    symbols: ["CL=F", "BZ=F", "GC=F", "^GSPC", "DX-Y.NYB", "^VIX", "^IXIC"],
    noteKo: "유가·금·미국 지수 — 유럽 전쟁·에너지 프리미엄",
    noteEn: "Oil · gold · US indices — European war / energy premium",
  },
  "china-taiwan": {
    symbols: ["000001.SS", "^HSI", "^IXIC", "DX-Y.NYB", "^GSPC", "^VIX"],
    noteKo: "중국·홍콩·미국 기술주 — 대만해협·반도체 서플라이",
    noteEn: "China · HK · US tech — Taiwan Strait / chip supply",
  },
  korea: {
    symbols: ["^KS11", "^IXIC", "^HSI", "^VIX", "BZ=F", "^GSPC"],
    noteKo: "KOSPI·미국 지수 — 한반도·북핵 리스크",
    noteEn: "KOSPI · US indices — Korean Peninsula / nuclear risk",
  },
  japan: {
    symbols: ["^N225", "^HSI", "^IXIC", "^GSPC", "BZ=F", "^VIX"],
    noteKo: "니케이·아시아 지수·유가 — 동북아 안보",
    noteEn: "Nikkei · Asia indices · oil — Northeast Asia security",
  },
  "south-asia": {
    symbols: ["BZ=F", "GC=F", "^HSI", "DX-Y.NYB", "^GSPC", "^VIX"],
    noteKo: "유가·금·인도 인접 시장",
    noteEn: "Oil · gold · India-adjacent markets",
  },
  global: {
    symbols: ["^VIX", "^GSPC", "^IXIC", "BZ=F", "GC=F", "DX-Y.NYB"],
    noteKo: "방산·매크로 헤지 지표",
    noteEn: "Defense / macro hedge indicators",
  },
};

export function theaterAssetSymbols(filter: TheaterMarketFilter): string[] {
  return THEATER_ASSETS[filter]?.symbols ?? THEATER_ASSETS.all.symbols;
}

export function theaterAssetNote(
  filter: TheaterMarketFilter,
  lang: LabelLanguage = "ko",
): string {
  const entry = THEATER_ASSETS[filter] ?? THEATER_ASSETS.all;
  return lang === "en" ? entry.noteEn : entry.noteKo;
}

/** Yahoo Finance 심볼 페이지 (외부 보기 · 주문 아님) */
export function yahooQuoteUrl(symbol: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

/** TradingView 심볼 페이지 딥링크 (임베드 아님 · 약관 별도) */
export function tradingViewSymbolUrl(symbol: string): string {
  // Yahoo BTC-USD → TradingView BTCUSD 등
  const clean = symbol
    .replace(/^\^/, "")
    .replace(/=F$/, "")
    .replace(/-USD$/i, "USD")
    .replace(/\./g, "");
  return `https://www.tradingview.com/symbols/${encodeURIComponent(clean)}/`;
}
