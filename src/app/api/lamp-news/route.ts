import { NextResponse } from "next/server";
import {
  buildLampFeaturedFromPayloads,
  buildWeeklyRecapFeaturedFromPayloads,
} from "@/lib/news/lampNewsPool";
import {
  parseLangParam,
  resolveNewsStream,
} from "@/lib/news/newsStreamService";
import type { ViewPackageId } from "@/lib/viewPackages";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 등불 사진 뉴스 — 양 패키지 합산 + og:image 보강 + 기사 사진 있는 핫뉴스.
 * `window=prev-week` → 월요일 주간 회고(전주 ISO 주).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = parseLangParam(url.searchParams.get("lang"));
  const mode = url.searchParams.get("mode") === "economy" ? "economy" : "conflict";
  const window =
    url.searchParams.get("window") === "prev-week" ? "prev-week" : "slot";
  const primary: ViewPackageId = mode === "economy" ? "geo-trader" : "conflict-watch";
  const secondary: ViewPackageId = mode === "economy" ? "conflict-watch" : "geo-trader";

  try {
    const [main, alt] = await Promise.all([
      resolveNewsStream({ packages: [primary], lang, preferLive: true }),
      resolveNewsStream({ packages: [secondary], lang }),
    ]);
    const payloads = [main.payload, alt.payload];
    const featuredNews =
      window === "prev-week"
        ? await buildWeeklyRecapFeaturedFromPayloads(mode, lang, payloads)
        : await buildLampFeaturedFromPayloads(mode, lang, payloads);
    return NextResponse.json(
      { featuredNews, source: main.source, window },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "lamp-news failed";
    return NextResponse.json({ featuredNews: [], error: message }, { status: 500 });
  }
}
