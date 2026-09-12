/** 초단위 선물 SPIKE 창 — 클라이언트·서버 공용 (Node 의존 없음) */

/** 초봉 조회 창 */
export const FUTURES_LIVE_LOOKBACK_SEC = 180;
/** SPIKE % 기준 창 (최신 close vs N초 전) */
export const FUTURES_LIVE_CHANGE_WINDOW_SEC = 60;
/** 서버 메모리 캐시 TTL */
export const FUTURES_LIVE_CACHE_TTL_MS = 1_000;
/** 클라이언트 폴링 간격 */
export const FUTURES_LIVE_POLL_MS = 1_000;
