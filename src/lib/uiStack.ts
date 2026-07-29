/**
 * UI 스택 하드 규칙
 *
 * HoverNav(검색·메뉴·토글): 래퍼 z-75/90, nav 본체 expanded z-100.
 * 닫기(✕) 버튼이 있는 창·시트·모달·사이드바는 무조건 nav 위 → z-[120].
 * (진입 게이트·양피지 등 풀스크린 오버레이는 z-9990+ 대역 유지)
 */
export const Z_NAV_MAX = 100;
/** Tailwind class — closable window / sheet / modal panel */
export const Z_ABOVE_NAV = "z-[120]" as const;
/** Tailwind class — scrim behind a closable panel (바로 아래) */
export const Z_ABOVE_NAV_SCRIM = "z-[119]" as const;
