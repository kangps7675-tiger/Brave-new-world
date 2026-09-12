/**
 * 인메모리 IP rate limit — Workers/Node 단일 인스턴스 기준.
 * 엣지 다중 인스턴스에서는 대략적 보호(쿼터 고갈 완화)용.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  /** 버킷 네임스페이스 (라우트별) */
  key: string;
  limit: number;
  windowMs: number;
};

/** 쿼터 민감 공개 API 기본값 */
export const RATE_PRESETS = {
  freight: { key: "freight", limit: 30, windowMs: 60_000 },
  radar: { key: "radar", limit: 20, windowMs: 60_000 },
  stock: { key: "stock", limit: 40, windowMs: 60_000 },
  /** 초단위 선물 SPIKE 폴링 (~1req/s) */
  stockFuturesLive: { key: "stock-futures-live", limit: 120, windowMs: 60_000 },
  stockReaction: { key: "stock-reaction", limit: 30, windowMs: 60_000 },
  sovereignRates: { key: "sovereign-rates", limit: 30, windowMs: 60_000 },
  reefwatch: { key: "reefwatch", limit: 20, windowMs: 60_000 },
  crossStrait: { key: "cross-strait", limit: 20, windowMs: 60_000 },
  shipMovements: { key: "ship-movements", limit: 60, windowMs: 60_000 },
  worldStats: { key: "world-stats", limit: 60, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;

export function clientIpFromRequest(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export type RateLimitOk = {
  ok: true;
  remaining: number;
  resetAt: number;
};

export type RateLimitDenied = {
  ok: false;
  remaining: 0;
  resetAt: number;
  retryAfterSec: number;
};

export function checkIpRateLimit(
  request: Request,
  config: RateLimitConfig,
): RateLimitOk | RateLimitDenied {
  const ip = clientIpFromRequest(request);
  const mapKey = `${config.key}:${ip}`;
  const now = Date.now();
  let bucket = buckets.get(mapKey);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 1, resetAt: now + config.windowMs };
    buckets.set(mapKey, bucket);
    return { ok: true, remaining: Math.max(0, config.limit - 1), resetAt: bucket.resetAt };
  }
  if (bucket.count >= config.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function rateLimitJsonResponse(
  denied: RateLimitDenied,
  message = "Too many requests",
): Response {
  return Response.json(
    { error: "rate_limited", message },
    {
      status: 429,
      headers: {
        "Retry-After": String(denied.retryAfterSec),
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

/** 한도 초과 시 429 Response, 통과 시 null */
export function enforceIpRateLimit(
  request: Request,
  config: RateLimitConfig,
): Response | null {
  const result = checkIpRateLimit(request, config);
  if (result.ok) return null;
  return rateLimitJsonResponse(result);
}

/** vitest 전용 */
export function __resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
