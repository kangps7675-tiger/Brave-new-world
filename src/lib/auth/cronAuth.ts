/**
 * Cron/워밍 라우트 공용 인증 게이트.
 *
 * 보안 원칙 (SECURITY-ASSESSMENT-2026-07-30 CRIT-01 / HIGH-02):
 * 1. **fail-closed** — 시크릿이 설정되지 않으면 프로덕션에서는 무조건 거부한다.
 *    (기존 `if (!secret) return true` 는 설정 실수 한 번으로 전면 개방되는 구조였다)
 * 2. **Authorization 헤더만 허용** — `?secret=` 쿼리는 CDN 액세스 로그·Referer·
 *    브라우저 히스토리에 평문으로 축적되므로 인증 수단으로 쓰지 않는다.
 * 3. **상수 시간 비교** — 타이밍 사이드채널 차단. Workers/Node 양쪽에서 도는
 *    순수 JS 구현이라 `node:crypto` 의존이 없다.
 */

/** 타이밍 세이프 문자열 비교. 길이 노출은 불가피하나 내용은 상수 시간. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // 길이가 달라도 조기 반환하지 않도록 고정 길이 루프를 돈다.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** `Authorization: Bearer <token>` 에서 토큰만 뽑는다. */
export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * 시크릿 기반 게이트.
 *
 * @param request 들어온 요청
 * @param envKeys 우선순위대로 확인할 환경변수 이름들
 * @returns 통과 여부
 *
 * - 시크릿 있음 → Bearer 토큰이 상수 시간 비교로 일치해야 통과
 * - 시크릿 없음 + 프로덕션 → **거부** (fail-closed)
 * - 시크릿 없음 + 로컬/개발 → 통과 (dev 편의)
 */
export function authorizeCronRequest(
  request: Request,
  envKeys: readonly string[] = ["INGEST_CRON_SECRET"],
): boolean {
  let secret = "";
  for (const key of envKeys) {
    const value = process.env[key]?.trim();
    if (value) {
      secret = value;
      break;
    }
  }

  if (!secret) return !isProduction();

  return safeEqual(bearerToken(request), secret);
}

/** 401 응답 헬퍼 — 시크릿 미설정 사유는 클라이언트에 노출하지 않는다. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
