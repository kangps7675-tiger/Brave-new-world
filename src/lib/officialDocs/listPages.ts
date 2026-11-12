import { decodeHtmlEntities } from "@/lib/htmlEntities";
import type { DocKind, IssuerId } from "@/data/officialDocs";
import { classifyDocKind, weightOf } from "@/lib/officialDocs/classify";
import type { DocCandidate } from "@/lib/officialDocs/feed";

/**
 * RSS가 없는 사이트의 "목록 페이지"를 읽는다. 사이트마다 HTML이 달라서 호스트별로 따로 짠 읽기 함수를 쓴다.
 * 2026-11-12 `npm run docs:grab`으로 저장한 실제 페이지 구조를 기준으로 했다. 구조가 바뀌면 0건이 나오니,
 * 수집이 조용히 멈추지 않게 호출한 쪽이 0건을 실패로 기록한다.
 *
 * 읽지 못하는 곳: 인도 MEA(목록이 자바스크립트로 뜬다), 중국(대변인 브리핑만 있다). 러시아 외교부는 Atom 피드가 있어 officialFeeds.json에 있다.
 */

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function clean(raw: string): string {
  return decodeHtmlEntities(raw.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function pad(n: string | number): string {
  return String(n).padStart(2, "0");
}

function absolute(href: string, pageUrl: string): string | null {
  try {
    const url = new URL(decodeHtmlEntities(href), pageUrl);
    return /^https?:$/.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function candidate(issuerId: IssuerId, title: string, url: string, publishedAt: string | null, fallbackKind?: DocKind): DocCandidate {
  let kind = classifyDocKind(title);
  if (fallbackKind && kind === "press-release") kind = fallbackKind;
  return { issuerId, title, url, publishedAt, kind, weight: weightOf(kind), summary: "" };
}

/** 링크 하나를 감싼 `<a …>…</a>` 안에서만 찾는다(다음 링크로 넘어가 엉뚱한 제목을 집지 않게). */
const INSIDE_A = String.raw`(?:(?!<\/a>)[\s\S])*?`;

/** 나토 공식 문서 목록: 주소에 날짜가 들어 있다(/official-texts/2026/07/08/slug). 나토 공식 문서 자체가 합의·결정문이라 일반 제목도 성명으로 둔다. */
function natoOfficialTexts(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const re = new RegExp(
    String.raw`<a\s+href="([^"]*\/official-texts\/(\d{4})\/(\d{2})\/(\d{2})\/[^"]+)"[^>]*>${INSIDE_A}<h3[^>]*>([\s\S]*?)<\/h3>`,
    "gi",
  );
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(re)) {
    const url = absolute(m[1], pageUrl);
    const title = clean(m[5]);
    if (url && title) out.push(candidate(issuerId, title, url, `${m[2]}-${m[3]}-${m[4]}`, "statement"));
  }
  return out;
}

/** 대만 외교부 첫 화면: 제목은 title 속성, 날짜는 <i class="mark">2026/11<b>6</b></i>. 같은 기사가 두 분류에 걸려 s=번호로 합친다. */
function taiwanMofa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const re = /<a\s+href="(News_Content\.aspx\?[^"]*?\bs=(\d+)[^"]*)"\s+title="([^"]*)"[^>]*>(?:\s*<i class="mark">(\d{4})\/(\d{1,2})<b>(\d{1,2})<\/b><\/i>)?/gi;
  const seen = new Set<string>();
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(re)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    const url = absolute(m[1], pageUrl);
    const title = clean(m[3]);
    const date = m[4] ? `${m[4]}-${pad(m[5])}-${pad(m[6])}` : null;
    if (url && title) out.push(candidate(issuerId, title, url, date));
  }
  return out;
}

/** 프랑스 외교부 소식 목록: 카드마다 제목 링크와 "November 11th 2026" 날짜. 제목이 …로 잘려 있으면 그대로 둔다. */
function franceDiplomatie(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const card of html.split(/<article\b/i).slice(1)) {
    const link = card.match(/<a\s+href="([^"]+)"[^>]*class="fr-card__link"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const url = absolute(link[1], pageUrl);
    const title = clean(link[2]);
    const d = card.match(/fr-card__detail">\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})\s*</i);
    const month = d ? MONTHS[d[1].toLowerCase()] : undefined;
    const date = d && month ? `${d[3]}-${month}-${pad(d[2])}` : null;
    if (url && title) out.push(candidate(issuerId, title, url, date));
  }
  return out;
}

