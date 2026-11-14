/**
 * 공식 문서 수집이 실제로 되는지·얼마나 맞는지 한 번에 점검한다. 정부 사이트에 접속되는 컴퓨터에서 돌린다.
 *
 *   npm run docs:check                       # 기본 대상(주요국 외교부·정부 포털)
 *   npm run docs:check -- https://www.state.gov https://www.gov.uk   # 대상 직접 지정
 *   npm run docs:check -- --deep             # 피드마다 첫 2건의 본문까지 뽑아 본다
 *
 * 하는 일: 사이트 첫 페이지에서 RSS·Atom 피드를 찾고(discover) → 피드를 읽어 항목을 파싱하고 →
 * (--deep이면) 항목 본문을 뽑아 제목·날짜·본문 길이를 점검한다. 결과는 콘솔과
 * scripts/data/official-docs-check-report.json(저장소에 올리지 않음)에 남는다.
 *
 * "정확도"는 정답표가 없어서 두 층으로 본다.
 *   1) 자동 건전성 지표: 피드 도달 여부, 항목 수, 날짜 파싱률, https 링크 비율, 종류 분포, 본문 길이, 잡음 의심.
 *   2) 표본 눈검사: 항목 제목과 짐작한 종류(kind)를 함께 찍는다. 틀린 것을 표시해 주면 분류 규칙을 고친다.
 */
import fs from "node:fs";
import path from "node:path";
import { issuerNameKo } from "../src/lib/countryName";
import { classifyDocKind } from "../src/lib/officialDocs/classify";
import { htmlToText, pickDate, pickTitle } from "../src/lib/officialDocs/extract";
import { parseOfficialFeed } from "../src/lib/officialDocs/feed";
import { getPage } from "../src/lib/officialDocs/http";
import { COMMON_FEED_PATHS, FEED_CANDIDATES, discoverFeeds, officialSiteFromUrl } from "../src/lib/officialSites";

const DEFAULT_TARGETS = [
  "https://www.state.gov",
  "https://www.whitehouse.gov",
  "https://www.gov.uk",
  "https://www.nato.int",
  "https://www.consilium.europa.eu",
  "https://en.kremlin.ru",
  "https://www.mid.ru/en/",
  "https://www.mfa.gov.cn/eng/",
  "https://www.mofa.go.jp/",
  "https://www.mofa.go.kr/eng/",
  "https://en.mofa.gov.tw/",
  "https://mea.gov.in/",
  "https://mfa.gov.ua/en",
  "https://www.mfa.gov.tr/",
  "https://en.mfa.gov.ir/",
  "https://www.dfat.gov.au/",
  "https://www.diplomatie.gouv.fr/en/",
  "https://www.auswaertiges-amt.de/en",
  "https://www.esteri.it/en/",
  // 외교부 말고도 1차 원문이 나오는 곳: 국방부·총리실·장관 사이트
  "https://www.defense.gov",
  "https://www.foreignminister.gov.au/",
  "https://japan.kantei.go.jp/",
  // 지정학 플레이어국 추가(2026-11-12)
  "https://www.gov.il/en",
  "https://www.korea.kr",
  "https://pib.gov.in",
  "https://www.president.gov.ua/en",
  "https://www.elysee.fr/en",
  "https://www.bundesregierung.de/breg-en",
  "https://www.europarl.europa.eu",
  "https://www.eeas.europa.eu",
  "https://www.un.org/en",
  "https://www.iaea.org",
  "https://www.mofa.gov.sa/en",
  "https://www.gov.pl/web/diplomacy",
  "https://mofa.gov.pk",
  "https://www.mod.go.jp/en/",
  "https://president.ir/en",
  "https://www.mid.ru/en/rss.php",
  "https://en.mfa.ir/portal/newsarchive/699",
  "https://www.mofa.go.jp/press/release/index.html",
];

const BOILERPLATE = /(enable javascript|cookies? (policy|settings|consent)|access denied|just a moment|captcha|403 forbidden|404 not found)/i;

async function get(url: string): Promise<string> {
  return (await getPage(url)).body;
}

type FeedReport = {
  url: string;
  ok: boolean;
  error?: string;
  items: number;
  dateRate: number;
  httpsRate: number;
  kinds: Record<string, number>;
  sample: Array<{ title: string; kind: string; date: string | null; url: string }>;
  deep?: Array<{ url: string; titleFound: boolean; dateFound: boolean; textChars: number; boilerplate: boolean; head: string; error?: string }>;
};
type SiteReport = { target: string; issuer: string | null; reachable: boolean; error?: string; feedsFound: number; feeds: FeedReport[]; via?: string; failedCandidates?: string[] };

