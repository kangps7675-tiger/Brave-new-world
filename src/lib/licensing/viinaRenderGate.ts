/**
 * VIINA 가공 데이터 — 앱 화면 렌더 전용 접근 게이트.
 *
 * curl/스크립트/타 사이트에서의 bulk 가져가기를 차단:
 * 1) HttpOnly 서명 세션 쿠키 (브라우저 방문으로만 발급)
 * 2) same-origin (Origin/Host · Sec-Fetch-Site)
 * 3) IP 레이트리밋
 * 4) 스크레이퍼 UA 거부
 *
 * @see docs/copyright-checklist.md
 */

import { createHmac, timingSafeEqual } from "crypto";
import { rejectViinaPublicDataApi } from "@/lib/licensing/viinaPolicy";

export const VIINA_GATE_COOKIE = "cv_viina_gate";
/** 세션 수명 (초) */
const SESSION_TTL_SEC = 60 * 60 * 6;
/** IP당 분당 요청 상한 (렌더 경로 합산) */
const RATE_LIMIT_PER_MIN = 40;

type GateFailReason =
  | "gate-relaxed-bypass"
  | "missing-session"
  | "invalid-session"
  | "expired-session"
  | "cross-origin"
  | "sec-fetch-blocked"
  | "scraper-ua"
  | "rate-limited"
  | "export-accept";

export type ViinaGateResult =
  | { ok: true }
  | { ok: false; reason: GateFailReason; response: Response };

type RateBucket = { count: number; resetAt: number };
const rateByIp = new Map<string, RateBucket>();

function gateSecret(): string {
  return (
    process.env.VIINA_RENDER_GATE_SECRET?.trim() ||
    process.env.INGEST_CRON_SECRET?.trim() ||
    process.env.NEWS_WARM_SECRET?.trim() ||
    "dev-only-viina-render-gate"
  );
}

function isGateRelaxed(): boolean {
  return process.env.VIINA_RENDER_GATE_RELAX === "true";
}

function sign(payload: string): string {
  return createHmac("sha256", gateSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** 발급용 토큰 — `exp.sig` */
export function mintViinaGateToken(nowSec = Math.floor(Date.now() / 1000)): string {
  const exp = String(nowSec + SESSION_TTL_SEC);
  return `${exp}.${sign(exp)}`;
}

export function verifyViinaGateToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [exp, sig] = parts;
  if (!/^\d+$/.test(exp) || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function viinaGateSetCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${VIINA_GATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SEC}${secure}`;
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=") || null;
  }
  return null;
}

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateByIp.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateByIp.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_MIN) return false;
  bucket.count += 1;
  return true;
}

function requestHost(request: Request): string {
  const url = new URL(request.url);
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host)
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function hostFromOriginOrReferer(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function isSameOriginBrowser(request: Request): { ok: boolean; reason?: GateFailReason } {
  const host = requestHost(request);
  const originHost = hostFromOriginOrReferer(request.headers.get("origin"));
  const refererHost = hostFromOriginOrReferer(request.headers.get("referer"));

  // fetch() 동일 출처는 Origin을 붙임. 불일치면 차단.
  if (originHost && originHost !== host) {
    return { ok: false, reason: "cross-origin" };
  }
  // Origin 없고 Referer만 있는 경우(일부 네비게이션) — 호스트 일치 요구
  if (!originHost && refererHost && refererHost !== host) {
    return { ok: false, reason: "cross-origin" };
  }
  // curl 등: Origin/Referer 둘 다 없음 → 차단 (세션만으로도 부족, 브라우저 맥락 강제)
  if (!originHost && !refererHost) {
    return { ok: false, reason: "cross-origin" };
  }

  const site = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site === "cross-site" || site === "none") {
    return { ok: false, reason: "sec-fetch-blocked" };
  }
  // same-origin / same-site / 빈 값(구형) — 빈 값은 Origin 체크로 이미 보완

  return { ok: true };
}

const SCRAPER_UA =
  /\b(curl|wget|python-requests|python-urllib|httpie|postman|insomnia|go-http|java\/|scrapy|axios\/|node-fetch|libwww|httpclient|okhttp)\b/i;

function isScraperUa(request: Request): boolean {
  const ua = request.headers.get("user-agent") || "";
  if (!ua.trim()) return true;
  return SCRAPER_UA.test(ua);
}

function wantsExport(request: Request): boolean {
  const accept = (request.headers.get("accept") || "").toLowerCase();
  if (accept.includes("text/csv") || accept.includes("application/geo+json")) return true;
  const url = new URL(request.url);
  return (
    url.searchParams.has("download") ||
    url.searchParams.get("export") === "1" ||
    url.searchParams.get("format") === "geojson" ||
    url.searchParams.get("format") === "csv"
  );
}

function deny(reason: GateFailReason): ViinaGateResult {
  const body = {
    error: "viina-render-access-denied",
    reason,
    policy: "viina-rendering-only",
    message:
      "VIINA render data is only available to the 멋진 신세계 UI (same-origin session). Bulk fetch and export are blocked.",
  };
  return {
    ok: false,
    reason,
    response: Response.json(body, {
      status: reason === "rate-limited" ? 429 : 403,
      headers: {
        "Cache-Control": "no-store",
        "X-Viina-Policy": "rendering-only",
        "X-Viina-Gate": reason,
      },
    }),
  };
}

/**
 * 렌더 GET 경로 공통 가드.
 * Cron POST 재빌드는 `authorizeWarm`으로 별도 처리 — 이 함수를 쓰지 말 것.
 */
export function assertViinaRenderAccess(request: Request): ViinaGateResult {
  if (isGateRelaxed()) {
    return { ok: true };
  }

  if (wantsExport(request)) {
    return {
      ok: false,
      reason: "export-accept",
      response: rejectViinaPublicDataApi("user-export-forbidden"),
    };
  }

  if (isScraperUa(request)) {
    return deny("scraper-ua");
  }

  const originCheck = isSameOriginBrowser(request);
  if (!originCheck.ok) {
    return deny(originCheck.reason || "cross-origin");
  }

  const token = parseCookie(request.headers.get("cookie"), VIINA_GATE_COOKIE);
  if (!token) return deny("missing-session");
  if (!verifyViinaGateToken(token)) {
    // 서명 실패 vs 만료 구분
    const exp = token.split(".")[0];
    if (/^\d+$/.test(exp) && Number(exp) < Math.floor(Date.now() / 1000)) {
      return deny("expired-session");
    }
    return deny("invalid-session");
  }

  const ip = clientIp(request);
  if (!checkRateLimit(ip)) {
    return deny("rate-limited");
  }

  return { ok: true };
}

/** Cron/워밍 등 서버 간 호출 — Bearer로 게이트 우회 */
export function isViinaCronAuthorized(request: Request): boolean {
  const secret =
    process.env.INGEST_CRON_SECRET?.trim() || process.env.NEWS_WARM_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}