/**
 * 한국 외교부 영문 보도자료 게시판: 행마다 f_view('글번호') 링크와 작성일.
 * 상세 주소는 게시판 규칙(view.do?seq=)으로 만든 것이라, 스냅샷에서 열리지 않으면 이 줄을 의심한다.
 */
function koreaMofa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const row of html.split(/<tr\b/i).slice(1)) {
    const link = row.match(/f_view\('(\d+)'\)[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const date = row.match(/<td><div>\s*(\d{4}-\d{2}-\d{2})\s*<\/div><\/td>/i)?.[1] ?? null;
    const url = absolute(`/eng/brd/m_5676/view.do?seq=${link[1]}`, pageUrl);
    const title = clean(link[2]);
    if (url && title) out.push(candidate(issuerId, title, url, date));
  }
  return out;
}

/**
 * 한국 외교부 국문 보도자료 목록(/www/brd/m_4080/list.do): `<tr>`마다 `f_view('seq')` 링크와 `<span class="date"> 2026-11-12</span>`.
 * 2026-11-12 실제 페이지에서 확인. 상세 주소는 게시판 규칙(view.do?seq=)으로 만든다.
 */
function koreaMofaKo(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const row of html.split(/<tr\b/i).slice(1)) {
    const link = row.match(/f_view\('(\d+)'\)[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const date = row.match(/<span class="date">\s*(\d{4}-\d{2}-\d{2})\s*<\/span>/i)?.[1] ?? null;
    const url = absolute(`/www/brd/m_4080/view.do?seq=${link[1]}`, pageUrl);
    const title = clean(link[2]).replace(/^NEW\s+/, "");
    if (url && title) out.push(candidate(issuerId, title, url, date));
  }
  return out;
}

/** 국방부 보도자료 목록(/mnd/167/subview.do): `td-title`의 `/bbs/mnd/13000005/…/artclView.do` 링크와 `td-date` "2026.11.12". 2026-11-12 실제 페이지 확인 */
function koreaMnd(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const row of html.split(/<tr\b/i).slice(1)) {
    const link = row.match(/<a\s+href="(\/bbs\/mnd\/\d+\/[^"]+\/artclView\.do)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const d = row.match(/class="td-date">\s*(\d{4})\.(\d{2})\.(\d{2})\s*</i);
    const url = absolute(link[1], pageUrl);
    const title = clean(link[2]).replace(/\s*새글\s*$/, "");
    if (url && title) out.push(candidate(issuerId, title, url, d ? `${d[1]}-${d[2]}-${d[3]}` : null));
  }
  return out;
}

/**
 * 대만 국방부 영문 목록(보도자료 /en/news/PressReleaseList, 중국 군 활동 /en/news/PlaactList): `<a href="/en/News/PLAAct/88203" class="news_list">` 안에
 * `<div class="date …">2026.11.12</div>`와 `<h2 class="title …">…</h2>`(2026-11-12 실제 페이지 확인).
 * 중국 군 활동 발표는 제목이 매일 같아서 날짜를 붙여 구분한다.
 */
function taiwanMnd(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<a\s+href="(\/en\/News\/(?:PLAAct|PressRelease)\/\d+)"[^>]*class="news_list"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const d = m[2].match(/(\d{4})\.(\d{2})\.(\d{2})/);
    const t = m[2].match(/<h2[^>]*class="title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
    const url = absolute(m[1], pageUrl);
    if (!url || !t) continue;
    const date = d ? `${d[1]}-${d[2]}-${d[3]}` : null;
    let title = clean(t[1]);
    if (/PLAAct/i.test(m[1]) && date) title = `${title} (${date})`;
    out.push(candidate(issuerId, title, url, date));
  }
  return out;
}