async function checkFeed(url: string, issuer: string, deep: boolean): Promise<FeedReport> {
  try {
    const rows = parseOfficialFeed(await get(url), issuer);
    const kinds: Record<string, number> = {};
    for (const row of rows) kinds[row.kind] = (kinds[row.kind] ?? 0) + 1;
    const report: FeedReport = {
      url,
      ok: rows.length > 0,
      items: rows.length,
      dateRate: rows.length ? rows.filter((r) => r.publishedAt).length / rows.length : 0,
      httpsRate: rows.length ? rows.filter((r) => r.url.startsWith("https://")).length / rows.length : 0,
      kinds,
      sample: rows.slice(0, 8).map((r) => ({ title: r.title, kind: classifyDocKind(r.title), date: r.publishedAt, url: r.url })),
    };
    if (rows.length === 0) report.error = "항목 0건(형식이 다르거나 막힘)";
    if (deep && rows.length > 0) {
      report.deep = [];
      for (const row of rows.slice(0, 2)) {
        try {
          const html = await get(row.url);
          const text = htmlToText(html);
          report.deep.push({
            url: row.url,
            titleFound: Boolean(pickTitle(html)),
            dateFound: Boolean(pickDate(html)),
            textChars: text.length,
            boilerplate: BOILERPLATE.test(text.slice(0, 600)),
            head: text.slice(0, 160).replace(/\n/g, " ⏎ "),
          });
        } catch (error) {
          report.deep.push({ url: row.url, titleFound: false, dateFound: false, textChars: 0, boilerplate: false, head: "", error: (error as Error).message });
        }
      }
    }
    return report;
  } catch (error) {
    return { url, ok: false, error: (error as Error).message, items: 0, dateRate: 0, httpsRate: 0, kinds: {}, sample: [] };
  }
}

async function checkSite(target: string, deep: boolean): Promise<SiteReport> {
  const issuer = officialSiteFromUrl(target)?.issuerId ?? null;
  let urls: string[] = [];
  let error: string | undefined;
  let reachable = true;
  try {
    urls = discoverFeeds(await get(target), target).map((f) => f.url);
  } catch (e) {
    reachable = false;
    error = (e as Error).message;
  }
  const reports: FeedReport[] = [];
  for (const url of urls.slice(0, 3)) reports.push(await checkFeed(url, issuer ?? "xx", deep));
  // 발견된 피드가 없거나 전부 못 읽을 때: 알려진 후보와 흔한 경로를 두드려 본다(접속이 안 되는 사이트도 후보 피드는 따로 열릴 수 있다).
  let via = "발견";
  const failedCandidates: string[] = [];
  if (!reports.some((r) => r.ok)) {
    const tried = new Set(urls);
    const guesses = [...(FEED_CANDIDATES[target] ?? []), ...(reachable ? COMMON_FEED_PATHS.map((p) => new URL(p, target).toString()) : [])].filter((u) => !tried.has(u));
    for (const url of guesses) {
      const r = await checkFeed(url, issuer ?? "xx", deep);
      if (r.ok) {
        reports.push(r);
        via = "후보·흔한 경로";
        if (reports.filter((x) => x.ok).length >= 3) break;
      } else if ((FEED_CANDIDATES[target] ?? []).includes(url)) {
        failedCandidates.push(`${url} — ${r.error ?? "읽지 못함"}`);
      }
    }
  }
  const found = reports.filter((r) => r.ok).length;
  return { target, issuer, reachable: reachable || found > 0, error, feedsFound: found, feeds: reports.filter((r) => r.ok || found === 0), via: found > 0 ? via : "-", failedCandidates };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const deep = args.includes("--deep");
  const targets = args.filter((a) => a.startsWith("http"));
  const list = targets.length > 0 ? targets : DEFAULT_TARGETS;
  const reports: SiteReport[] = [];
  for (const target of list) {
    const r = await checkSite(target, deep);
    reports.push(r);
    const who = r.issuer ? issuerNameKo(r.issuer) : "알 수 없음";
    if (!r.reachable) {
      console.log(`✗ ${who} ${target}: 접속 실패 (${r.error})`);
      for (const line of r.failedCandidates ?? []) console.log(`    후보 실패: ${line}`);
      continue;
    }
    if (r.error) console.log(`  (첫 페이지는 안 열렸지만 피드 주소로는 읽힘: ${r.error})`);
    console.log(`${r.feedsFound > 0 ? "✓" : "–"} ${who} ${target}: 피드 ${r.feedsFound}개 (${r.via})`);
    for (const line of r.failedCandidates ?? []) console.log(`    후보 실패: ${line}`);
    for (const f of r.feeds) {
      console.log(
        `    ${f.ok ? "·" : "✗"} ${f.url}  항목 ${f.items} · 날짜 ${(f.dateRate * 100).toFixed(0)}% · https ${(f.httpsRate * 100).toFixed(0)}% · 종류 ${JSON.stringify(f.kinds)}${f.error ? ` · ${f.error}` : ""}`,
      );
      for (const s of f.sample.slice(0, 5)) console.log(`        [${s.kind}] ${s.date ?? "날짜?"} ${s.title}`);
      for (const d of f.deep ?? []) {
        console.log(`        본문 ${d.textChars}자 제목${d.titleFound ? "O" : "X"} 날짜${d.dateFound ? "O" : "X"}${d.boilerplate ? " ⚠잡음의심" : ""}${d.error ? ` ✗${d.error}` : ""}  ${d.head}`);
      }
      if (f.ok) console.log(`        추가: npm run docs:fetch -- --add-feed ${f.url} --issuer ${r.issuer ?? "xx"} --label "${who} 공식"`);
    }
  }
  const ok = reports.filter((r) => r.reachable).length;
  const withFeed = reports.filter((r) => r.feeds.some((f) => f.ok)).length;
  console.log(`\n요약: 접속 ${ok}/${reports.length} · 쓸 만한 피드가 있는 곳 ${withFeed}/${reports.length}`);
  const dir = path.join(__dirname, "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "official-docs-check-report.json");
  fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), reports }, null, 2), "utf8");
  console.log(`보고서: ${path.relative(path.join(__dirname, ".."), file)}`);
}

main().catch((error) => {
  console.error(`실패: ${(error as Error).message}`);
  process.exitCode = 1;
});
