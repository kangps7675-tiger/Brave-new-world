import { desc, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { newsStreamItems } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { unregisteredMissileMentions } from "@/lib/missileRange";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/missile-ranges/unregistered?days=14
 * 최근 뉴스에서 "발사" 글인데 사거리 표(src/data/missileRanges.ts)에 없는 기종 이름 후보와 언급 횟수.
 * 새 기종이 나왔다는 신호이자 표를 보강할 순서다. 후보에는 잡음이 섞일 수 있으니 사람이 보고 판단한다.
 * 뉴스 스트림 D1 스냅샷을 읽기만 한다. 실패하면 빈 목록.
 */
export async function GET(request: Request) {
  const days = Math.min(60, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 14));
  if (isApiStubMode()) return NextResponse.json({ unregistered: [], stub: true });
  try {
    const db = await getDb();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const rows = await db
      .select({ title: newsStreamItems.title, summary: newsStreamItems.summary, link: newsStreamItems.link, pubDate: newsStreamItems.pubDate })
      .from(newsStreamItems)
      .where(gte(newsStreamItems.ingestedAt, since))
      .orderBy(desc(newsStreamItems.ingestedAt))
      .limit(3000);
    return NextResponse.json(
      { unregistered: unregisteredMissileMentions(rows).slice(0, 30), scanned: rows.length, days },
      { headers: { "Cache-Control": "public, s-maxage=1800" } },
    );
  } catch {
    return NextResponse.json({ unregistered: [], scanned: 0, days }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
