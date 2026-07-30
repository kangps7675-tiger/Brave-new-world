import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { safeEqual } from "@/lib/auth/cronAuth";

export function shipMovementAdminSecret(): string | null {
  return process.env.SHIP_MOVEMENT_ADMIN_SECRET?.trim() || null;
}

/** 관리자 시크릿 상수 시간 비교 — 로그인 관문의 타이밍 사이드채널 차단. */
export function matchesAdminSecret(candidate: string | undefined, secret: string): boolean {
  if (!candidate) return false;
  return safeEqual(candidate, secret);
}

/* ------------------------------------------------------------------ *
 * 로그인 시도 제한 (브루트포스 완화)
 *
 * 주의: 프로세스 메모리 기반이라 워커 인스턴스마다 독립적이고 재시작 시
 * 초기화된다. 단일 관리자·저트래픽 운영에서는 충분하지만, 엄밀한 보장이
 * 필요해지면 D1 테이블이나 Cloudflare Rate Limiting 으로 옮길 것.
 * ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type AttemptRow = { count: number; firstAt: number; lockedUntil: number };
const attempts = new Map<string, AttemptRow>();

/** Map 무한 증식 방지 — 만료된 항목을 주기적으로 청소한다. */
function sweep(now: number) {
  if (attempts.size < 512) return;
  for (const [key, row] of attempts) {
    if (row.lockedUntil < now && now - row.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

export function adminLoginClientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** 잠금 상태면 남은 초를 반환, 아니면 null. */
export function adminLoginLockedFor(key: string): number | null {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || row.lockedUntil <= now) return null;
  return Math.ceil((row.lockedUntil - now) / 1000);
}

export function recordAdminLoginFailure(key: string): void {
  const now = Date.now();
  sweep(now);
  const row = attempts.get(key);
  if (!row || now - row.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  row.count += 1;
  if (row.count >= MAX_ATTEMPTS) {
    row.lockedUntil = now + LOCKOUT_MS;
    row.count = 0;
    row.firstAt = now;
  }
}

export function clearAdminLoginFailures(key: string): void {
  attempts.delete(key);
}

/**
 * 세션 토큰: `exp.jti.sig`
 *
 * jti(랜덤 세션 식별자)를 넣어 로그인마다 토큰이 달라지게 한다.
 * 향후 D1 에 jti 폐기 목록을 두면 개별 세션 무효화가 가능해진다
 * (현재는 시크릿 회전이 유일한 전체 무효화 수단).
 */
export function signAdminToken(secret: string, expMs: number): string {
  const exp = String(Date.now() + expMs);
  const jti = randomUUID().replace(/-/g, "");
  const sig = createHmac("sha256", secret).update(`${exp}.${jti}`).digest("hex");
  return `${exp}.${jti}.${sig}`;
}

export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  // 구 형식(exp.sig)은 더 이상 받지 않는다 — 재로그인 유도.
  if (parts.length !== 3) return false;
  const [exp, jti, sig] = parts;
  if (!exp || !jti || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(`${exp}.${jti}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
