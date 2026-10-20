import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import { replaceTelegramAlerts } from "@/lib/telegramAlertStore";
import { TELEGRAM_CHANNEL_COUNT, TELEGRAM_CATALOG_NOTE } from "@/lib/telegramAlerts";
import { isTelegramEmbedEnabled, syncTelegramEmbedAlerts } from "@/lib/telegramEmbedScrape";
import { translateTelegramAlerts } from "@/lib/telegramTranslate";
import { authorizeCronRequest } from "@/lib/auth/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  // 최대 120초 외부 스크레이핑 + 번역 API 호출을 유발하므로 cron 시크릿 필수.
  if (!authorizeCronRequest(req, ["INGEST_CRON_SECRET", "TELEGRAM_INGEST_SECRET"])) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isTelegramEmbedEnabled()) {
    return NextResponse.json({ error: "TELEGRAM_USE_EMBED is disabled" }, { status: 400 });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const theaterParam = url.searchParams.get("theater");
  const channelLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const theaters = theaterParam
    ? (theaterParam.split(",").filter(Boolean) as Array<"middle-east" | "ukraine">)
    : undefined;

  try {
    const { alerts, channelCount } = await syncTelegramEmbedAlerts({
      channelLimit: Number.isFinite(channelLimit) ? channelLimit : undefined,
      theaters,
    });
    const translated = await translateTelegramAlerts(alerts);
    replaceTelegramAlerts(translated);

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      channelCount,
      alertCount: translated.length,
      catalogNote: TELEGRAM_CATALOG_NOTE,
      totalChannels: TELEGRAM_CHANNEL_COUNT,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "sync failed") },
      { status: 500 },
    );
  }
}

/**
 * GET 은 더 이상 동기화를 트리거하지 않는다.
 *
 * 부수효과가 있는 GET 은 브라우저 프리페치·크롤러·CSRF 로 의도치 않게 실행되고,
 * 여기서는 120초짜리 외부 스크레이핑을 유발했다. cron/수동 트리거는 POST 를 쓸 것.
 */
export async function GET() {
  return NextResponse.json(
    { error: "method not allowed — use POST with Authorization: Bearer <INGEST_CRON_SECRET>" },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
