import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 실제 브라우저 푸시 서비스 호스트만 허용한다.
 *
 * 검증이 없으면 아무 URL이나 구독으로 넣을 수 있어 (a) D1 구독 테이블을 무한
 * 증식시키고 (b) 브로드캐스트 시 서버가 임의 호스트로 요청을 보내는
 * SSRF-유사 증폭기가 된다.
 */
const ALLOWED_PUSH_HOSTS = [
  /\.google\.com$/i, // fcm.googleapis.com / android.googleapis.com
  /\.googleapis\.com$/i,
  /\.mozilla\.com$/i, // updates.push.services.mozilla.com
  /\.mozaws\.net$/i,
  /\.windows\.com$/i, // WNS
  /\.microsoft\.com$/i,
  /\.apple\.com$/i, // Safari Web Push
];

function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    return ALLOWED_PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

const bodySchema = z.object({
  endpoint: z.string().url().max(2048).refine(isAllowedPushEndpoint, {
    message: "unsupported push service endpoint",
  }),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  lang: z.string().max(8).optional(),
});

/** POST /api/push/subscribe — 브라우저 PushSubscription → ingest Worker D1 */
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
    }

    const base = ingestWorkerBase();
    if (!base) {
      return NextResponse.json({ ok: false, error: "ingest unavailable" }, { status: 503 });
    }

    const res = await fetch(`${base}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "conflict-view",
      },
      body: JSON.stringify({
        endpoint: parsed.data.endpoint,
        keys: parsed.data.keys,
        lang: parsed.data.lang,
        userAgent: request.headers.get("user-agent") || undefined,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return NextResponse.json({ ok: Boolean(json.ok) }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
