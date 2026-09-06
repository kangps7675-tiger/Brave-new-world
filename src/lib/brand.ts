/**
 * 사용자-facing 브랜드 — 검색·입소문·재방문용 표기 통일.
 * 한국어 「멋진 신세계」·영어 「Brave New World」.
 * 인프라 식별자(localStorage 키, 패키지 내부 심볼 등)는 마이그레이션 없이 유지해도 됨.
 */
export const BRAND_NAME = {
  ko: "멋진 신세계",
  en: "Brave New World",
} as const;

export const BRAND_MOTIF = {
  ko: "Aldous Huxley 모티브",
  en: "After Aldous Huxley",
} as const;

export const BRAND_TAGLINE = {
  ko: "한쪽에서는 포화가 울리고, 다른 쪽에서는 누군가가 돈을 번다",
  en: "Shells on one shore. Fortunes on the other.",
} as const;

/** HTTP User-Agent / 외부 fetch 식별용 (공백 없음) */
export const BRAND_USER_AGENT = "BraveNewWorld/0.2";

export function brandName(lang: "ko" | "en" = "ko"): string {
  return BRAND_NAME[lang];
}