/** 일본 총리관저 영문 첫 화면: /statement/·/speech/ 글만. 날짜는 주소(202611/1111statement.html = 11월 11일)에서 읽는다. */
function japanKantei(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const re = new RegExp(
    String.raw`<a\s+href="([^"]*\/105\/(?:statement|speech)\/(\d{4})(\d{2})\/([^"/]+))"[^>]*>${INSIDE_A}class="panel-article__title">([\s\S]*?)<\/div>`,
    "gi",
  );
  const seen = new Set<string>();
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(re)) {
    const url = absolute(m[1], pageUrl);
    const title = clean(m[5]);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const day = /^\d{4}/.test(m[4]) ? m[4].slice(2, 4) : /^\d{2}/.test(m[4]) ? m[4].slice(0, 2) : null;
    out.push(candidate(issuerId, title, url, day ? `${m[2]}-${m[3]}-${day}` : null));
  }
  return out;
}


/** 링크 하나의 글자에서 태그를 걷어 낸 제목 */
function anchorText(raw: string): string {
  return clean(raw);
}

/**
 * 프랑스 대통령실(엘리제) 소식 목록: 링크 글자가 "22 octobre 2026 Article 제목" 모양이고, 주소에 날짜가 들어 있다
 * (/emmanuel-macron/2026/10/22/slug). 앞의 날짜·유형(Article·Communiqué de presse·Conseil des ministres)을 떼고 제목만 쓴다.
 * 실제 HTML을 직접 보고 짠 게 아니라 페이지 설명에 맞춘 것이라, docs:grab으로 저장해 본 뒤 맞는지 확인한다.
 */
function elysee(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const re = /<a\b[^>]*href="([^"]*\/emmanuel-macron\/(\d{4})\/(\d{2})\/(\d{2})\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(re)) {
    const url = absolute(m[1], pageUrl);
    if (!url || seen.has(url)) continue;
    const title = anchorText(m[5])
      .replace(/^\d{1,2}(?:er)?\s+\p{L}+\s+\d{4}\s+/u, "")
      .replace(/^(Article|Communiqu[eé] de presse|Conseil des ministres|D[eé]claration|Discours|Entretien)\s+/i, "")
      .trim();
    if (!title) continue;
    seen.add(url);
    out.push(candidate(issuerId, title, url, `${m[2]}-${m[3]}-${m[4]}`));
  }
  return out;
}

/**
 * 중국 외교부 영문 "주요 소식(Top Stories)": 주소가 /eng/xw/zyxw/202611/t20261110_12056514.html 모양이라 날짜가 들어 있고,
 * 링크 글자가 제목이다. 대변인 정례 브리핑(발언)은 다른 목록이라 여기에 없다.
 * 이 페이지는 설명으로 확인한 구조에 맞춘 것이므로 docs:grab으로 실제 HTML을 확인해야 한다.
 */
function chinaMfa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const re = /<a\b[^>]*href="([^"]*\/(?:\.\/)?\d{6}\/t(\d{4})(\d{2})(\d{2})_\d+\.html|\.\/\d{6}\/t(\d{4})(\d{2})(\d{2})_\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(re)) {
    const url = absolute(m[1], pageUrl);
    if (!url || seen.has(url)) continue;
    const y = m[2] ?? m[5];
    const mo = m[3] ?? m[6];
    const d = m[4] ?? m[7];
    const title = anchorText(m[8]);
    if (!title || title.length < 8) continue;
    seen.add(url);
    out.push(candidate(issuerId, title, url, `${y}-${mo}-${d}`));
  }
  return out;
}

/**
 * 이란 외무부 영문 뉴스 보관함(/portal/newsarchive/699, "Statements" 분류): 항목마다 `news-item-title` 안의 링크가 제목이고
 * 주소는 ../newsview/<번호>, 날짜는 같은 항목의 `dateNews`에 2026/11/11 꼴로 있다(2026-11-12 실제 페이지 확인).
 * 요약 칸(news-item-lead)은 "."만 있는 경우가 많아 쓰지 않는다. 이란 외무부는 RSS가 없다.
 */
