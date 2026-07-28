/**
 * API 라우트 structured log — Sentry 도입 전 최소 관측성.
 * Cloudflare/Workers 로그·로컬 console에서 JSON으로 검색 가능.
 */

export type ApiLogLevel = "info" | "warn" | "error";

export function logApiRoute(
  route: string,
  level: ApiLogLevel,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    route,
    level,
    message,
    ...extra,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
