import { NextResponse } from "next/server";
import { buildLampFeaturedFromPayloads } from "@/lib/news/lampNewsPool";
import {
  parseLangParam,
  resolveNewsStream,
} from "@/lib/news/newsStreamService";
import type { ViewPackageId } from "@/lib/viewPackages";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 6시간 등불 — 양 패키지 합산 + og:image 추가 보강 + 기사에 붙은 사진이 있는 핫뉴스만 반환.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = parseLangParam(url.searchParams.get("lang"));
  const mode = url.searchParams.get("mode") === "economy" ? "economy" : "conflict";
  const primary: ViewPackageId = mode === "economy" ? "geo-trader" : "conflict-watch";
  const secondary: ViewPackageId = mode === "economy" ? "conflict-watch" : "geo-trader";

  try {
    const [main, alt] = await Promise.all([
      resolveNewsStream({ packages: [primary], lang, preferLive: true }),
      resolveNewsStream({ packages: [secondary], lang }),
    ]);
    const featuredNews = await buildLampFeaturedFromPayloads(mode, lang, [
      main.payload,
      alt.payload,
    ]);
    return NextResponse.json(
      { featuredNews, source: main.source },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "lamp-news failed";
    return NextResponse.json({ featuredNews: [], error: message }, { status: 500 });
  }
}
