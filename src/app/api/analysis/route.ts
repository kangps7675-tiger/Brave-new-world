import { NextResponse } from "next/server";
import feedsJson from "@/data/analysisFeeds.json";
import { parseAnalysisFeed, type AnalysisItem, type AnalysisSource } from "@/lib/analysis/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "Mozilla/5.0 (compatible; StraitDesk/1.0; analysis feed reader)";
const PER_FEED = 40;

/**
 * GET /api/analysis
 * 싱크탱크 분석 글(제목·링크·날짜·저자·분류·짧은 발췌)을 RSS에서 읽어 돌려준다. 원문은 가져오지 않는다.
 * DB 없이 요청 때 읽고 30분 캐시한다. 한 곳이 실패해도 나머지는 돌려주고, 전부 실패하면 빈 목록.
 */
export async function GET() {
  const sources = feedsJson as AnalysisSource[];
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const res = await fetch(source.url, { headers: { Accept: "application/rss+xml, application/xml, text/xml, */*", "User-Agent": UA }, next: { revalidate: 1800 } });
      if (!res.ok) throw new Error(`${source.id}: HTTP ${res.status}`);
      return parseAnalysisFeed(await res.text(), source).slice(0, PER_FEED);
    }),
  );
  const items: AnalysisItem[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => (r.status === "fulfilled" ? items.push(...r.value) : failed.push(sources[i].id)));
  items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return NextResponse.json({ items, failed }, { headers: { "Cache-Control": `public, s-maxage=${items.length ? 1800 : 60}, stale-while-revalidate=3600` } });
}
