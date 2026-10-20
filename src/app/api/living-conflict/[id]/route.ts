import { NextResponse } from "next/server";
import { loadLivingConflict } from "@/lib/livingConflict";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVING_CDN = publicCacheHeaders(CDN_CACHE.livingConflict);

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/living-conflict/[id] — 시드 6하원칙·고정 stages + living entries */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await loadLivingConflict(id);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "unknown living conflict" },
      { status: 404, headers: LIVING_CDN },
    );
  }
  return NextResponse.json(payload, { headers: LIVING_CDN });
}
