/**
 * 공식 문서(팩트시트·공동성명·발표문) 후보 수집 + 원문 스냅샷 + 승인.
 * 이 샌드박스는 외교부·크렘린 등에 접속이 안 되므로 필성의 컴퓨터(또는 GitHub Actions)에서 돌린다.
 *
 *   npx tsx scripts/fetch-official-docs.ts                  # 피드에서 후보 수집 → scripts/data/official-docs-candidates.json
 *   npx tsx scripts/fetch-official-docs.ts --all            # 연설·일반 보도자료까지 포함
 *   npx tsx scripts/fetch-official-docs.ts --discover <정부 사이트 주소>     # 그 사이트의 RSS·Atom 피드를 찾아 준다(전 세계 어느 정부든)
 *   npx tsx scripts/fetch-official-docs.ts --add-feed <피드 주소> --label "이름" [--issuer kr]   # 수집 대상에 추가(src/data/officialFeeds.json)
 *   npx tsx scripts/fetch-official-docs.ts --snapshot <url> [--issuer us,ru] [--kind factsheet] [--tags hormuz,gaza] [--keywords "new start"]
 *     (--issuer를 생략하면 정부 도메인(gov.uk, go.kr, gouv.fr, kremlin.ru, nato.int…)으로 알아본다)
 *   npx tsx scripts/fetch-official-docs.ts --snapshot <url> --text-file 문서.txt --issuer us   # PDF 등: 텍스트를 직접 넣을 때
 *   npx tsx scripts/fetch-official-docs.ts --approve scripts/data/official-doc-draft-<id>.json
 *
 * 흐름: 후보(기계) → 스냅샷 초안(기계) → 필성이 JSON의 publishedAt·terms·relatedTags를 확인해 고침 → --approve.
 * 승인된 것만 src/data/officialDocs.index.json과 public/official-docs/<id>.txt에 들어간다.
 * 날짜·이용 조건을 기계가 지어내지 않는다: 못 찾으면 비워 두고, 비어 있으면 승인이 거절된다.
 */
import fs from "node:fs";
import path from "node:path";
import { ISSUERS, OFFICIAL_DOCS, isValidIssuerId, type DocKind, type IssuerId, type OfficialDocMeta } from "../src/data/officialDocs";
import { getPage } from "../src/lib/officialDocs/http";
import { discoverFeeds, officialSiteFromUrl } from "../src/lib/officialSites";
import { issuerNameKo } from "../src/lib/countryName";
import { classifyDocKind, weightOf } from "../src/lib/officialDocs/classify";
import { htmlToText, pickDate, pickImage, pickTitle, sha256Hex } from "../src/lib/officialDocs/extract";
import { worthKeeping, type DocCandidate } from "../src/lib/officialDocs/feed";
import { parseListPage } from "../src/lib/officialDocs/listPages";
import { candidatesOfBody } from "../src/lib/officialDocs/ingestRows";
import { validateDocMeta } from "../src/lib/officialDocs/validate";

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "scripts", "data");
const INDEX = path.join(ROOT, "src", "data", "officialDocs.index.json");
const FEEDS = path.join(ROOT, "src", "data", "officialFeeds.json");
const LIST_PAGES = path.join(ROOT, "src", "data", "officialListPages.json");
type ExtraFeed = { issuerId: IssuerId; url: string; label: string; format?: "federal-register" };
const readExtraFeeds = (): ExtraFeed[] => JSON.parse(fs.readFileSync(FEEDS, "utf8")) as ExtraFeed[];
const TEXT_DIR = path.join(ROOT, "public", "official-docs");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const today = () => new Date().toISOString().slice(0, 10);

async function get(url: string): Promise<{ body: string; type: string }> {
  const { body, type } = await getPage(url);
  return { body, type };
}

