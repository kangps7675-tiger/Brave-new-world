/**
 * RSS가 없는 정부 사이트의 "목록 페이지"를 그대로 저장한다. 정부 사이트에 접속되는 컴퓨터에서 돌린다.
 *
 *   npm run docs:grab                     # 기본 목록(나토 공식 문서, 한국·인도·중국·대만·이란·프랑스·호주·일본 등)
 *   npm run docs:grab -- <주소> <주소>     # 주소 직접 지정
 *
 * 저장 위치: scripts/data/grab/<호스트-경로>.html, 결과 요약은 scripts/data/grab/_report.json (저장소에 올리지 않음).
 * 저장된 HTML을 보고 사이트별 목록 읽기 코드를 짠다. 실제 구조를 모르고 짜면 틀리기 때문이다.
 */
import fs from "node:fs";
import path from "node:path";
import { getPage } from "../src/lib/officialDocs/http";

const DEFAULTS = [
  "https://www.nato.int/cps/en/natohq/official_texts.htm",
  "https://www.nato.int/cps/en/natohq/news.htm",
  "https://www.mofa.go.kr/eng/brd/m_5676/list.do",
  "https://www.mea.gov.in/press-releases.htm",
  "https://www.mfa.gov.cn/eng/xw/fyrbt/lxjzh/",
  "https://www.fmprc.gov.cn/mfa_eng/xw/fyrbt/lxjzh/",
  "https://en.mofa.gov.tw/",
  "https://en.mfa.gov.ir/portal/home",
  "https://www.diplomatie.gouv.fr/en/press/news",
  "https://www.dfat.gov.au/news/media",
  "https://www.mofa.go.jp/press/release/index.html",
  "https://japan.kantei.go.jp/",
  "https://mfa.gov.ua/en/news",
  "https://www.mid.ru/en/press_service/",
];

const slug = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

async function main(): Promise<void> {
  const urls = process.argv.slice(2).filter((a) => a.startsWith("http"));
  const list = urls.length > 0 ? urls : DEFAULTS;
  const dir = path.join(__dirname, "data", "grab");
  fs.mkdirSync(dir, { recursive: true });
  const report: Array<{ url: string; ok: boolean; bytes?: number; finalUrl?: string; type?: string; error?: string }> = [];
  for (const url of list) {
    try {
      const page = await getPage(url);
      fs.writeFileSync(path.join(dir, `${slug(url)}.html`), page.body, "utf8");
      report.push({ url, ok: true, bytes: page.body.length, finalUrl: page.finalUrl, type: page.type });
      console.log(`✓ ${url} (${page.body.length}자)${page.finalUrl !== url ? ` → ${page.finalUrl}` : ""}`);
    } catch (error) {
      report.push({ url, ok: false, error: (error as Error).message });
      console.log(`✗ ${url}: ${(error as Error).message}`);
    }
  }
  fs.writeFileSync(path.join(dir, "_report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`\n저장: scripts/data/grab (${report.filter((r) => r.ok).length}/${report.length})`);
}

main().catch((error) => {
  console.error(`실패: ${(error as Error).message}`);
  process.exitCode = 1;
});
