import { MISSILE_EVENTS } from "@/data/missileReports";
import { isDprkMissileArticle, mentionedAgencies, safeArticleUrl, type MissileArticleCandidate, type MissileAgency } from "@/lib/missileTrack";
import { parseRssXml } from "@/lib/news/rssParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const queries: { agency: MissileAgency; query: string }[] = [
  { agency: "jcs", query: '"North Korea" missile "Joint Chiefs of Staff" when:30d' },
  { agency: "jmod", query: '"North Korea" missile "Japan" "defense" when:30d' },
  { agency: "pentagon", query: '"North Korea" missile "Pentagon" when:30d' },
];

export async function GET() {
  const results = await Promise.allSettled(queries.map(async ({ agency, query }) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!response.ok) throw new Error("feed unavailable");
    const xml = await response.text();
    if (!/<rss\b|<feed\b/i.test(xml)) throw new Error("invalid feed");
    return { agency, items: parseRssXml(xml) };
  }));
  const candidatesByUrl = new Map<string, MissileArticleCandidate>();
  const now = Date.now();
  const failedFeeds = results.filter(r => r.status === "rejected").length;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { agency, items } = result.value;
    for (const item of items) {
      const link = safeArticleUrl(item.link);
      const text = `${item.title} ${item.summary ?? ""}`;
      const date = Date.parse(item.pubDate);
      if (!link || !isDprkMissileArticle(text) || !Number.isFinite(date) || date > now + 3600000 || date < now - 30 * 86400000) continue;
      const existing = candidatesByUrl.get(link);
      if (existing) {
        if (!existing.queriedAgencies.includes(agency)) existing.queriedAgencies.push(agency);
        continue;
      }
      candidatesByUrl.set(link, {
        title: item.title, link, pubDate: item.pubDate, publisher: item.publisher,
        agencies: mentionedAgencies(text), queriedAgencies: [agency], status: "needs-review",
      });
    }
  }
  const candidates = [...candidatesByUrl.values()]
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate)).slice(0, 30);
  return Response.json({
    events: MISSILE_EVENTS, candidates, fetchedAt: new Date().toISOString(), failedFeeds,
  }, { headers: { "Cache-Control": failedFeeds ? "no-store" : "public, max-age=60, stale-while-revalidate=300" } });
}
