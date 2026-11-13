/**
 * 지금 떠 있는 속보에 근거(공식 문서·언론 기사)가 실제로 몇 건이나 붙는지 잰다.
 * 화면이 쓰는 매칭 함수(polledDocsForFlash·articlesForFlash)를 그대로 불러 쓰므로, 화면에서 눌러 본 결과와 같은 숫자가 나온다.
 *
 *   npx tsx scripts/measure-evidence-coverage.ts
 *   npx tsx scripts/measure-evidence-coverage.ts https://conflict-view.vercel.app   # 대상 서버 직접 지정
 *
 * 결과는 콘솔과 scripts/data/evidence-coverage-report.json(저장소에 올리지 않음)에 남는다.
 */
import fs from "node:fs";
import path from "node:path";
import { rareTagsOf, actorsOf } from "../src/lib/news/eventScenarios";
import { articlesForFlash } from "../src/lib/officialDocs/match";
import { polledDocsForFlash, type PolledDoc } from "../src/lib/officialDocs/matchPolled";
import type { NewsStreamItem, NewsStreamPayload } from "../src/lib/news/types";

const BASE = (process.argv[2] ?? "https://conflict-view.vercel.app").replace(/\/$/, "");

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "StraitDesk/evidence-coverage" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

type Reason =
  | "연결됨"
  | "단서 없음(지명·당사자 모두 안 읽힘)"
  | "이 지명의 공식 문서가 수집분에 없음"
  | "문서는 있으나 발행일이 속보와 14일 이상 어긋남"
  | "당사자 문서는 있으나 점수 미달(지명·주제 단서 약함)"
  | "수집된 공식 문서 자체가 없음";

async function main() {
  const [docsRes, news] = await Promise.all([
    getJson<{ docs?: PolledDoc[] }>(`${BASE}/api/official-docs?days=30&debug=1`),
    getJson<NewsStreamPayload>(`${BASE}/api/news-stream`),
  ]);
  const docs = Array.isArray(docsRes.docs) ? docsRes.docs : [];
  const pool: NewsStreamItem[] = [...(news.hero ? [news.hero] : []), ...(news.flashHeroes ?? []), ...(news.verified ?? []), ...(news.stateMedia ?? [])];
  const flashes = [...(news.hero ? [news.hero] : []), ...(news.flashHeroes ?? []), ...(news.verified ?? [])];
  const seen = new Set<string>();
  const uniq = flashes.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true))).slice(0, 60);

  const docTagIndex = new Set<string>();
  for (const d of docs) for (const t of d.tags.split(",").map((x) => x.trim())) if (t && !t.startsWith("topic:")) docTagIndex.add(t);
  const issuerCount = new Map<string, number>();
  for (const d of docs) issuerCount.set(d.issuerId, (issuerCount.get(d.issuerId) ?? 0) + 1);

  const rows = uniq.map((f) => {
    const text = `${f.title}. ${f.summary ?? ""}`;
    const at = Date.parse(f.pubDate);
    const polled = polledDocsForFlash(text, at, docs);
    const arts = articlesForFlash(text, at, pool, f.link);
    const places = rareTagsOf(text);
    const actors = actorsOf(text);
    let reason: Reason = "연결됨";
    if (polled.length === 0 && arts.length === 0) {
      if (docs.length === 0) reason = "수집된 공식 문서 자체가 없음";
      else if (places.length === 0 && actors.length === 0) reason = "단서 없음(지명·당사자 모두 안 읽힘)";
      else if (places.length > 0 && !places.some((p) => docTagIndex.has(p))) reason = "이 지명의 공식 문서가 수집분에 없음";
      else if (places.some((p) => docTagIndex.has(p))) reason = "문서는 있으나 발행일이 속보와 14일 이상 어긋남";
      else reason = "당사자 문서는 있으나 점수 미달(지명·주제 단서 약함)";
    }
    return { id: f.id, title: f.title.slice(0, 80), pubDate: f.pubDate, places, actors, polled: polled.length, articles: arts.length, reason };
  });

  const total = rows.length;
  const withDoc = rows.filter((r) => r.polled > 0).length;
  const withArt = rows.filter((r) => r.articles > 0).length;
  const withAny = rows.filter((r) => r.polled > 0 || r.articles > 0).length;
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "-");

  console.log(`\n대상 서버: ${BASE}`);
  console.log(`수집된 공식 문서 ${docs.length}건 / 나라별:`, Object.fromEntries(issuerCount));
  console.log(`속보 ${total}건 점검\n`);
  console.log(`공식 문서 연결: ${withDoc}건 (${pct(withDoc)})`);
  console.log(`언론 기사 연결: ${withArt}건 (${pct(withArt)})`);
  console.log(`둘 중 하나라도: ${withAny}건 (${pct(withAny)})\n`);

  const byReason = new Map<string, number>();
  for (const r of rows) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  console.log("연결 안 된 이유별 건수:");
  for (const [k, v] of [...byReason].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);

  console.log("\n연결 안 된 속보 표본(최대 15건):");
  for (const r of rows.filter((x) => x.polled === 0 && x.articles === 0).slice(0, 15)) {
    console.log(`  - ${r.title}\n      지명=${r.places.join(",") || "-"} 당사자=${r.actors.join(",") || "-"} → ${r.reason}`);
  }

  const outDir = path.join(__dirname, "data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "evidence-coverage-report.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), docs: docs.length, total, withDoc, withArt, withAny, rows }, null, 2));
  console.log("\n전체 표는 scripts/data/evidence-coverage-report.json 에 저장했습니다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
