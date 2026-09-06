import { NextResponse } from "next/server";
import { HAPI_CASUALTY_SEED } from "@/lib/hapiConflictCasualties";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ACLED / HDX HAPI conflict-events — 제품에서 제거.
 * 외부 ACLED 콘텐츠를 더 이상 조회·반환하지 않는다.
 */
export async function GET() {
  return NextResponse.json(
    {
      ...HAPI_CASUALTY_SEED,
      fronts: [],
      fetchedAt: new Date().toISOString(),
      source: "removed",
      note: "ACLED / HDX HAPI conflict-events layer removed from product",
    },
    { status: 410, headers: NO_STORE_HEADERS },
  );
}
