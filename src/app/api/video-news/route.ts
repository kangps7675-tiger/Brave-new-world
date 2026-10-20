import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { NextResponse } from "next/server";
import {
  emptyVideoPayload,
  parseLangParam,
  parsePackagesParam,
  resolveTopicFromPackages,
  resolveVideoNews,
  videoNewsServerFetchMax,
} from "@/lib/news/videoNewsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 동영상 뉴스 메타 (D1 우선). 본문 재생기 없음 — 클라가 클릭 시 embed.
 * GET /api/video-news?packages=&lang=&live=1&max=
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const packages = parsePackagesParam(url.searchParams.get("packages"));
    const lang = parseLangParam(url.searchParams.get("lang"));
    const preferLive = url.searchParams.get("live") === "1";
    const defaultMax = videoNewsServerFetchMax();
    const maxRaw = Number(url.searchParams.get("max") || defaultMax);
    const max = Math.min(Math.max(1, Number.isFinite(maxRaw) ? maxRaw : defaultMax), 48);

    const { payload, source, ageMs } = await resolveVideoNews({
      packages,
      lang,
      preferLive,
      max,
    });

    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
      "X-Video-News-Source": source,
    };
    if (typeof ageMs === "number") headers["X-Video-News-Age-Ms"] = String(ageMs);

    return NextResponse.json(payload, { headers });
  } catch (error) {
    const topic = resolveTopicFromPackages(
      parsePackagesParam(new URL(req.url).searchParams.get("packages")),
    );
    const message = publicErrorMessage(error, "동영상 뉴스 로드 실패");
    return NextResponse.json(emptyVideoPayload(topic, message), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
