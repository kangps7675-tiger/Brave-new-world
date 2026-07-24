import { NextResponse } from "next/server";
import { apiStubResponse } from "@/lib/apiStub";
import {
  ensureSubmarineTunnelsSeeded,
  readSubmarineTunnelsFromD1,
} from "@/lib/d1MaritimeAir";
import { SUBMARINE_TUNNEL_SEED } from "@/data/submarineTunnels";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TUNNELS_CDN = publicCacheHeaders(CDN_CACHE.tunnels);

/**
 * 해저터널 클라우드 로그 — 토글 시 온디맨드.
 * GET /api/submarine-tunnels
 */
export async function GET(request: Request) {
  const stub = apiStubResponse("submarine-tunnels", request);
  if (stub) return stub;

  // 시드 보장 (마이그레이션 전 로컬 등)
  await ensureSubmarineTunnelsSeeded();

  const fromD1 = await readSubmarineTunnelsFromD1();
  const tunnels = fromD1?.tunnels ?? SUBMARINE_TUNNEL_SEED;

  return NextResponse.json(
    {
      receivedAt: new Date().toISOString(),
      count: tunnels.length,
      tunnels,
      source: fromD1?.source ?? "seed",
      attribution: "멋진 신세계 submarine tunnel seed (geopolitical logistics)",
    },
    { headers: TUNNELS_CDN },
  );
}
