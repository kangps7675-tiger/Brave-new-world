/**
 * 전장·초크포인트 → 관련 심볼 (해석용, 매매 권유 아님).
 * conflict = 방산·전장 equity / economy = 선물·매크로.
 * note* 문구는 유저가 “왜 이 시세를 보면 되는지”를 먼저 이해하게.
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
    noteKo:
      "긴장이 커지면 방산·반도체 주가가 먼저 반응하는 경우가 많습니다. 아래는 그 흐름을 따라보기 위한 참고 종목입니다.",
    noteEn:
      "When tension rises, defense and chip names often move first. These are watch symbols — not buy tips.",
  },
  "middle-east": {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD", "012450.KS"],
    noteKo:
      "중동에서 싸움이 커지면 방산 관련 종목이 흔들리기 쉽습니다. 안보 리스크를 숫자로 따라볼 때 씁니다.",
    noteEn:
      "Wider Middle East fighting often shows up in defense names first — a way to watch security risk in numbers.",
  },
  "russia-ukraine": {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD", "012450.KS"],
    noteKo:
      "유럽·우크라 전선이 뜨거워지면 방산 종목이 같이 움직이는 경우가 많습니다. 전쟁 프리미엄을 따라볼 때 봅니다.",
    noteEn:
      "When the Europe/Ukraine front heats up, defense names often move with it — a war-premium watch list.",
  },
  "china-taiwan": {
    symbols: ["TSM", "SMH", "^TWII", "ITA", "LMT"],
    noteKo:
      "대만 해협이 흔들리면 칩·대만 시장이 먼저 반응하는 경우가 많습니다. 물류·안보가 반도체로 이어질 때 봅니다.",
    noteEn:
      "Strait tension often hits Taiwan and chip names first — when security risk meets supply chains.",
  },
  korea: {
    symbols: ["005930.KS", "000660.KS", "SMH", "KRW=X", "012450.KS", "047810.KS"],
    noteKo:
      "한반도 긴장이 커지면 삼성·하이닉스·원/달러·한국 방산이 같이 흔들릴 수 있습니다. 리스크를 한눈에 볼 때 씁니다.",
    noteEn:
      "Peninsula tension can shake Samsung, SK hynix, the won, and Korean defense names — a quick risk read.",
  },
  japan: {
    symbols: ["^N225", "SMH", "ITA", "LMT", "047810.KS"],
    noteKo:
      "동북아 안보가 흔들리면 니케이·반도체·방산이 먼저 반응하는 경우가 많습니다.",
    noteEn:
      "Northeast Asia security shocks often show first in Nikkei, semis, and defense names.",
  },
  "south-asia": {
    symbols: ["ITA", "LMT", "RTX", "SMH"],
    noteKo:
      "남아시아 긴장이 커지면 방산·반도체 쪽이 먼저 움직일 수 있습니다.",
    noteEn:
      "South Asia tension can show up early in defense and chip names.",
  },
  "southeast-asia": {
    symbols: ["SMH", "TSM", "ITA", "LMT", "RTX"],
    noteKo:
      "남중국해·동맹 이슈가 커지면 반도체·방산이 같이 흔들릴 수 있습니다.",
    noteEn:
      "SCS or alliance stress often ripples into semis and defense names.",
  },
  "south-america": {
    symbols: ["ITA", "LMT", "RTX", "GD"],
    noteKo:
      "남미 안보 이슈가 커지면 방산 종목이 반응하는 경우가 있습니다.",
    noteEn:
      "LatAm security stress can show up in defense names.",
  },
  africa: {
    symbols: ["ITA", "LMT", "RTX", "NOC"],
    noteKo:
      "사헬·아프리카 분쟁이 커지면 방산 쪽이 같이 움직일 수 있습니다.",
    noteEn:
      "Sahel / Africa conflict stress can move defense names.",
  },
  arctic: {
    symbols: ["ITA", "LMT", "NOC", "GD"],
    noteKo:
      "북극·자원 안보가 이슈가 되면 방산 종목이 반응하는 경우가 있습니다.",
    noteEn:
      "Arctic / resource security stories can show in defense names.",
  },
  atlantic: {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD"],
    noteKo:
      "대서양·NATO 재무장 이슈가 커지면 방산이 먼저 움직일 수 있습니다.",
    noteEn:
      "Atlantic / NATO rearmament stories often show first in defense names.",
  },
  global: {
    symbols: ["ITA", "LMT", "RTX", "SMH", "TSM"],
    noteKo:
      "세계가 한꺼번에 시끄러워지면 방산·반도체 주가가 먼저 반응하는 경우가 많습니다.",
    noteEn:
      "When the whole board gets loud, defense and chip names often move first.",
  },
};

/** 지경학 — 선물·매크로 (칩 equity 제외) */
export const THEATER_ASSETS_ECONOMY: Record<TheaterMarketFilter, TheaterAssetEntry> = {
  all: {
    symbols: ["^VIX", "KRW=X", "^TNX", "CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "NG=F"],
    noteKo:
      "세계가 불안하면 공포지수·환율·유가·금이 먼저 흔들립니다. 아래는 그 파동을 따라보기 위한 참고입니다.",
    noteEn:
      "When the world gets nervous, VIX, FX, oil, and gold often move first — watch symbols, not advice.",
  },
  "middle-east": {
    symbols: ["CL=F", "BZ=F", "NG=F", "GC=F", "DX-Y.NYB", "^VIX"],
    noteKo:
      "중동·호르무즈가 막히면 원유·가스·금이 바로 반응하는 경우가 많습니다. 에너지 리스크를 볼 때 이어서 보세요.",
    noteEn:
      "Hormuz / Middle East shocks often hit oil, gas, and gold first — follow the energy risk from here.",
  },
  "russia-ukraine": {
    symbols: ["ZW=F", "ZC=F", "CL=F", "BZ=F", "GC=F", "^VIX"],
    noteKo:
      "흑해·우크라가 흔들리면 밀·옥수수·에너지가 같이 움직일 수 있습니다. 식량·전쟁 프리미엄을 볼 때 봅니다.",
    noteEn:
      "Black Sea / Ukraine stress can move wheat, corn, and energy — a food and war-premium watch.",
  },
  "china-taiwan": {
    symbols: ["BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "^TNX", "GC=F"],
    noteKo:
      "해협 물류가 흔들리면 유가·달러·금리가 같이 움직일 수 있습니다. (칩 주식은 지정학 렌즈에서)",
    noteEn:
      "Strait logistics stress can show in oil, the dollar, and yields. (Chip equities → Geopolitics lens.)",
  },
  korea: {
    symbols: ["KRW=X", "^TNX", "BZ=F", "CL=F", "^VIX", "DX-Y.NYB"],
    noteKo:
      "한반도 리스크가 커지면 원/달러·유가·공포지수가 먼저 흔들릴 수 있습니다. (칩 주식은 지정학 렌즈에서)",
    noteEn:
      "Peninsula risk often shows first in KRW, oil, and VIX. (Chip equities → Geopolitics lens.)",
  },
  japan: {
    symbols: ["BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "^TNX", "GC=F"],
    noteKo:
      "동북아 공급망이 흔들리면 유가·달러·리스크 지표가 같이 움직일 수 있습니다.",
    noteEn:
      "Northeast Asia supply shocks can move oil, the dollar, and risk gauges together.",
  },
  "south-asia": {
    symbols: ["BZ=F", "GC=F", "DX-Y.NYB", "^VIX", "CL=F"],
    noteKo:
      "남아시아 긴장이 커지면 유가·금이 먼저 반응하는 경우가 많습니다.",
    noteEn:
      "South Asia tension often shows early in oil and gold.",
  },
  "southeast-asia": {
    symbols: ["BZ=F", "CL=F", "^VIX", "DX-Y.NYB", "GC=F"],
    noteKo:
      "남중국해·말라카가 막히면 유가·리스크 지표가 흔들릴 수 있습니다. 물류를 따라볼 때 봅니다.",
    noteEn:
      "SCS / Malacca stress can shake oil and risk gauges — follow the logistics from here.",
  },
  "south-america": {
    symbols: ["CL=F", "BZ=F", "GC=F", "^VIX", "DX-Y.NYB"],
    noteKo:
      "남미 에너지·자원 이슈가 커지면 유가·금이 반응하는 경우가 있습니다.",
    noteEn:
      "LatAm energy / resource stress can show in oil and gold.",
  },
  africa: {
    symbols: ["GC=F", "BZ=F", "CL=F", "^VIX", "DX-Y.NYB"],
    noteKo:
      "아프리카 자원·분쟁 이슈가 커지면 금·유가가 같이 움직일 수 있습니다.",
    noteEn:
      "Africa resource / conflict stress can move gold and oil together.",
  },
  arctic: {
    symbols: ["BZ=F", "CL=F", "NG=F", "GC=F", "DX-Y.NYB", "^VIX"],
    noteKo:
      "북극 항로·자원이 이슈가 되면 에너지·금이 반응하는 경우가 있습니다.",
    noteEn:
      "Arctic route / resource stories can show in energy and gold.",
  },
  atlantic: {
    symbols: ["DX-Y.NYB", "^VIX", "BZ=F", "GC=F", "^TNX"],
    noteKo:
      "대서양 쪽 긴장이 커지면 달러·리스크·유가가 같이 움직일 수 있습니다.",
    noteEn:
      "Atlantic tension can move the dollar, risk gauges, and oil together.",
  },
  global: {
    symbols: ["^VIX", "CL=F", "BZ=F", "GC=F", "DX-Y.NYB", "^TNX"],
    noteKo:
      "세계가 한꺼번에 불안하면 공포지수·에너지·달러가 먼저 흔들립니다.",
    noteEn:
      "When the whole board gets nervous, VIX, energy, and the dollar often move first.",
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
