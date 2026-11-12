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

/**
 * 합참 보도자료(/jcs2/4752/subview.do): `<a href="/bbs/jcs2/121947/O_503624/artclView.do">` 카드 안에 `strong.title`과 `등록일2026.11.12`(2026-11-12 확인).
 * 북한 발사 직후 발표는 이 게시판에 오르지 않는다(문자·언론 브리핑으로 나간다). 훈련·태세 점검 등 합참 입장이 오른다.
 */
function koreaJcs(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<a\s+href="(\/bbs\/jcs2\/\d+\/[^"]+\/artclView\.do)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = m[2].match(/<strong class="title">([\s\S]*?)<\/strong>\s*<p/i) ?? m[2].match(/<strong class="title">([\s\S]*?)<\/strong>/i);
    const d = m[2].match(/등록일\s*<\/strong>\s*(\d{4})\.(\d{2})\.(\d{2})/);
    const url = absolute(m[1], pageUrl);
    const title = t ? clean(t[1]).replace(/\s*새글\s*$/, "") : "";
    if (url && title) out.push(candidate(issuerId, title, url, d ? `${d[1]}-${d[2]}-${d[3]}` : null));
  }
  return out;
}

/**
 * 일본 방위성 새 소식(/j/press/news/index.html): `<dt class="date">10/29</dt><dd class="news__title"><a href="/j/press/news/2026/10/29d.html">…`.
 * 날짜에 연도가 없어 주소(/news/2026/10/29d)에서 읽는다. 북한 미사일 발표는 별도(jmodLaunch)로 숫자까지 읽는다.
 */
function japanMod(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<dd[^>]*class="news__title"[^>]*>\s*<a\s+href="(\/j\/press\/news\/(\d{4})\/(\d{2})\/(\d{2})[a-z]?\.html)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(m[1], pageUrl);
    const title = clean(m[5]);
    if (url && title) out.push(candidate(issuerId, title, url, `${m[2]}-${m[3]}-${m[4]}`));
  }
  return out;
}

/**
 * 중국 국방부 중문 "발언인 담화·기자 질문 답변"(/gfbw/xwfyr/fyrthhdjzw/index.html). 목록은 서버가 주는 HTML에 이미 들어 있고(2026-11-12 원본 HTML 확인),
 * 항목은 `<li><a href=".../fyrthhdjzw/16492077.html"> … <h3><p class="title">제목</p><small class="time hidden-xs">2026-10-11 11:19</small>` 모양이다.
 * 사이트는 http로 열린다(영문 사이트 eng.mod.gov.cn은 인증서 오류).
 */
function chinaMod(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<li>\s*<a\s+href="([^"]*\/gfbw\/[^"]*\/\d{6,}\.html)"[^>]*>[\s\S]*?<p class="title">([\s\S]*?)<\/p>[\s\S]*?<small class="time[^"]*">\s*(\d{4}-\d{2}-\d{2})/gi)) {
    const url = absolute(m[1], pageUrl);
    const title = clean(m[2]);
    if (url && title) out.push(candidate(issuerId, title, url, m[3]));
  }
  return out;
}

/**
 * 인도 외교부(MEA) 보도자료. 화면(/press-releases)의 목록은 자바스크립트가 불러오는 것이라 서버가 받는 HTML에는 없다.
 * 그 자바스크립트가 부르는 주소(/FrontEnd/FetchPublicationListingData?publicationId=51…)는 목록 조각을 HTML로 돌려주므로 그 주소를 목록으로 쓴다.
 * 조각 구조: `<div class="pressRelesastBox"><span class="date">12 November, 2026</span><h3 class="pressTitle"><a href="/press-releases?dtl/41942/…">제목</a>`(2026-11-12 확인).
 */
function indiaMea(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const box of html.split(/<div class="pressRelesastBox"/i).slice(1)) {
    const d = box.match(/<span class="date">\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})\s*<\/span>/i);
    const a = box.match(/<h3 class="pressTitle">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const month = d ? MONTHS[d[2].toLowerCase()] : undefined;
    const date = d && month ? `${d[3]}-${month}-${pad(d[1])}` : null;
    const url = absolute(a[1], pageUrl);
    const title = clean(a[2]);
    if (url && title) out.push(candidate(issuerId, title, url, date));
  }
  return out;
}

/**
 * 호주 국방부 보도자료(/news-events/releases): `<a href="/news-events/releases/2026-11-11/remembrance-day-2026"> … <h3>제목</h3>`.
 * 날짜는 주소에 들어 있다(2026-11-12 실제 페이지 확인). 같은 사이트의 /news-events/news는 인물·행사 기사라 읽지 않는다.
 */
