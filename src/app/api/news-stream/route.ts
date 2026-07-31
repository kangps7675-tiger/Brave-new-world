import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import {
  emptyNewsPayload,
  parseLangParam,
  parsePackagesParam,
  resolveNewsStream,
} from "@/lib/news/newsStreamService";

/** RSS only — Telegram OSINT must stay on /api/telegram-alerts (telegramOsintPolicy) */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const packages = parsePackagesParam(url.searchParams.get("packages"));
    const lang = parseLangParam(url.searchParams.get("lang"));
    const preferLive = url.searchParams.get("live") === "1";

    const { payload, source, ageMs } = await resolveNewsStream({
      packages,
      lang,
      preferLive,
    });

    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "X-News-Source": source,
    };
    if (typeof ageMs === "number") headers["X-News-Age-Ms"] = String(ageMs);

    return NextResponse.json(payload, { headers });
  } catch (error) {
    const message = publicErrorMessage(error, "뉴스 스트림 로드 실패");
    return NextResponse.json(emptyNewsPayload(message), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
