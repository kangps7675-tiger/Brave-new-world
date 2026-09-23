import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { militaryExercises } from "@/db/schema";
import { apiStubResponse } from "@/lib/apiStub";
import { rowToMilitaryExercise, inferActorsFromText, type MilitaryExercise } from "@/lib/militaryExercises";
import { CURATED_EXERCISES } from "@/data/exerciseBriefs";
import {
  EXERCISE_CATEGORY_QUERIES,
  exerciseCategoryFromActors,
  isExerciseArticle,
  type ExerciseArticleCandidate,
} from "@/lib/exerciseReports";
import { parseRssXml } from "@/lib/news/rssParser";
import { safeArticleUrl } from "@/lib/missileTrack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 120;

/**
 * 군사 훈련 경보 스냅샷 = D1 실황(NAVAREA 파생) + 수동 검증한 사건(exerciseBriefs.ts) 병합.
 * D1 읽기 실패·미마이그레이션 시에도 검증된 사건은 항상 내려간다.
 * candidates는 5개 카테고리 뉴스 수집 결과이며, 검토 전에는 지도에 반영하지 않는다.
 */
async function loadD1Exercises(activeOnly: boolean): Promise<MilitaryExercise[]> {
  try {
    const db = await getDb();
    const rows = activeOnly
      ? await db
          .select()
          .from(militaryExercises)
          .where(eq(militaryExercises.active, 1))
          .orderBy(desc(militaryExercises.announcedAt))
          .limit(LIMIT)
      : await db
          .select()
          .from(militaryExercises)
          .orderBy(desc(militaryExercises.announcedAt))
          .limit(LIMIT);
    return rows.map(rowToMilitaryExercise);
  } catch {
    return [];
  }
}

async function collectExerciseCandidates(): Promise<{
  candidates: ExerciseArticleCandidate[];
  failedFeeds: number;
}> {
  const results = await Promise.allSettled(
    EXERCISE_CATEGORY_QUERIES.map(async ({ category, query }) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
      if (!response.ok) throw new Error("feed unavailable");
      const xml = await response.text();
      if (!/<rss\b|<feed\b/i.test(xml)) throw new Error("invalid feed");
      return { category, items: parseRssXml(xml) };
    }),
  );

  const byUrl = new Map<string, ExerciseArticleCandidate>();
  const now = Date.now();
  const failedFeeds = results.filter((r) => r.status === "rejected").length;

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { category, items } = result.value;
    for (const item of items) {
      const link = safeArticleUrl(item.link);
      const text = `${item.title} ${item.summary ?? ""}`;
      const date = Date.parse(item.pubDate);
      if (!link || !isExerciseArticle(text) || !Number.isFinite(date)) continue;
      if (date > now + 3600_000 || date < now - 14 * 86_400_000) continue;
      const existing = byUrl.get(link);
      if (existing) {
        if (!existing.queriedCategories.includes(category)) existing.queriedCategories.push(category);
        continue;
      }
      const actors = inferActorsFromText(text);
      byUrl.set(link, {
        title: item.title,
        link,
        pubDate: item.pubDate,
        publisher: item.publisher,
        actors,
        category: exerciseCategoryFromActors(actors),
        queriedCategories: [category],
        status: "needs-review",
      });
    }
  }

  const candidates = [...byUrl.values()]
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, 40);
  return { candidates, failedFeeds };
}

export async function GET(request: Request) {
  const stub = apiStubResponse("military-exercises", request);
  if (stub) return stub;

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("all") !== "1";
  const includeCandidates = url.searchParams.get("candidates") === "1";

  const d1Exercises = await loadD1Exercises(activeOnly);
  const exercises = [...CURATED_EXERCISES, ...d1Exercises];

  if (!includeCandidates) {
    return NextResponse.json(
      { exercises, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    );
  }

  const { candidates, failedFeeds } = await collectExerciseCandidates();
  return NextResponse.json(
    { exercises, candidates, fetchedAt: new Date().toISOString(), failedFeeds },
    { headers: { "Cache-Control": failedFeeds ? "no-store" : "public, s-maxage=120, stale-while-revalidate=300" } },
  );
}
