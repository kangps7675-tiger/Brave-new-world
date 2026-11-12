/**
 * 배포된 사이트의 /api/official-docs?status=1 을 읽어 문제 있는 수집원만 보여 준다.
 *
 *   npm run docs:health                         # 기본: https://straitdesk.app
 *   npm run docs:health -- https://내-주소       # 다른 주소
 *
 * 문제는 네 가지로 나뉜다: failed(서버에서 막혔거나 구조가 바뀌어 0건) · empty(수집은 됐는데 저장된 문서 0건) ·
 * quiet(30일 넘게 새 문서 없음) · unchecked(아직 수집 기록 없음). 정상인 곳은 개수만 센다.
 */
const base = (process.argv[2] ?? "https://straitdesk.app").replace(/\/$/, "");

type Row = { feed: string; health: string; reason: string; error: string | null; stored: number; newestPublishedAt: string | null };

async function main(): Promise<void> {
  const res = await fetch(`${base}/api/official-docs?status=1`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { feeds: Row[]; counts: Record<string, number> };
  const bad = data.feeds.filter((f) => f.health !== "ok");
  console.log(`수집원 ${data.feeds.length}곳 · ${Object.entries(data.counts).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  for (const f of bad) {
    console.log(`\n✗ [${f.health}] ${f.feed}`);
    console.log(`    ${f.reason}${f.error ? ` — ${f.error}` : ""}`);
    console.log(`    저장 ${f.stored}건 · 가장 최근 ${f.newestPublishedAt ?? "-"}`);
  }
  if (bad.length === 0) console.log("모두 정상");
  process.exitCode = bad.some((f) => f.health === "failed" || f.health === "empty") ? 1 : 0;
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exitCode = 1;
});