function australiaDefence(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<a\s+href="(\/news-events\/releases\/(\d{4}-\d{2}-\d{2})\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = m[3].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const url = absolute(m[1], pageUrl);
    const title = t ? clean(t[1]) : "";
    if (url && title) out.push(candidate(issuerId, title, url, m[2]));
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
 * 중국 상무부(MOFCOM) 영문 사이트 대변인 발표(Spokesman's Remarks). 목록 페이지는 자바스크립트가 채우는 빈 껍데기(4.7KB)라서,
 * 껍데기가 부르는 목록 API(/api-gateway/jpaas-publish-server/front/page/build/unit?…pageId=…)를 수집 주소로 직접 쓴다.
 * 응답은 JSON이고 `data.html`에 `<a href="/News/…/art/2026/art_….html">제목</a><span>11/06/2026</span>`(월/일/년) 목록이 들어 있다(2026-11-12 확인).
 * 영문 "Announcements & Orders"는 2025-04 이후로 갱신이 멈춰 있어 쓰지 않는다(수출통제 공고의 실제 게시처는 중문 사이트).
 */
function chinaMofcom(body: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  let html = body;
  try {
    const data = (JSON.parse(body) as { data?: { html?: string } }).data;
    if (typeof data?.html === "string") html = data.html;
  } catch {
    /* JSON이 아니면 본문을 그대로 HTML로 읽는다 */
  }
  const out: DocCandidate[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+\/art_[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>\s*<span>\s*(\d{2})\/(\d{2})\/(\d{4})\s*<\/span>/gi)) {
    const url = absolute(m[1], pageUrl);
    const title = clean(m[2]);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    out.push(candidate(issuerId, title, url, `${m[5]}-${m[3]}-${m[4]}`));
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
 * 사우디 외교부 영문 성명(/en/ministry/statements/)·소식(/en/ministry/news/) 목록: 항목마다 `<article class="card">` 안에
 * `card-title`(제목), 날짜 칸("Wednesday, July 29, 2026"), "Read More" 링크가 있다(2026-11-12 실제 페이지 확인).
 * 링크 끝에 붙는 세션용 `csrt` 값은 때마다 달라 중복 판정을 깨므로 떼어 낸다. 성명 목록은 성명(statement)으로 분류한다.
 */
function saudiMofa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  const kind = /\/statements\//i.test(pageUrl) ? "statement" : undefined;
  for (const block of html.split(/<article\b[^>]*class="card"/i).slice(1)) {
    const t = /class="card-title"[^>]*>([\s\S]*?)<\/h2>/i.exec(block);
    const a = /<a\b[^>]*href="([^"]+)"/i.exec(block);
    if (!t || !a) continue;
    const url = absolute(a[1].replace(/[?&]csrt=\d+/i, ""), pageUrl);
    const title = clean(t[1]);
    if (!url || !title) continue;
    const d = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/.exec(block);
    out.push(candidate(issuerId, title, url, d ? `${d[3]}-${MONTHS[d[1].toLowerCase()]}-${pad(d[2])}` : null, kind));
  }
  return out;
}

/**
 * 파키스탄 외교부 보도자료(/press-releases): 카드 하나가 `<a href=".../press-releases/슬러그"> … <h5>제목</h5> … 03 Nov 2026`
 * 모양이다(2026-11-12 실제 페이지 확인). 대변인 주간 브리핑 기록과 사전 안내(Curtain Raiser)도 같은 목록에 올라온다.
 */
function pakistanMofa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const seen = new Set<string>();
  const out: DocCandidate[] = [];
  for (const m of html.matchAll(/<a\s+href="([^"]*\/press-releases\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(m[1], pageUrl);
    const t = /<h5[^>]*>([\s\S]*?)<\/h5>/i.exec(m[2]);
    const title = t ? clean(t[1]) : "";
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const d = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\b/i.exec(m[2]);
    const month = d ? Object.entries(MONTHS).find(([name]) => name.startsWith(d[2].toLowerCase()))?.[1] : null;
    out.push(candidate(issuerId, title, url, d && month ? `${d[3]}-${month}-${pad(d[1])}` : null));
  }
  return out;
}

/**
 * 카타르 외교부 영문 성명(/en/latest-articles/statements)·소식(/en/all-mofa-news) 목록: 항목마다 `news-list-item` 안에
 * `<a href> <h4 class="news-title">제목</h4>`와 `news-publication-date`("Sunday, November 08, 2026")가 있다(2026-11-12 실제 페이지 확인).
 * 한 번에 6건만 보이므로 자주 읽어야 놓치지 않는다. 성명 목록은 성명(statement)으로 분류한다.
 */
function qatarMofa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  const kind = /\/statements/i.test(pageUrl) ? "statement" : undefined;
  for (const block of html.split(/class="[^"]*news-list-item[^"]*"/i).slice(1)) {
    const a = /<a\b[^>]*href="([^"]+)"[^>]*>\s*<h4[^>]*class="news-title"[^>]*>([\s\S]*?)<\/h4>/i.exec(block);
    if (!a) continue;
    const url = absolute(a[1], pageUrl);
    const title = clean(a[2]);
    if (!url || !title) continue;
    const d = /news-publication-date[^>]*>[^<]*?\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i.exec(block);
    out.push(candidate(issuerId, title, url, d ? `${d[3]}-${MONTHS[d[1].toLowerCase()]}-${pad(d[2])}` : null, kind));
  }
  return out;
}