function iranMfa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const block of html.split(/class="news-arch-item"/i).slice(1)) {
    const t = /class="hTitle"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block) ?? /href="([^"]*newsview\/\d+)"[^>]*class="hTitle"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!t) continue;
    const url = absolute(t[1], pageUrl);
    const title = clean(t[2]);
    if (!url || !title) continue;
    const d = /class="dateNews"[\s\S]*?(\d{4})\/(\d{2})\/(\d{2})/i.exec(block);
    out.push(candidate(issuerId, title, url, d ? `${d[1]}-${d[2]}-${d[3]}` : null, "statement"));
  }
  return out;
}

/**
 * 일본 외무성 보도발표 목록: `<dt class="list-title">November 12</dt>` 다음 `<dd>`에 그날 링크들이 들어 있다(2026-11-12 실제 페이지 확인).
 * 날짜에 연도가 없어서 올해로 놓고, 오늘보다 하루 넘게 미래면 작년으로 돌린다(연말·연초 걸침 대비).
 */
function japanMofa(html: string, pageUrl: string, issuerId: IssuerId, now: Date): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<dt[^>]*>\s*([A-Za-z]+)\s+(\d{1,2})\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
    const month = MONTHS[m[1].toLowerCase()];
    if (!month) continue;
    let year = now.getUTCFullYear();
    if (Date.UTC(year, Number(month) - 1, Number(m[2])) > now.getTime() + 36 * 3600 * 1000) year -= 1;
    const date = `${year}-${month}-${pad(m[2])}`;
    for (const a of m[3].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = absolute(a[1], pageUrl);
      const title = clean(a[2]);
      if (url && title) out.push(candidate(issuerId, title, url, date));
    }
  }
  return out;
}

/**
 * 일본 외무성 보도발표 상세 페이지의 "November 11, 2026" 꼴 날짜 → YYYY-MM-DD. 목록에는 연도가 없어서,
 * 새로 보는 항목에 한해 상세 페이지로 연도까지 확정할 때 쓴다(2026-11-12 실제 페이지 확인).
 */
export function japanMofaDetailDate(html: string): string | null {
  const m = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/.exec(html);
  return m ? `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${pad(m[2])}` : null;
}

const READERS: Array<[RegExp, (html: string, pageUrl: string, issuerId: IssuerId, now: Date) => DocCandidate[]]> = [
  [/(^|\.)nato\.int$/i, natoOfficialTexts],
  [/(^|\.)mofa\.gov\.tw$/i, taiwanMofa],
  [/(^|\.)diplomatie\.gouv\.fr$/i, franceDiplomatie],
  [/(^|\.)mofa\.go\.kr$/i, (html, pageUrl, issuerId) => (/\/www\//.test(pageUrl) ? koreaMofaKo(html, pageUrl, issuerId) : koreaMofa(html, pageUrl, issuerId))],
  [/(^|\.)mnd\.go\.kr$/i, koreaMnd],
  [/(^|\.)mnd\.gov\.tw$/i, taiwanMnd],
  [/(^|\.)kantei\.go\.jp$/i, japanKantei],
  [/(^|\.)elysee\.fr$/i, elysee],
  [/(^|\.)(fmprc|mfa)\.gov\.cn$/i, chinaMfa],
  [/(^|\.)mfa\.ir$/i, iranMfa],
  [/(^|\.)mofa\.go\.jp$/i, japanMofa],
];

/** 이 주소의 목록 페이지를 읽는 함수가 있는가 */
export function hasListPageReader(pageUrl: string): boolean {
  try {
    const host = new URL(pageUrl).hostname;
    return READERS.some(([re]) => re.test(host));
  } catch {
    return false;
  }
}

/** 목록 페이지 HTML → 후보. 읽는 함수가 없는 호스트면 빈 배열. */
export function parseListPage(html: string, pageUrl: string, issuerId: IssuerId, now: Date = new Date()): DocCandidate[] {
  let host: string;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    return [];
  }
  const reader = READERS.find(([re]) => re.test(host));
  if (!reader) return [];
  const seen = new Set<string>();
  return reader[1](html, pageUrl, issuerId, now).filter((row) => !seen.has(row.url) && seen.add(row.url));
}
