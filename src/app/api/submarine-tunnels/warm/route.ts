import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { NextResponse } from "next/server";
import { ensureSubmarineTunnelsSeeded } from "@/lib/d1MaritimeAir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  return authorizeCronRequest(request, ["INGEST_CRON_SECRET", "NEWS_WARM_SECRET"]);
}

/**
 * 해저터널 시드를 D1에 채운다 (이미 있으면 no-op).
 * POST /api/submarine-tunnels/warm
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const written = await ensureSubmarineTunnelsSeeded();
  return NextResponse.json({
    ok: true,
    written,
    receivedAt: new Date().toISOString(),
  });
}