/**
 * 우크라이나 외교부 타임라인(/timeline?&type=posts): 날짜별 `<div class="timeline-block" id="12.11.2026">` 안에
 * 항목마다 `<a class="title" href="/news/슬러그"><span>제목</span></a>`가 있다(2026-11-12 실제 페이지 확인).
 * 제목이 우크라이나어라 영문 속보와는 잘 맞지 않는다(한국어·일본어 제목과 같은 한계).
 */
function ukraineMfa(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const block of html.split(/<div\s+class="timeline-block[^"]*"/i).slice(1)) {
    const d = /^[^>]*\bid="(\d{2})\.(\d{2})\.(\d{4})"/i.exec(block);
    const date = d ? `${d[3]}-${d[2]}-${d[1]}` : null;
    for (const m of block.matchAll(/<a\b[^>]*class="title"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = absolute(m[1], pageUrl);
      const title = clean(m[2]);
      if (url && title) out.push(candidate(issuerId, title, url, date));
    }
  }
  return out;
}

/**
 * 폴란드 정부 포털(gov.pl)의 기관별 소식 목록: `<ul>`(art-prev) 안 항목마다 `<span class="date">07.11.2026</span>`와
 * `<div class="title"><a href="/web/diplomacy/슬러그"> 제목 </a>`가 있다(외교부 /web/diplomacy/news-, 국방부 /web/national-defence/news,
 * 2026-11-12 실제 페이지 확인). 날짜는 일.월.년 순서다.
 */
function polandGov(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const block of html.split(/<li>/i).slice(1)) {
    const a = /class="title"[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!a) continue;
    const url = absolute(a[1], pageUrl);
    const title = clean(a[2]);
    if (!url || !title) continue;
    const d = /class="date"[^>]*>\s*(\d{2})\.(\d{2})\.(\d{4})/i.exec(block);
    out.push(candidate(issuerId, title, url, d ? `${d[3]}-${d[2]}-${d[1]}` : null));
  }
  return out;
}

/**
 * 대만 총통부 영문 첫 화면의 "News Releases": 항목마다 `<div class="listI"><a href="/News/7241#new"> … <div class="date"><span>2026-11-12</span></div>
 * <div class="title"><strong>제목</strong>`(2026-11-12 실제 페이지 확인). RSS 주소(RSSNEWS.aspx)는 첫 화면으로 돌려보내서 쓸 수 없다.
 */
function taiwanPresident(html: string, pageUrl: string, issuerId: IssuerId): DocCandidate[] {
  const out: DocCandidate[] = [];
  for (const block of html.split(/<div class="listI"/i).slice(1)) {
    const a = /<a\b[^>]*href="(\/News\/\d+)[^"]*"/i.exec(block);
    const t = /<div class="title">\s*<strong>([\s\S]*?)<\/strong>/i.exec(block);
    if (!a || !t) continue;
    const url = absolute(a[1], pageUrl);
    const title = clean(t[1]);
    const d = /<div class="date">\s*<span>\s*(\d{4}-\d{2}-\d{2})/i.exec(block);
    if (url && title) out.push(candidate(issuerId, title, url, d ? d[1] : null));
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
  [/(^|\.)president\.gov\.tw$/i, taiwanPresident],
  [/(^|\.)jcs\.mil\.kr$/i, koreaJcs],
  [/(^|\.)mea\.gov\.in$/i, indiaMea],
  [/(^|\.)defence\.gov\.au$/i, australiaDefence],
  [/(^|\.)mod\.gov\.cn$/i, chinaMod],
  [/(^|\.)mod\.go\.jp$/i, japanMod],
  [/(^|\.)kantei\.go\.jp$/i, japanKantei],
  [/(^|\.)elysee\.fr$/i, elysee],
  [/(^|\.)(fmprc|mfa)\.gov\.cn$/i, chinaMfa],
  [/(^|\.)mofcom\.gov\.cn$/i, chinaMofcom],
  [/(^|\.)mfa\.ir$/i, iranMfa],
  [/(^|\.)mofa\.go\.jp$/i, japanMofa],
  [/(^|\.)mofa\.gov\.sa$/i, saudiMofa],
  [/(^|\.)mofa\.gov\.pk$/i, pakistanMofa],
  [/(^|\.)mofa\.gov\.qa$/i, qatarMofa],
  [/(^|\.)mfa\.gov\.ua$/i, ukraineMfa],
  [/(^|\.)gov\.pl$/i, polandGov],
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
