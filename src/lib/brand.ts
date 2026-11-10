/**
 * 사용자-facing 브랜드 — 검색·입소문·재방문용 표기 통일.
 * 한국어·영어 모두 「conflict-view」(임시 서비스명). 지정학 속보를 근거와 함께 보여 준다.
 * 인프라 식별자(localStorage 키, 패키지 내부 심볼 등)는 마이그레이션 없이 유지해도 됨.
 */
export const BRAND_NAME = {
  ko: "conflict-view",
  en: "conflict-view",
} as const;

export const BRAND_MOTIF = {
  ko: "근거로 확인하는 지정학 속보",
  en: "Geopolitical alerts, checked against evidence",
} as const;

export const BRAND_TAGLINE = {
  ko: "속보는 빠르게, 근거는 직접 확인",
  en: "Alerts fast, evidence yours to check",
} as const;

/** HTTP User-Agent / 외부 fetch 식별용 (공백 없음) */
export const BRAND_USER_AGENT = "StraitDesk/0.2";

export function brandName(lang: "ko" | "en" = "ko"): string {
  return BRAND_NAME[lang];
}
