import { NextResponse } from "next/server";
import { isTelegramOsintEnabled } from "@/lib/serverEnv";
import { parseTelegramPostKey, type TelegramVideoPost } from "@/lib/telegramVideo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_INGEST_URL = "https://conflict-view-ingest.kangps7675.workers.dev";

type WorkerVideo = {
  id?: unknown;
  channelTitle?: unknown;
  region?: unknown;
  caption?: unknown;
  receivedAt?: unknown;
  messageUrl?: unknown;
};

/**
 * GET /api/telegram-videos — 영상이 달린 텔레그램 게시물 목록 (메타만).
 * 영상은 내려받지 않는다: 화면이 텔레그램 공식 임베드(iframe)로 원본 게시물을 보여 준다.
 */
export async function GET() {
  if (!isTelegramOsintEnabled()) {
    return NextResponse.json({ videos: [], disabled: true }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  }
  const base = (process.env.TELEGRAM_INGEST_URL || DEFAULT_INGEST_URL).trim().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/telegram/videos?limit=24`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`worker ${res.status}`);
    const payload = (await res.json()) as { videos?: WorkerVideo[] };
    const videos: TelegramVideoPost[] = [];
    for (const v of payload.videos ?? []) {
      const key = typeof v.id === "string" ? parseTelegramPostKey(v.id) : null;
      if (!key || typeof v.receivedAt !== "string") continue; // 형식이 이상한 항목은 임베드하지 않는다
      videos.push({
        id: v.id as string,
        channel: key.channel,
        postId: key.postId,
        channelTitle: typeof v.channelTitle === "string" ? v.channelTitle : null,
        region: typeof v.region === "string" ? v.region : "global",
        caption: typeof v.caption === "string" ? v.caption : "",
        receivedAt: v.receivedAt,
        messageUrl: `https://t.me/${key.channel}/${key.postId}`,
      });
    }
    return NextResponse.json(
      { videos, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json(
      { videos: [], fetchedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=30" } },
    );
  }
}