async function collect(): Promise<void> {
  const known = new Set(OFFICIAL_DOCS.map((doc) => doc.sourceUrl));
  const all: DocCandidate[] = [];
  const feeds: Array<{ issuerId: IssuerId; name: string; url: string; label: string; verified: boolean; format?: "federal-register" }> = [];
  for (const issuer of ISSUERS) {
    if (issuer.feeds.length === 0) console.log(`- ${issuer.nameKo}: 내장 피드 없음`);
    for (const feed of issuer.feeds) if (feed.url) feeds.push({ issuerId: issuer.id, name: issuer.nameKo, url: feed.url, label: feed.label, verified: feed.verified });
  }
  for (const extra of readExtraFeeds()) feeds.push({ issuerId: extra.issuerId, name: issuerNameKo(extra.issuerId), url: extra.url, label: extra.label, verified: true, format: extra.format });
  for (const feed of feeds) {
    try {
      const { body } = await get(feed.url);
      const rows = candidatesOfBody(body, { issuerId: feed.issuerId, url: feed.url, label: feed.label, format: feed.format });
      console.log(`✓ ${feed.name} · ${feed.label}: ${rows.length}건${feed.verified ? "" : " (주소 미확인이었음)"}`);
      all.push(...rows);
    } catch (error) {
      console.log(`✗ ${feed.name} · ${feed.label}: ${(error as Error).message}${feed.verified ? "" : " (주소 미확인 — 주소가 틀렸을 수 있다)"}`);
    }
  }
  // RSS가 없는 사이트는 목록 페이지를 직접 읽는다(src/lib/officialDocs/listPages.ts)
  const pages = JSON.parse(fs.readFileSync(LIST_PAGES, "utf8")) as Array<{ issuerId: IssuerId; url: string; label: string }>;
  for (const page of pages) {
    try {
      const { body } = await get(page.url);
      const rows = parseListPage(body, page.url, page.issuerId);
      console.log(rows.length > 0 ? `✓ ${issuerNameKo(page.issuerId)} · ${page.label}: ${rows.length}건 (목록 페이지)` : `✗ ${issuerNameKo(page.issuerId)} · ${page.label}: 0건 — 페이지 구조가 바뀌었을 수 있다`);
      all.push(...rows);
    } catch (error) {
      console.log(`✗ ${issuerNameKo(page.issuerId)} · ${page.label}: ${(error as Error).message}`);
    }
  }
  const keepAll = flag("all");
  const seen = new Set<string>();
  const out = all
    .filter((row) => (keepAll || worthKeeping(row)) && !known.has(row.url) && !seen.has(row.url) && seen.add(row.url))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, "official-docs-candidates.json");
  fs.writeFileSync(file, JSON.stringify({ fetchedAt: new Date().toISOString(), candidates: out }, null, 2), "utf8");
  console.log(`\n후보 ${out.length}건 → ${path.relative(ROOT, file)}`);
}

async function snapshot(url: string): Promise<void> {
  const inferred = officialSiteFromUrl(url)?.issuerId;
  const issuerIds = (arg("issuer") ?? inferred ?? "").split(",").filter(Boolean) as IssuerId[];
  const bad = issuerIds.filter((id) => !isValidIssuerId(id));
  if (issuerIds.length === 0 || bad.length > 0) {
    throw new Error("정부 도메인으로 낸 곳을 못 알아냈다. --issuer us 처럼 직접 적어라(나라는 ISO 2글자 소문자, 기구는 nato·eu·un·iaea).");
  }
  if (!arg("issuer")) console.log(`낸 곳: 주소로 ${issuerNameKo(issuerIds[0])}(으)로 알아봤다`);

  let text: string;
  let title: string | null = null;
  let publishedAt: string | null = null;
  let imageUrl: string | null = null;
  const textFile = arg("text-file");
  if (textFile) {
    text = fs.readFileSync(textFile, "utf8").trim();
  } else {
    const { body, type } = await get(url);
    if (/pdf/i.test(type) || url.toLowerCase().endsWith(".pdf")) {
      throw new Error("PDF는 자동으로 못 읽는다. 텍스트를 따로 저장해 --text-file로 넣어라.");
    }
    text = htmlToText(body);
    title = pickTitle(body);
    publishedAt = pickDate(body);
    imageUrl = pickImage(body);
  }
  if (text.length < 200) throw new Error(`본문이 너무 짧다(${text.length}자). 페이지 구조가 달라 못 뽑았을 수 있다. --text-file을 써라.`);

  const kind = (arg("kind") as DocKind | undefined) ?? classifyDocKind(title ?? arg("title") ?? "");
  const finalTitle = arg("title") ?? title ?? "";
  const hash = sha256Hex(text);
  const id = arg("id") ?? `${issuerIds.join("-")}-${(publishedAt ?? today()).replace(/-/g, "")}-${hash.slice(0, 6)}`;
  const draft: Partial<OfficialDocMeta> & { text: string } = {
    id,
    issuerIds,
    kind,
    weight: weightOf(kind),
    title: finalTitle,
    publishedAt: arg("date") ?? publishedAt ?? "",
    sourceUrl: url,
    fetchedAt: today(),
    sha256: hash,
    language: arg("lang") ?? "en",
    ...(imageUrl ? { imageUrl } : {}),
    keywords: (arg("keywords") ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean),
    relatedTags: (arg("tags") ?? "").split(",").filter(Boolean),
    terms: arg("terms") ?? "",
    text,
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `official-doc-draft-${id}.json`);
  fs.writeFileSync(file, JSON.stringify(draft, null, 2), "utf8");
  const missing = validateDocMeta(draft);
  console.log(`초안 → ${path.relative(ROOT, file)} (본문 ${text.length}자)`);
  if (missing.length > 0) console.log(`승인 전에 채울 것:\n- ${missing.join("\n- ")}`);
}

