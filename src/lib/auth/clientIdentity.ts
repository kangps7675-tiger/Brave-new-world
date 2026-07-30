/**
 * 클라이언트 식별·오류 응답 공용 유틸.
 *
 * SECURITY-ASSESSMENT-2026-07-30 MED-01 / MED-04 대응.
 */

/**
 * 레이트리밋용 클라이언트 키.
 *
 * `x-forwarded-for` 는 **클라이언트가 마음대로 넣을 수 있는 헤더**다. 오리진에
 * 직접 접근하면 헤더를 위조해 IP당 한도를 무한히 우회할 수 있으므로, Cloudflare가
 * 직접 채우는 `cf-connecting-ip` 를 신뢰의 근거로 삼는다.
 *
 * - `cf-connecting-ip` 있음 → 그 값 사용 (신뢰 가능)
 * - 없음 + `TRUST_PROXY_HEADERS=true` → x-forwarded-for 첫 값 (다른 신뢰 프록시 뒤)
 * - 없음 + 프로덕션 → `null` 반환 → 호출부는 **거부**해야 한다
 * - 없음 + 로컬 → "local"
 */
export function rateLimitKey(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (xff) return xff;
  }

  if (process.env.NODE_ENV !== "production") return "local";

  // 프로덕션인데 신뢰할 수 있는 IP 출처가 없다 → 레이트리밋이 무의미해지므로 거부.
  return null;
}

/**
 * 프로덕션에서는 내부 오류 원문을 감춘다.
 *
 * `error.message` 를 그대로 돌려주면 DB 스키마·파일 경로·업스트림 응답이
 * 새어나갈 수 있다. 상세 내용은 서버 로그에만 남긴다.
 */
export function publicErrorMessage(error: unknown, fallback = "internal error"): string {
  if (process.env.NODE_ENV !== "production") {
    return error instanceof Error ? error.message : fallback;
  }
  if (error instanceof Error) {
    console.error("[api]", error.message, error.stack);
  } else {
    console.error("[api]", error);
  }
  return fallback;
}
