import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";
import { syncNewfeedsIran } from "@/lib/newfeeds/syncNewfeeds";
import { getNewfeedsStoreMeta } from "@/lib/newfeeds/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * NewFeeds Iran 프로덕션 sync — cron only.
 * GitHub raw → memory + D1. stub/시드 없음.
 */
export async function POST(req: Request) {
  if (!authorizeCronRequest(req, ["INGEST_CRON_SECRET", "NEWFEEDS_INGEST_SECRET"])) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await syncNewfeedsIran();
    return NextResponse.json({
      ...result,
      meta: getNewfeedsStoreMeta(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "newfeeds sync failed") },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "method not allowed — use POST with Authorization: Bearer <INGEST_CRON_SECRET>",
      meta: getNewfeedsStoreMeta(),
    },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
