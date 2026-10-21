/**
 * 사용자-facing 브랜드 — 검색·입소문·재방문용 표기 통일.
 * 한국어·영어 모두 「Strait Desk」 (해협을 지켜보는 상황실).
 * 인프라 식별자(localStorage 키, 패키지 내부 심볼 등)는 마이그레이션 없이 유지해도 됨.
 */
export const BRAND_NAME = {
  ko: "Strait Desk",
  en: "Strait Desk",
} as const;

export const BRAND_MOTIF = {
  ko: "해협을 지켜보는 상황실",
  en: "A desk watching the straits",
} as const;

export const BRAND_TAGLINE = {
  ko: "바다의 위험을 한눈에",
  en: "Sea-lane risk at a glance",
} as const;

/** HTTP User-Agent / 외부 fetch 식별용 (공백 없음) */
export const BRAND_USER_AGENT = "StraitDesk/0.2";

export function brandName(lang: "ko" | "en" = "ko"): string {
  return BRAND_NAME[lang];
}
