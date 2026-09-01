/**
 * 전장·초크포인트 → 관련 심볼 (해석용, 매매 권유 아님).
 * conflict = 방산·전장 equity / economy = 선물·매크로.
 * @see docs/retention-markets-roadmap.md
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import type { ViewerMode } from "@/lib/viewPackages";

export type TheaterMarketFilter = NewsTheater | "all";

export type TheaterAssetEntry = {
  symbols: string[];
  noteKo: string;
  noteEn: string;
};

/** 지정학 — 안보·방산·전장 equity (대만·한국 반도체 포함) */
export const THEATER_ASSETS_CONFLICT: Record<TheaterMarketFilter, TheaterAssetEntry> = {
  all: {
    symbols: ["ITA", "LMT", "RTX", "SMH", "TSM", "005930.KS", "012450.KS"],
    noteKo: "방산·반도체 equity — 지정학 리스크 해석용 · 투자 권유 아님",
    noteEn: "Defense · semi equities — geopolitical risk (interpretive · not advice)",
  },
  "middle-east": {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD", "012450.KS"],
    noteKo: "방산 ETF·방산업체 — 중동 안보·동맹 재무장 (해석용)",
    noteEn: "Defense ETF · primes — Middle East security / rearmament (interpretive)",
  },
  "russia-ukraine": {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD", "012450.KS"],
    noteKo: "방산 — 유럽·우크라이나 전쟁 프리미엄 (해석용)",
    noteEn: "Defense — Europe / Ukraine war premium (interpretive)",
  },
  "china-taiwan": {
    symbols: ["TSM", "SMH", "^TWII", "ITA", "LMT"],
    noteKo: "TSMC·반도체 ETF·대만 가권 — 해협 안보·칩 서플라이 (해석용)",
    noteEn: "TSMC · semi ETF · TWII — Strait security / chip supply (interpretive)",
  },
  korea: {
    symbols: ["005930.KS", "000660.KS", "SMH", "KRW=X", "012450.KS", "047810.KS"],
    noteKo: "삼성·하이닉스·반도체·원/달러·한국 방산 — 한반도 리스크 (해석용)",
    noteEn: "Samsung · SK hynix · semis · KRW · ROK defense — Peninsula risk (interpretive)",
  },
  japan: {
    symbols: ["^N225", "SMH", "ITA", "LMT", "047810.KS"],
    noteKo: "니케이·반도체·방산 — 동북아 안보 (해석용)",
    noteEn: "Nikkei · semis · defense — Northeast Asia security (interpretive)",
  },
  "south-asia": {
    symbols: ["ITA", "LMT", "RTX", "SMH"],
    noteKo: "방산·반도체 — 남아시아 안보 프리미엄 (해석용)",
    noteEn: "Defense · semis — South Asia security premium (interpretive)",
  },
  "southeast-asia": {
    symbols: ["SMH", "TSM", "ITA", "LMT", "RTX"],
    noteKo: "반도체·방산 — 남중국해·동맹 리스크 (해석용)",
    noteEn: "Semis · defense — SCS / alliance risk (interpretive)",
  },
  "south-america": {
    symbols: ["ITA", "LMT", "RTX", "GD"],
    noteKo: "방산 — 남미 안보 프리미엄 (해석용)",
    noteEn: "Defense — LatAm security premium (interpretive)",
  },
  africa: {
    symbols: ["ITA", "LMT", "RTX", "NOC"],
    noteKo: "방산 — 사헬·아프리카 분쟁 리스크 (해석용)",
    noteEn: "Defense — Sahel / Africa conflict risk (interpretive)",
  },
  arctic: {
    symbols: ["ITA", "LMT", "NOC", "GD"],
    noteKo: "방산 — 북극·자원 안보 (해석용)",
    noteEn: "Defense — Arctic / resource security (interpretive)",
  },
  atlantic: {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD"],
    noteKo: "방산 — 대서양·NATO 재무장 (해석용)",
    noteEn: "Defense — Atlantic / NATO rearmament (interpretive)",
  },
  global: {
    symbols: ["ITA", "LMT", "RTX", "SMH", "TSM"],
    noteKo: "글로벌 방산·반도체 equity (해석용 · 투자 권유 아님)",
    noteEn: "Global defense · semi equities (interpretive · not advice)",
  },
};

