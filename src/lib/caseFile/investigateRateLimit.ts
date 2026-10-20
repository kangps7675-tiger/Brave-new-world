/**
 * 공개 조사 API용 단순 IP 레이트리밋 (프로세스 메모리).
 * 다중 인스턴스에서는 인스턴스별 한도 — 남용 1차 방어용.
 */

export type RateLimitResult =
  | { ok: true; remaining: number; resetMs: number }
  | { ok: false; retryAfterSec: number };

type Bucket = {
  /** 최근 요청 시각(ms) */
  hits: number[];
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const DAY_MS = 86_400_000;
const MAX_PER_DAY = 40;

let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < DAY_MS);
    if (b.hits.length === 0) buckets.delete(key);
  }
}

/** 테스트용 */
export function resetInvestigateRateLimitForTests() {
  buckets.clear();
  lastSweep = 0;
}

export function checkInvestigateRateLimit(clientKey: string): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = (clientKey || "unknown").slice(0, 128);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  const recent = bucket.hits.filter((t) => now - t < WINDOW_MS);
  const day = bucket.hits.filter((t) => now - t < DAY_MS);

  if (day.length >= MAX_PER_DAY) {
    const oldest = day[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((DAY_MS - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec };
  }
  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec };
  }

  bucket.hits = [...day, now];
  return {
    ok: true,
    remaining: Math.min(
      MAX_PER_WINDOW - recent.length - 1,
      MAX_PER_DAY - day.length - 1,
    ),
    resetMs: WINDOW_MS,
  };
}

export function clientKeyFromRequest(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return `ip:${cf}`;
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return `ip:${xff}`;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return `ip:${real}`;
  return "ip:unknown";
}

export const INVESTIGATE_LIMITS = {
  windowMs: WINDOW_MS,
  maxPerWindow: MAX_PER_WINDOW,
  maxPerDay: MAX_PER_DAY,
  maxTextChars: 50_000,
  maxUrlChars: 2_048,
} as const;
