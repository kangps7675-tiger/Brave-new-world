/**
 * 전장·초크포인트 → 관련 ETF·원자재·지수 심볼 (해석용, 매매 권유 아님).
 * 배열 앞쪽이 primary 해석 순서. 스트립·반응 API는 목록 전체를 사용한다.
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
    noteKo: "글로벌 리스크·에너지·주요 지수 (해석용 · 투자 권유 아님)",
    noteEn: "Global risk · energy · major indices (interpretive · not advice)",
  },
  "middle-east": {
    symbols: ["CL=F", "BZ=F", "NG=F", "GC=F", "DX-Y.NYB", "^VIX", "^GSPC"],
    noteKo: "원유·천연가스 — 중동·호르무즈 에너지 리스크 (해석용)",
    noteEn: "Oil · natural gas — Middle East / Hormuz energy risk (interpretive)",
  },
  "russia-ukraine": {
    symbols: ["ZW=F", "ZC=F", "CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "^VIX"],
    noteKo: "밀·옥수수·에너지 — 흑해 곡물·유럽 전쟁 프리미엄 (해석용)",
    noteEn: "Wheat · corn · energy — Black Sea grain / Europe war premium (interpretive)",
  },
  "china-taiwan": {
    symbols: ["SMH", "TSM", "^IXIC", "000001.SS", "^HSI", "^VIX", "DX-Y.NYB"],
    noteKo: "반도체 ETF·TSMC — 대만해협 칩 서플라이 (해석용)",
    noteEn: "Semi ETF · TSMC — Taiwan Strait chip supply (interpretive)",
  },
  korea: {
    symbols: ["^KS11", "SMH", "005930.KS", "^IXIC", "^VIX", "BZ=F", "^GSPC"],
    noteKo: "코스피·반도체·삼성 — 한반도·칩 서플라이 리스크 (해석용)",
    noteEn: "KOSPI · semis · Samsung — Peninsula / chip supply risk (interpretive)",
  },
  japan: {
    symbols: ["^N225", "SMH", "^IXIC", "BZ=F", "^HSI", "^GSPC", "^VIX"],
    noteKo: "니케이·반도체·유가 — 동북아 안보·서플라이 (해석용)",
    noteEn: "Nikkei · semis · oil — Northeast Asia security / supply (interpretive)",
  },
  "south-asia": {
    symbols: ["BZ=F", "GC=F", "^HSI", "DX-Y.NYB", "^GSPC", "^VIX"],
    noteKo: "유가·금 — 인도 인접·남아시아 안보 프리미엄 (해석용)",
    noteEn: "Oil · gold — South Asia security premium (interpretive)",
  },
  "southeast-asia": {
    symbols: ["BZ=F", "CL=F", "SMH", "^HSI", "^IXIC", "^VIX", "DX-Y.NYB"],
    noteKo: "유가·반도체 — 남중국해·말라카 물류·칩 리스크 (해석용)",
    noteEn: "Oil · semis — SCS / Malacca logistics · chip risk (interpretive)",
  },
  "south-america": {
    symbols: ["CL=F", "BZ=F", "GC=F", "^VIX", "DX-Y.NYB", "^GSPC"],
    noteKo: "유가·금 — 베네수엘라·가이아나·남미 안보 프리미엄 (해석용)",
    noteEn: "Oil · gold — Venezuela / Guyana / LatAm security premium (interpretive)",
  },
  africa: {
    symbols: ["GC=F", "BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "^GSPC"],
    noteKo: "금·유가 — 사헬·수단·아프리카 분쟁 리스크 (해석용)",
    noteEn: "Gold · oil — Sahel / Sudan / Africa conflict risk (interpretive)",
  },
  arctic: {
    symbols: ["BZ=F", "CL=F", "NG=F", "GC=F", "DX-Y.NYB", "^VIX", "^GSPC"],
    noteKo: "에너지·금 — 북극 항로·자원 리스크 (해석용)",
    noteEn: "Energy · gold — Arctic route / resource risk (interpretive)",
  },
  atlantic: {
    symbols: ["DX-Y.NYB", "^GSPC", "^VIX", "BZ=F", "GC=F", "^IXIC"],
    noteKo: "달러·미국 지수 — 대서양·NATO 안보 프리미엄 (해석용)",
    noteEn: "Dollar · US indices — Atlantic / NATO security premium (interpretive)",
  },
  global: {
    symbols: ["^VIX", "^GSPC", "^IXIC", "BZ=F", "GC=F", "DX-Y.NYB"],
    noteKo: "리스크·매크로 헤지 지표 (해석용 · 투자 권유 아님)",
    noteEn: "Risk · macro hedge indicators (interpretive · not advice)",
  },
};

export function theaterAssetSymbols(filter: TheaterMarketFilter): string[] {
  return THEATER_ASSETS[filter]?.symbols ?? THEATER_ASSETS.all.symbols;
}

/** 전장 연관 심볼 전체 (limit 주면 앞에서만) */
export function theaterPrimarySymbols(
  filter: TheaterMarketFilter,
  limit?: number,
): string[] {
  const all = theaterAssetSymbols(filter);
  if (limit == null || !Number.isFinite(limit) || limit < 0) return all;
  return all.slice(0, limit);
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