/** 지경학 — 선물·매크로 (칩 equity 제외) */
export const THEATER_ASSETS_ECONOMY: Record<TheaterMarketFilter, TheaterAssetEntry> = {
  all: {
    symbols: ["^VIX", "KRW=X", "^TNX", "CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "NG=F"],
    noteKo: "글로벌 리스크·환율·금리·에너지 선물 (해석용 · 투자 권유 아님)",
    noteEn: "Global risk · FX · rates · energy futures (interpretive · not advice)",
  },
  "middle-east": {
    symbols: ["CL=F", "BZ=F", "NG=F", "GC=F", "DX-Y.NYB", "^VIX"],
    noteKo: "원유·천연가스·금 — 중동·호르무즈 에너지 리스크 (해석용)",
    noteEn: "Oil · gas · gold — Middle East / Hormuz energy risk (interpretive)",
  },
  "russia-ukraine": {
    symbols: ["ZW=F", "ZC=F", "CL=F", "BZ=F", "GC=F", "^VIX"],
    noteKo: "밀·옥수수·에너지 — 흑해 곡물·유럽 전쟁 프리미엄 (해석용)",
    noteEn: "Wheat · corn · energy — Black Sea grain / Europe war premium (interpretive)",
  },
  "china-taiwan": {
    symbols: ["BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "^TNX", "GC=F"],
    noteKo: "유가·리스크·달러·금리 — 해협 물류·매크로 (해석용 · 칩 주식은 지정학)",
    noteEn: "Oil · risk · dollar · yields — Strait logistics / macro (chip equities → conflict)",
  },
  korea: {
    symbols: ["KRW=X", "^TNX", "BZ=F", "CL=F", "^VIX", "DX-Y.NYB"],
    noteKo: "원/달러·금리·유가·리스크 — 한반도 매크로 (해석용 · 칩 주식은 지정학)",
    noteEn: "KRW · yields · oil · risk — Peninsula macro (chip equities → conflict)",
  },
  japan: {
    symbols: ["BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "^TNX", "GC=F"],
    noteKo: "유가·리스크·달러 — 동북아 매크로·서플라이 (해석용)",
    noteEn: "Oil · risk · dollar — Northeast Asia macro / supply (interpretive)",
  },
  "south-asia": {
    symbols: ["BZ=F", "GC=F", "DX-Y.NYB", "^VIX", "CL=F"],
    noteKo: "유가·금 — 남아시아 매크로 프리미엄 (해석용)",
    noteEn: "Oil · gold — South Asia macro premium (interpretive)",
  },
  "southeast-asia": {
    symbols: ["BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "GC=F"],
    noteKo: "유가·리스크 — 남중국해·말라카 물류 (해석용)",
    noteEn: "Oil · risk — SCS / Malacca logistics (interpretive)",
  },
  "south-america": {
    symbols: ["CL=F", "BZ=F", "GC=F", "^VIX", "DX-Y.NYB"],
    noteKo: "유가·금 — 남미 에너지·자원 프리미엄 (해석용)",
    noteEn: "Oil · gold — LatAm energy / resource premium (interpretive)",
  },
  africa: {
    symbols: ["GC=F", "BZ=F", "CL=F", "^VIX", "DX-Y.NYB"],
    noteKo: "금·유가 — 아프리카 자원·분쟁 프리미엄 (해석용)",
    noteEn: "Gold · oil — Africa resource / conflict premium (interpretive)",
  },
  arctic: {
    symbols: ["BZ=F", "CL=F", "NG=F", "GC=F", "DX-Y.NYB", "^VIX"],
    noteKo: "에너지·금 — 북극 항로·자원 (해석용)",
    noteEn: "Energy · gold — Arctic route / resource (interpretive)",
  },
  atlantic: {
    symbols: ["DX-Y.NYB", "^VIX", "BZ=F", "GC=F", "^TNX"],
    noteKo: "달러·리스크·유가 — 대서양 매크로 (해석용)",
    noteEn: "Dollar · risk · oil — Atlantic macro (interpretive)",
  },
  global: {
    symbols: ["^VIX", "CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "^TNX"],
    noteKo: "리스크·에너지·달러 — 글로벌 매크로 헤지 (해석용)",
    noteEn: "Risk · energy · dollar — global macro hedge (interpretive)",
  },
};

/** @deprecated Prefer THEATER_ASSETS_ECONOMY / mode-aware helpers */
export const THEATER_ASSETS: Record<TheaterMarketFilter, TheaterAssetEntry> =
  THEATER_ASSETS_ECONOMY;

function tableForMode(mode: ViewerMode): Record<TheaterMarketFilter, TheaterAssetEntry> {
  return mode === "economy" ? THEATER_ASSETS_ECONOMY : THEATER_ASSETS_CONFLICT;
}

export function theaterAssetSymbols(
  filter: TheaterMarketFilter,
  mode: ViewerMode = "conflict",
): string[] {
  const table = tableForMode(mode);
  return table[filter]?.symbols ?? table.all.symbols;
}

/** 전장 연관 심볼 전체 (limit 주면 앞에서만) */
export function theaterPrimarySymbols(
  filter: TheaterMarketFilter,
  limit?: number,
  mode: ViewerMode = "conflict",
): string[] {
  const all = theaterAssetSymbols(filter, mode);
  if (limit == null || !Number.isFinite(limit) || limit < 0) return all;
  return all.slice(0, limit);
}

export function theaterAssetNote(
  filter: TheaterMarketFilter,
  lang: LabelLanguage = "ko",
  mode: ViewerMode = "conflict",
): string {
  const entry = tableForMode(mode)[filter] ?? tableForMode(mode).all;
  return lang === "en" ? entry.noteEn : entry.noteKo;
}

/** Yahoo Finance 심볼 페이지 (외부 보기 · 주문 아님) */
export function yahooQuoteUrl(symbol: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

/** TradingView 심볼 페이지 딥링크 (임베드 아님 · 약관 별도) */
export function tradingViewSymbolUrl(symbol: string): string {
  const clean = symbol
    .replace(/^\^/, "")
    .replace(/=F$/, "")
    .replace(/-USD$/i, "USD")
    .replace(/\./g, "");
  return `https://www.tradingview.com/symbols/${encodeURIComponent(clean)}/`;
}
