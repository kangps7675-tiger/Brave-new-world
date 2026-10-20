import {
  assertViinaRenderAccess,
  mintViinaGateToken,
  viinaGateSetCookieHeader,
  verifyViinaGateToken,
  VIINA_GATE_COOKIE,
} from "@/lib/licensing/viinaRenderGate";
import { VIINA_POLICY } from "@/lib/licensing/viinaPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=") || null;
  }
  return null;
}

/**
 * 브라우저(동일 출처)에만 VIINA 렌더 세션 쿠키 발급.
 * curl/스크립트는 Origin·Sec-Fetch 없이 거부됨.
 */
export async function GET(request: Request) {
  if (!VIINA_POLICY.renderingOnly) {
    return Response.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  // 세션 발급도 동일 출처 브라우저만 — 기존 쿠키 검증 전 Origin 검사
  // assertViinaRenderAccess는 쿠키를 요구하므로, 발급 엔드포인트는 Origin만 검사한다.
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    new URL(request.url).host
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  let originHost: string | null = null;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      originHost = null;
    }
  }
  let refererHost: string | null = null;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      refererHost = new URL(referer).host.toLowerCase();
    } catch {
      refererHost = null;
    }
  }

  if (process.env.VIINA_RENDER_GATE_RELAX !== "true") {
    if (originHost && originHost !== host) {
      return Response.json(
        { error: "viina-session-denied", reason: "cross-origin" },
        { status: 403 },
      );
    }
    if (!originHost && refererHost && refererHost !== host) {
      return Response.json(
        { error: "viina-session-denied", reason: "cross-origin" },
        { status: 403 },
      );
    }
    if (!originHost && !refererHost) {
      return Response.json(
        { error: "viina-session-denied", reason: "browser-only" },
        { status: 403 },
      );
    }
    const site = (request.headers.get("sec-fetch-site") || "").toLowerCase();
    if (site === "cross-site" || site === "none") {
      return Response.json(
        { error: "viina-session-denied", reason: "sec-fetch-blocked" },
        { status: 403 },
      );
    }
    const ua = request.headers.get("user-agent") || "";
    if (
      !ua.trim() ||
      /\b(curl|wget|python-requests|python-urllib|httpie|scrapy)\b/i.test(ua)
    ) {
      return Response.json(
        { error: "viina-session-denied", reason: "scraper-ua" },
        { status: 403 },
      );
    }
  }

  const existing = parseCookie(request.headers.get("cookie"), VIINA_GATE_COOKIE);
  const token =
    existing && verifyViinaGateToken(existing) ? existing : mintViinaGateToken();

  return Response.json(
    { ok: true, policy: "viina-rendering-only", ttlSec: 60 * 60 * 6 },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": viinaGateSetCookieHeader(token),
        "X-Viina-Policy": "rendering-only",
      },
    },
  );
}

/** 세션 유효성만 확인 (쿠키 갱신 없음) */
export async function HEAD(request: Request) {
  const gate = assertViinaRenderAccess(request);
  if (!gate.ok) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204 });
}
