/**
 * Vercel CDN용 Cache-Control (s-maxage).
 * Workers `caches.default`가 아님 — 본진이 Vercel일 때 응답 헤더로 CDN 히트.
 * 폴링 간격은 liveRenderGuard와 맞춤 (대략 poll의 1/3~1/2).
 */

export type PublicCacheOpts = {
  /** CDN 캐시 초 */
  sMaxAge: number;
  /** stale-while-revalidate 초 (기본 sMaxAge*2) */
  swr?: number;
};

export function publicCacheControl({ sMaxAge, swr }: PublicCacheOpts): string {
  const revalidate = swr ?? sMaxAge * 2;
  return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${revalidate}`;
}

export function publicCacheHeaders(opts: PublicCacheOpts): HeadersInit {
  return { "Cache-Control": publicCacheControl(opts) };
}

/** 라이브/대기 중 — CDN에 빈 응답 고정 금지 */
export const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "private, no-store",
};

/** 피드별 프리셋 — liveRenderGuard poll과 정렬 */
export const CDN_CACHE = {
  /** FIRMS poll ~5min */
  firms: { sMaxAge: 90, swr: 180 } satisfies PublicCacheOpts,
  /** GDELT poll ~20min */
  gdelt: { sMaxAge: 300, swr: 600 } satisfies PublicCacheOpts,
  /** AIS poll ~90s */
  ais: { sMaxAge: 30, swr: 60 } satisfies PublicCacheOpts,
  /** ADS-B mil/civ ~55–75s */
  adsb: { sMaxAge: 25, swr: 50 } satisfies PublicCacheOpts,
  /** Telegram ~30s */
  telegram: { sMaxAge: 12, swr: 30 } satisfies PublicCacheOpts,
  /** Tzeva ~15s */
  tzeva: { sMaxAge: 8, swr: 15 } satisfies PublicCacheOpts,
  /** NewFeeds ~5min */
  newfeeds: { sMaxAge: 120, swr: 300 } satisfies PublicCacheOpts,
  /** Yahoo tickers ~15min */
  stock: { sMaxAge: 300, swr: 600 } satisfies PublicCacheOpts,
  /** SOTW / world-stats */
  worldStats: { sMaxAge: 600, swr: 1800 } satisfies PublicCacheOpts,
  /** 정적 레이어 JSON 파생 */
  staticLayer: { sMaxAge: 300, swr: 900 } satisfies PublicCacheOpts,
  /** briefing / daily-prompt */
  briefing: { sMaxAge: 60, swr: 180 } satisfies PublicCacheOpts,
  dailyPrompt: { sMaxAge: 120, swr: 300 } satisfies PublicCacheOpts,
  /** 진행형 분쟁 — 일일 갱신, CDN 짧게 */
  livingConflict: { sMaxAge: 120, swr: 600 } satisfies PublicCacheOpts,
  carriers: { sMaxAge: 120, swr: 300 } satisfies PublicCacheOpts,
  tunnels: { sMaxAge: 300, swr: 900 } satisfies PublicCacheOpts,
} as const;
