/**
 * 속보에 붙은 공식 문서가 맞는지 사람이 채점할 표본을 뽑는다. "얼마나 맞는지"를 재는 유일한 방법이라 따로 둔다.
 *
 *   npm run docs:sample                          # 배포 사이트(기본 https://straitdesk.app)에서 속보 30건 표본
 *   npm run docs:sample -- https://내-주소 40      # 주소와 표본 수 지정
 *   npm run docs:sample -- --score               # 채점한 파일을 읽어 정밀도 계산
 *
 * 파일(scripts/data/doc-match-sample.md)의 각 줄 `- [ ] 맞음  [ ] 틀림` 중 하나에 x 표시를 하고 --score 를 돌리면
 * 붙은 문서 중 맞은 비율(정밀도)이 나온다. 문서가 하나도 안 붙은 속보는 "놓침 후보"로 따로 모아 두니,
 * 그중 붙었어야 할 것에 `[x] 붙었어야 함`을 표시하면 놓친 비율도 대략 알 수 있다.
 */
import fs from "node:fs";
import path from "node:path";
import { polledDocsForFlash, type PolledDoc } from "../src/lib/officialDocs/matchPolled";

const FILE = path.join(__dirname, "data", "doc-match-sample.md");

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** 배열에서 n개를 고르게(처음·중간·끝에 몰리지 않게) 뽑는다 */
function evenly<T>(xs: readonly T[], n: number): T[] {
  if (xs.length <= n) return [...xs];
  return Array.from({ length: n }, (_, i) => xs[Math.floor((i * xs.length) / n)]);
}

async function sample(base: string, n: number): Promise<void> {
  const [news, docsRes] = await Promise.all([
    json<{ verified: Array<{ title: string; link: string; pubDate: string; source: string }> }>(`${base}/api/news-stream?lang=en`),
    json<{ docs: Array<Record<string, unknown>> }>(`${base}/api/official-docs?days=60`),
  ]);
  const docs: PolledDoc[] = docsRes.docs.map((d) => ({
    id: String(d.id), issuerId: String(d.issuerId ?? d.issuer_id), kind: String(d.kind), weight: String(d.weight), title: String(d.title),
    url: String(d.url), publishedAt: (d.publishedAt ?? d.published_at ?? null) as string | null, summary: String(d.summary ?? ""),
    tags: String(d.tags ?? ""), feed: String(d.feed ?? ""), agency: String(d.agency ?? ""),
  }));
  const flashes = evenly(news.verified.filter((x) => Number.isFinite(Date.parse(x.pubDate))), n);
  const lines: string[] = [`# 속보-문서 매칭 표본 (${new Date().toISOString().slice(0, 16)}Z · 수집 문서 ${docs.length}건)`, ""];
  const missed: string[] = [];
  let withMatch = 0;
  flashes.forEach((f, i) => {
    const matches = polledDocsForFlash(f.title, Date.parse(f.pubDate), docs);
    if (matches.length === 0) {
      missed.push(`- [ ] 붙었어야 함 · ${f.title} (${f.source}, ${f.pubDate.slice(0, 10)})`);
      return;
    }
    withMatch += 1;
    lines.push(`## ${i + 1}. ${f.title}`, `${f.source} · ${f.pubDate.slice(0, 16)}`, "");
    for (const m of matches) {
      const why = [...m.reasons.places.map((p) => `지명:${p}`), ...m.reasons.topics.map((t) => `주제:${t}`), ...m.reasons.terms.map((t) => `단어:${t}`), m.reasons.actor ? "당사자" : ""].filter(Boolean).join(", ");
      lines.push(`- [ ] 맞음  [ ] 틀림 · (${m.score}점: ${why}) ${m.doc.issuerId} · ${m.doc.publishedAt} · ${m.doc.title}  ${m.doc.url}`);
    }
    lines.push("");
  });
  lines.push("## 문서가 하나도 안 붙은 속보 (붙었어야 하는 것이 있으면 표시)", "", ...missed, "");
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, lines.join("\n"), "utf8");
  console.log(`표본 ${flashes.length}건 중 문서가 붙은 속보 ${withMatch}건 · 안 붙은 속보 ${missed.length}건`);
  console.log(`채점 파일: ${path.relative(path.join(__dirname, ".."), FILE)}`);
  console.log("각 줄에 x 표시 후: npm run docs:sample -- --score");
}

function score(): void {
  const text = fs.readFileSync(FILE, "utf8");
  const right = (text.match(/^- \[x\] 맞음/gim) ?? []).length;
  const wrong = (text.match(/^- \[ \] 맞음\s+\[x\] 틀림/gim) ?? []).length;
  const shouldHave = (text.match(/^- \[x\] 붙었어야 함/gim) ?? []).length;
  const unmarkedMissed = (text.match(/^- \[ \] 붙었어야 함/gim) ?? []).length;
  const graded = right + wrong;
  console.log(`붙은 문서 채점 ${graded}건: 맞음 ${right} · 틀림 ${wrong}${graded ? ` → 정밀도 ${((right / graded) * 100).toFixed(0)}%` : ""}`);
  const missedTotal = shouldHave + unmarkedMissed;
  console.log(`안 붙은 속보 ${missedTotal}건 중 붙었어야 함 ${shouldHave}건${missedTotal ? ` (놓침 ${((shouldHave / missedTotal) * 100).toFixed(0)}%)` : ""}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--score")) return score();
  const base = (args.find((a) => a.startsWith("http")) ?? "https://straitdesk.app").replace(/\/$/, "");
  const n = Number(args.find((a) => /^\d+$/.test(a))) || 30;
  await sample(base, n);
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exitCode = 1;
});