function approve(file: string): void {
  const draft = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<OfficialDocMeta> & { text?: string };
  const problems = validateDocMeta(draft);
  if (!draft.text || draft.text.length < 200) problems.push("본문(text)이 비었다");
  if (draft.text && draft.sha256 && sha256Hex(draft.text) !== draft.sha256) problems.push("본문을 고쳤다: sha256이 원문과 맞지 않는다(원문 스냅샷은 고치지 않는다)");
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8")) as OfficialDocMeta[];
  if (index.some((row) => row.id === draft.id)) problems.push("같은 id가 이미 있다");
  if (index.some((row) => row.sourceUrl === draft.sourceUrl)) problems.push("같은 주소가 이미 있다");
  if (problems.length > 0) {
    console.log(`승인 거절:\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  const { text, ...meta } = draft as OfficialDocMeta & { text: string };
  fs.mkdirSync(TEXT_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEXT_DIR, `${meta.id}.txt`), `${text}\n`, "utf8");
  index.push(meta);
  index.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  fs.writeFileSync(INDEX, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`승인: ${meta.id} → 목록과 public/official-docs/${meta.id}.txt에 넣었다`);
}

async function discover(url: string): Promise<void> {
  const { body } = await get(url);
  const found = discoverFeeds(body, url);
  if (found.length === 0) {
    console.log("이 페이지에서 RSS·Atom 링크를 못 찾았다. 사이트의 '구독/RSS' 안내 페이지 주소로 다시 해 봐라.");
    return;
  }
  const issuer = officialSiteFromUrl(url)?.issuerId;
  for (const row of found) console.log(`- ${row.title || "(제목 없음)"}\n  ${row.url}`);
  console.log(`\n추가하려면: npm run docs:fetch -- --add-feed <위 주소> --issuer ${issuer ?? "xx"} --label "이름"`);
}

function addFeed(url: string): void {
  const issuerId = (arg("issuer") ?? officialSiteFromUrl(url)?.issuerId ?? "") as IssuerId;
  const label = arg("label") ?? "";
  if (!isValidIssuerId(issuerId) || !/^https:\/\//.test(url) || !label) {
    console.log("--issuer(나라 2글자 또는 기구), https 주소, --label이 모두 필요하다.");
    process.exitCode = 1;
    return;
  }
  const feeds = readExtraFeeds();
  if (feeds.some((row) => row.url === url)) {
    console.log("이미 있는 주소다.");
    return;
  }
  feeds.push({ issuerId, url, label });
  fs.writeFileSync(FEEDS, `${JSON.stringify(feeds, null, 2)}\n`, "utf8");
  console.log(`피드 추가: ${issuerNameKo(issuerId)} · ${label}`);
}

async function main(): Promise<void> {
  const disc = arg("discover");
  const addUrl = arg("add-feed");
  if (disc) return discover(disc);
  if (addUrl) return addFeed(addUrl);
  const snap = arg("snapshot");
  const app = arg("approve");
  if (app) return approve(app);
  if (snap) return snapshot(snap);
  return collect();
}

main().catch((error) => {
  console.error(`실패: ${(error as Error).message}`);
  process.exitCode = 1;
});
