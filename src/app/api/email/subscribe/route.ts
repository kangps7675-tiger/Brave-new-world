import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/emailDigest";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/email/subscribe — 화면 신청을 ingest 워커로 넘긴다. */
export async function POST(request: Request) {
  let body: { email?: unknown; lang?: unknown; company?: unknown; consent?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; lang?: unknown; company?: unknown; consent?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  if (body.consent !== true) {
    return NextResponse.json({ ok: false, error: "consent_required" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }
  const base = ingestWorkerBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const res = await fetch(`${base}/email/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeEmail(email),
        lang: body.lang === "en" ? "en" : "ko",
        consent: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => ({ ok: false, error: "subscribe_failed" }))) as {
      ok?: boolean;
      error?: string;
    };
    return NextResponse.json(
      { ok: Boolean(json.ok), error: json.error },
      { status: res.ok ? 200 : res.status },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "subscribe_failed" }, { status: 502 });
  }
}
