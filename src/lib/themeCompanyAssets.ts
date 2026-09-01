/**
 * 인텔 시트 테마·주요기업·방산 종목 정본 (해석용 · 투자 권유 아님).
 * 테마 간 심볼 중복 금지. majors ↔ themes/defense 분리.
 * @see theaterAssets.ts
 */

import type { LabelLanguage } from "@/lib/layerPrefs";

export type CompanyThemeId = "majors" | "shipping-choke" | "aviation" | "defense";

export type CompanyThemeEntry = {
  symbols: string[];
  noteKo: string;
  noteEn: string;
  /** 탭 짧은 라벨 */
  tabKo: string;
  tabEn: string;
};

/** 정본 — Yahoo 심볼. 테마당 ≤6 */
export const THEME_COMPANY_ASSETS: Record<CompanyThemeId, CompanyThemeEntry> = {
  majors: {
    symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "JPM"],
    noteKo: "대형 시총 기업 — 테마와 무관한 시세 (해석용 · 투자 권유 아님)",
    noteEn: "Mega-cap names — not theme-tied (interpretive · not advice)",
    tabKo: "주요기업",
    tabEn: "Majors",
  },
  "shipping-choke": {
    symbols: ["XOM", "CVX", "FRO", "ZIM", "STNG"],
    noteKo: "에너지·탱커·컨테이너 — 초크·해상 물류 리스크 (해석용)",
    noteEn: "Energy · tankers · boxes — chokepoint / sea logistics risk (interpretive)",
    tabKo: "해운·초크",
    tabEn: "Shipping · choke",
  },
  aviation: {
    symbols: ["DAL", "UAL", "LUV", "JETS"],
    noteKo: "미 항공사·항공 ETF — 여객·유가 민감 (해석용)",
    noteEn: "US airlines · aviation ETF — passenger / oil-sensitive (interpretive)",
    tabKo: "항공",
    tabEn: "Aviation",
  },
  defense: {
    symbols: ["ITA", "LMT", "RTX", "NOC", "GD", "012450.KS", "047810.KS"],
    noteKo: "방산 ETF·미·한국 방산 — 지정학 equity (해석용 · 투자 권유 아님)",
    noteEn: "Defense ETF · US / ROK primes — conflict equities (interpretive · not advice)",
    tabKo: "방산",
    tabEn: "Defense",
  },
};

export const COMPANY_THEME_IDS = Object.keys(THEME_COMPANY_ASSETS) as CompanyThemeId[];

export function companyThemeSymbols(theme: CompanyThemeId): string[] {
  return THEME_COMPANY_ASSETS[theme]?.symbols ?? [];
}

export function companyThemeNote(
  theme: CompanyThemeId,
  lang: LabelLanguage = "ko",
): string {
  const entry = THEME_COMPANY_ASSETS[theme];
  if (!entry) return "";
  return lang === "en" ? entry.noteEn : entry.noteKo;
}

export function companyThemeTabLabel(
  theme: CompanyThemeId,
  lang: LabelLanguage = "ko",
): string {
  const entry = THEME_COMPANY_ASSETS[theme];
  if (!entry) return theme;
  return lang === "en" ? entry.tabEn : entry.tabKo;
}

/** 폴링 카탈로그에 넣을 전체 심볼 (중복 제거, 등장 순) */
export function allThemeCompanySymbols(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of COMPANY_THEME_IDS) {
    for (const symbol of THEME_COMPANY_ASSETS[id].symbols) {
      if (seen.has(symbol)) continue;
      seen.add(symbol);
      out.push(symbol);
    }
  }
  return out;
}
