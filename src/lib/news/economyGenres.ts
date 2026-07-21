/**
 * 경제 뉴스 장르 (geo-trader Intel 시트 카테고리).
 * @see feedCatalog SHARED_ECONOMY · BottomIntelStack EconomyGenreChipBar
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export type EconomyNewsGenre =
  | "macro"
  | "infra"
  | "energy"
  | "shipping"
  | "chips"
  | "tech"
  | "auto"
  | "markets";

export type EconomyGenreFilter = EconomyNewsGenre | "all";

export const ECONOMY_GENRE_ORDER: EconomyNewsGenre[] = [
  "tech",
  "chips",
  "auto",
  "energy",
  "shipping",
  "infra",
  "macro",
  "markets",
];

const GENRE_LABELS: Record<LabelLanguage, Record<EconomyNewsGenre, string>> = {
  ko: {
    tech: "AI·빅테크",
    chips: "반도체",
    auto: "전기차·모빌리티",
    energy: "에너지·메이저",
    shipping: "물류·해운",
    infra: "인프라·광물",
    macro: "거시·정책",
    markets: "시장·와이어",
  },
  en: {
    tech: "AI · Big Tech",
    chips: "Semiconductors",
    auto: "EV · Mobility",
    energy: "Energy majors",
    shipping: "Shipping · Logistics",
    infra: "Infra · Minerals",
    macro: "Macro · Policy",
    markets: "Markets · Wires",
  },
};

const GENRE_HINTS: Record<LabelLanguage, Record<EconomyNewsGenre, string>> = {
  ko: {
    tech: "Apple · Microsoft · Google · Amazon · Meta · OpenAI",
    chips: "Nvidia · TSMC · ASML · Samsung · SK hynix · Intel",
    auto: "Tesla · BYD · Toyota · Hyundai · CATL · 배터리",
    energy: "Exxon · Shell · Aramco · Chevron · OPEC · LNG",
    shipping: "Maersk · COSCO · 운임 · 호르무즈 · 수에즈 · 말라카 · 홍해",
    infra: "희토류 · 해저케이블 · 데이터센터 · FDI",
    macro: "연준 · ECB · 관세 · 제재 · IMF",
    markets: "Reuters · WSJ · CNBC · FT · 지수·속보",
  },
  en: {
    tech: "Apple · Microsoft · Google · Amazon · Meta · OpenAI",
    chips: "Nvidia · TSMC · ASML · Samsung · SK hynix · Intel",
    auto: "Tesla · BYD · Toyota · Hyundai · CATL · batteries",
    energy: "Exxon · Shell · Aramco · Chevron · OPEC · LNG · Hormuz oil",
    shipping: "Maersk · COSCO · freight · Hormuz · Suez · Malacca · Red Sea",
    infra: "Rare earths · subsea cables · data centers · FDI",
    macro: "Fed · ECB · tariffs · sanctions · IMF",
    markets: "Reuters · WSJ · CNBC · FT · indices",
  },
};

export function economyGenreLabel(genre: EconomyNewsGenre, lang: LabelLanguage): string {
  return GENRE_LABELS[lang][genre];
}

export function economyGenreHint(genre: EconomyNewsGenre, lang: LabelLanguage): string {
  return GENRE_HINTS[lang][genre];
}

export function matchesEconomyGenreFilter(
  genre: EconomyNewsGenre | undefined,
  filter: EconomyGenreFilter,
): boolean {
  if (filter === "all") return true;
  return (genre ?? "markets") === filter;
}
