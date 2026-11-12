import { NextResponse } from "next/server";
import { parseJmodList, parseJmodReport, type JmodReport } from "@/lib/jmodLaunch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_URL = "https://www.mod.go.jp/j/press/news/index.html";
const UA = "Mozilla/5.0 (compatible; StraitDesk/1.0; official-docs reader)";
const MAX_DETAIL = 12;

/**
 * GET /api/jmod-launches
 * 일본 방위성 「北朝鮮のミサイル等関連情報」 최근 발표에서 비행거리·최고고도·낙하 영역을 읽는다(좌표는 발표에 없다).
 * 방위성 사이트가 이 서버를 막거나 구조가 바뀌면 빈 목록을 돌려주고 속보 카드의 그 칸만 안 보인다.
 */
export async function GET() {
  try {
    const list = await fetch(LIST_URL, { headers: { "User-Agent": UA }, redirect: "follow", next: { revalidate: 900 } });
    if (!list.ok) throw new Error(`HTTP ${list.status}`);
    const items = parseJmodList(await list.text()).slice(0, MAX_DETAIL);
    const reports = (
      await Promise.all(
        items.map(async (it): Promise<JmodReport | null> => {
          try {
            const res = await fetch(it.url, { headers: { "User-Agent": UA }, redirect: "follow", next: { revalidate: 3600 } });
            return res.ok ? parseJmodReport(await res.text(), it) : null;
          } catch {
            return null;
          }
        }),
      )
    ).filter((r): r is JmodReport => r != null);
    return NextResponse.json({ reports, listed: items.length }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
  } catch (e) {
    return NextResponse.json({ reports: [], error: e instanceof Error ? e.message.slice(0, 100) : "failed" }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
