import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url().max(2048),
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
