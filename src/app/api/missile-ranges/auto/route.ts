import { desc, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { newsStreamItems } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { autoRangeSpecs, rangeClaimsFromText, toWire } from "@/lib/missileRangeAuto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/missile-ranges/auto
 * 사거리 표에 없는 기종의 사거리를 최근 60일 뉴스 서술에서 자동으로 뽑는다(서로 다른 기사 2건 이상이 일치할 때만).
 * 결과는 "자동 추출·검수 전"으로 화면에 표시되고, 공식 표 항목을 덮어쓰지 않는다. 실패하면 빈 목록.
 */
export async function GET() {
  if (isApiStubMode()) return NextResponse.json({ specs: [], stub: true });
  try {
    const db = await getDb();
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const rows = await db
      .select({ title: newsStreamItems.title, summary: newsStreamItems.summary, link: newsStreamItems.link, pubDate: newsStreamItems.pubDate })
      .from(newsStreamItems)
      .where(gte(newsStreamItems.ingestedAt, since))
      .orderBy(desc(newsStreamItems.ingestedAt))
      .limit(5000);
    const claims = rows.flatMap((r) =>
      rangeClaimsFromText(`${r.title}. ${r.summary ?? ""}`, { url: r.link, title: r.title, at: r.pubDate ?? null }),
    );
    return NextResponse.json(
      { specs: autoRangeSpecs(claims).slice(0, 40).map(toWire), scanned: rows.length },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ specs: [], scanned: 0 }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
