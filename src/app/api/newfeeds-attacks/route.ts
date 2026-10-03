import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import {
  NEWFEEDS_ATTRIBUTION,
  NEWFEEDS_REPO_URL,
  type NewfeedsAttacksPayload,
} from "@/lib/newfeeds";
import { syncNewfeedsIran } from "@/lib/newfeeds/syncNewfeeds";
import {
  NEWFEEDS_ATTACKS_CACHE_KEY,
  getNewfeedsAttacksMemory,
  setNewfeedsAttacksMemory,
} from "@/lib/newfeeds/store";
import { loadNewfeedsSnapshot } from "@/lib/newfeeds/persist";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/newfeeds-attacks?iran=1
 * NewFeeds 프로덕션 스냅샷 (cron sync 우선) · Attribution: ktoetotam/NewFeeds (MIT)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iranOnly = searchParams.get("iran") !== "0";

  try {
    let payload = getNewfeedsAttacksMemory();

    if (!payload?.attacks.length) {
      const fromD1 = await loadNewfeedsSnapshot<NewfeedsAttacksPayload>(
        NEWFEEDS_ATTACKS_CACHE_KEY,
      );
      if (fromD1?.payload?.attacks?.length) {
        setNewfeedsAttacksMemory(fromD1.payload);
        payload = fromD1.payload;
      }
    }

    // 스냅샷 비었으면 즉시 upstream sync (첫 요청·콜드 스타트)
    if (!payload?.attacks.length) {
      const synced = await syncNewfeedsIran();
      payload = getNewfeedsAttacksMemory();
      if (!payload?.attacks.length) {
        return NextResponse.json(
          {
            fetchedAt: new Date().toISOString(),
            live: false,
            attribution: NEWFEEDS_ATTRIBUTION,
            attributionUrl: NEWFEEDS_REPO_URL,
            threatLabel: null,
            threatLevel: null,
            attacks: [],
            iranCount: 0,
            error: synced.error || "newfeeds attacks unavailable",
          } satisfies NewfeedsAttacksPayload,
          { status: 502 },
        );
      }
    }

    const attacks = iranOnly
      ? payload.attacks.filter((a) => a.iranRelated)
      : payload.attacks;

    return NextResponse.json(
      {
        ...payload,
        attacks,
        iranCount: payload.attacks.filter((a) => a.iranRelated).length,
        stub: false,
      },
      { headers: publicCacheHeaders(CDN_CACHE.newfeeds) },
    );
  } catch (error) {
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        live: false,
        attribution: NEWFEEDS_ATTRIBUTION,
        attributionUrl: NEWFEEDS_REPO_URL,
        threatLabel: null,
        threatLevel: null,
        attacks: [],
        iranCount: 0,
        stub: false,
        error: publicErrorMessage(error, "newfeeds fetch failed"),
      } satisfies NewfeedsAttacksPayload,
      { status: 502 },
    );
  }
}
