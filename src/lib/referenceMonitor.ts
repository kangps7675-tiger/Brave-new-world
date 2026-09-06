/**
 * 레퍼런스 감시 — CSIS Beyond Parallel · NTI 갱신 추적의 순수 로직.
 *
 * 속보 스트림(news_stream_*)과 분리한 이유: 이쪽은 위성사진 판독·시설 프로파일·트래커라
 * 수명이 길고 발행 뒤 조용히 고쳐지는 일이 잦다. 그래서 published 가 아니라
 * updated/modified 를 변경 감지 축으로 쓴다.
 *
 * 소스별 접근이 다르다:
 *  - CSIS Beyond Parallel: WordPress RSS 가 정상 동작 → 피드 파싱
 *  - NTI: /feed/ 가 빈 채널이라 못 쓴다 → WordPress REST(wp/v2)의 커스텀 포스트 타입
 *    (article · atomic-pulse · news)을 orderby=modified 로 폴링
 *
 * 워커(workers/cron-ingest/src/referenceMonitor.ts)가 fetch·D1 을 맡고,
 * 파싱·태깅은 전부 여기 있어서 테스트 가능하다.
 */

export const REFERENCE_MONITOR_SOURCES = {
  "csis-beyond-parallel": {
    label: "CSIS Beyond Parallel",
    labelKo: "CSIS 비욘드 패럴렐",
    url: "https://beyondparallel.csis.org/",
    feed: "https://beyondparallel.csis.org/feed/",
  },
  nti: {
    label: "Nuclear Threat Initiative",
    labelKo: "핵위협방지구상(NTI)",
    url: "https://www.nti.org/",
    feed: "https://www.nti.org/wp-json/wp/v2",
  },
} as const;

export type ReferenceMonitorSource = keyof typeof REFERENCE_MONITOR_SOURCES;

/** NTI 커스텀 포스트 타입 — /wp-json/wp/v2/types 로 확인한 rest_base */
export const NTI_REST_CHANNELS = ["article", "atomic-pulse", "news"] as const;

export const CSIS_BEYOND_PARALLEL_FEED = REFERENCE_MONITOR_SOURCES["csis-beyond-parallel"].feed;
export const NTI_REST_BASE = REFERENCE_MONITOR_SOURCES.nti.feed;

export type ReferenceMonitorRow = {
  id: string;
  source: string;
  source_label: string;
  channel: string;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  categories_json: string;
  topics_json: string;
  relevance: number;
  published_at: string | null;
  updated_at: string | null;
  hub?: string | null;
  place_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  image_url?: string | null;
  thumb_credit?: string | null;
};

/* ------------------------------------------------------------------ 관련도 */

export type ReferenceTopic =
  | "dprk"
  | "missile-silo"
  | "plarf"
  | "missile-test"
  | "nuclear-weapons"
  | "nuclear-facility"
  | "satellite-imagery"
  | "russia"
  | "china"
  | "iran"
  | "india-pakistan"
  | "arms-control"
  | "naval"
  | "hub:PRK"
  | "hub:CHN"
  | "hub:RUS"
  | "hub:IRN";

export const REFERENCE_TOPIC_LABEL: Record<ReferenceTopic, { ko: string; en: string }> = {
  dprk: { ko: "북한", en: "North Korea" },
  "missile-silo": { ko: "미사일 사일로", en: "Missile silos" },
  plarf: { ko: "중국 로켓군", en: "PLA Rocket Force" },
  "missile-test": { ko: "미사일 시험", en: "Missile tests" },
  "nuclear-weapons": { ko: "핵무기", en: "Nuclear weapons" },
  "nuclear-facility": { ko: "핵시설", en: "Nuclear facilities" },
  "satellite-imagery": { ko: "위성영상 판독", en: "Satellite imagery" },
  russia: { ko: "러시아", en: "Russia" },
  china: { ko: "중국", en: "China" },
  iran: { ko: "이란", en: "Iran" },
  "india-pakistan": { ko: "인도·파키스탄", en: "India–Pakistan" },
  "arms-control": { ko: "군비통제", en: "Arms control" },
  naval: { ko: "해군·조선", en: "Naval" },
  "hub:PRK": { ko: "북한 허브", en: "PRK hub" },
  "hub:CHN": { ko: "중국 허브", en: "CHN hub" },
  "hub:RUS": { ko: "러시아 허브", en: "RUS hub" },
  "hub:IRN": { ko: "이란 허브", en: "IRN hub" },
};

/**
 * 두 사이트 모두 핵·비확산 전반을 다루므로, 지도·레이어와 실제로 이어지는 주제만 통과시킨다.
 * 가중치는 "우리 화면에 붙일 여지"에 비례 — 사일로·PLARF 가 제일 높다.
 */
const TOPIC_RULES: { topic: ReferenceTopic; weight: number; re: RegExp }[] = [
  { topic: "missile-silo", weight: 4, re: /\b(silos?|missile field)\b/i },
  { topic: "plarf", weight: 4, re: /\b(plarf|rocket force|chinese missile|china'?s missile)\b/i },
  { topic: "dprk", weight: 3, re: /\b(north korea\w*|dprk|pyongyang|kim jong)\b/i },
  {
    topic: "missile-test",
    weight: 3,
    re: /\b(missile (test|launch)|icbm|irbm|mrbm|srbm|slbm|hypersonic)\b/i,
  },
  {
    topic: "nuclear-facility",
    weight: 3,
    re: /\b(yongbyon|natanz|fordow|punggye|sohae|reactor|reprocessing|centrifuge)\b/i,
  },
  {
    topic: "nuclear-weapons",
    weight: 2,
    re: /\b(nuclear (weapon|warhead|arsenal|test)s?|warhead|enrichment|plutonium|heu)\b/i,
  },
  {
    topic: "satellite-imagery",
    weight: 2,
    re: /\b(satellite imagery|imagery analysis|commercial imagery|planet labs|maxar)\b/i,
  },
  {
    topic: "russia",
    weight: 2,
    re: /\b(russia\w*|rvsn|strategic rocket forces|yars|sarmat|avangard)\b/i,
  },
  { topic: "china", weight: 2, re: /\b(china|chinese|beijing|pla)\b/i },
  { topic: "iran", weight: 2, re: /\b(iran\w*|tehran|irgc)\b/i },
  {
    topic: "india-pakistan",
    weight: 2,
    re: /\b(india\w*|pakistan\w*|agni|shaheen|ghauri|prithvi)\b/i,
  },
  {
    topic: "arms-control",
    weight: 1,
    re: /\b(new start|npt|ctbt|arms control|safeguards|iaea|verification)\b/i,
  },
  { topic: "naval", weight: 1, re: /\b(submarine|ssbn|shipyard|naval base|destroyer)\b/i },
];

/** 매칭 태그와 가중치 합 — 모금·행사·인사 글은 0점으로 걸러진다 */
export function scoreRelevance(text: string): { topics: ReferenceTopic[]; relevance: number } {
  const topics: ReferenceTopic[] = [];
  let relevance = 0;
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(text)) {
      topics.push(rule.topic);
      relevance += rule.weight;
    }
  }
  return { topics, relevance };
}

/* -------------------------------------------------------------- 파싱 유틸 */

const TAG_RE = /<[^>]*>/g;

function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8216;|&lsquo;/gi, "'")
    .replace(/&#8220;|&ldquo;/gi, '"')
    .replace(/&#8221;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, "-")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&amp;/g, "&");
}

function plainText(raw: string | null | undefined, max = 400): string {
  if (!raw) return "";
  const text = decodeEntities(raw).replace(TAG_RE, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function firstTag(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return m ? m[1] : null;
}

function allTags(block: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  let m = re.exec(block);
  while (m) {
    out.push(m[1]);
    m = re.exec(block);
  }
  return out;
}

function toIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = decodeEntities(raw).trim();
  if (!trimmed) return null;
  // WP REST 는 타임존 없는 시각을 주므로 Z 를 붙여 UTC 로 고정
  const candidate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}Z`
    : trimmed;
  const ms = Date.parse(candidate);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** URL 기반 안정 id (FNV-1a) — 같은 글이 재발행돼도 한 행으로 접힌다 */
export function referenceItemId(source: string, url: string): string {
  const normalized = url
    .replace(/^https?:\/\//, "")
    .replace(/[#?].*$/, "")
    .replace(/\/+$/, "");
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${source}:${(hash >>> 0).toString(36)}`;
}

/* ------------------------------------------------- CSIS Beyond Parallel RSS */

export function parseCsisBeyondParallelFeed(xml: string): ReferenceMonitorRow[] {
  const rows: ReferenceMonitorRow[] = [];
  for (const item of allTags(xml, "item")) {
    const url = plainText(firstTag(item, "link"), 500);
    const title = plainText(firstTag(item, "title"), 300);
    if (!url || !title) continue;

    const summary =
      plainText(firstTag(item, "description"), 400) ||
      plainText(firstTag(item, "content:encoded"), 400);
    const author =
      plainText(firstTag(item, "dc:creator"), 120) || plainText(firstTag(item, "author"), 120);
    const categories = allTags(item, "category")
      .map((c) => plainText(c, 80))
      .filter(Boolean)
      .slice(0, 12);
    const published = toIso(firstTag(item, "pubDate"));
    const { topics, relevance } = scoreRelevance(`${title} ${summary} ${categories.join(" ")}`);

    rows.push({
      id: referenceItemId("csis-beyond-parallel", url),
      source: "csis-beyond-parallel",
      source_label: REFERENCE_MONITOR_SOURCES["csis-beyond-parallel"].label,
      channel: "rss",
      url,
      title,
      summary: summary || null,
      author: author || null,
      categories_json: JSON.stringify(categories),
      topics_json: JSON.stringify(topics),
      // Beyond Parallel 은 전량이 한반도 정보분석이라 최소 관련도를 보장한다
      relevance: Math.max(relevance, 3),
      published_at: published,
      updated_at: published,
    });
  }
  return rows;
}

/* ------------------------------------------------------ NTI WordPress REST */

type WpRendered = { rendered?: string };

export type WpRestPost = {
  id?: number;
  date?: string;
  date_gmt?: string;
  modified?: string;
  modified_gmt?: string;
  link?: string;
  title?: WpRendered;
  excerpt?: WpRendered;
};

export function parseNtiRestPosts(channel: string, posts: WpRestPost[]): ReferenceMonitorRow[] {
  const rows: ReferenceMonitorRow[] = [];
  for (const post of posts) {
    const url = typeof post.link === "string" ? post.link : "";
    const title = plainText(post.title?.rendered, 300);
    if (!url || !title) continue;

    const summary = plainText(post.excerpt?.rendered, 400);
    const published = toIso(post.date_gmt ?? post.date);
    const updated = toIso(post.modified_gmt ?? post.modified) ?? published;
    const { topics, relevance } = scoreRelevance(`${title} ${summary}`);

    rows.push({
      id: referenceItemId("nti", url),
      source: "nti",
      source_label: REFERENCE_MONITOR_SOURCES.nti.label,
      channel,
      url,
      title,
      summary: summary || null,
      author: null,
      categories_json: "[]",
      topics_json: JSON.stringify(topics),
      relevance,
      published_at: published,
      updated_at: updated,
    });
  }
  return rows;
}

/** NTI REST 폴링 URL — modified 내림차순이라 갱신분이 앞에 온다 */
export function ntiRestUrl(base: string, channel: string, perPage: number): string {
  const root = base.replace(/\/+$/, "");
  return (
    `${root}/${channel}?per_page=${perPage}&orderby=modified&order=desc` +
    `&_fields=id,date_gmt,modified_gmt,link,title,excerpt`
  );
}

/* --------------------------------------------------- NTI sitemap 폴백 경로 */

/**
 * NTI 는 Cloudflare 봇 관리 뒤에 있어서 실행 환경에 따라 REST(wp-json)가 403 챌린지를
 * 맞는다. 그때 쓰는 폴백. sitemap 은 크롤러용이라 대체로 열려 있고 `lastmod` 로
 * 갱신을 잡을 수 있다. 대신 제목·요약이 없어 슬러그에서 제목을 복원한다.
 */
export const NTI_SITEMAP_INDEX = "https://www.nti.org/sitemap_index.xml";

/** 우리 주제와 겹치는 sitemap 만 — country/facility 는 정적 프로파일이라 제외 */
const SITEMAP_CHANNEL_RE = /\/(article|atomic-pulse|news)-sitemap\.xml$/i;

export function parseSitemapIndex(xml: string): { url: string; channel: string }[] {
  const out: { url: string; channel: string }[] = [];
  for (const block of allTags(xml, "sitemap")) {
    const loc = plainText(firstTag(block, "loc"), 500);
    if (!loc) continue;
    const match = SITEMAP_CHANNEL_RE.exec(loc);
    if (!match) continue;
    out.push({ url: loc, channel: match[1].toLowerCase() });
  }
  return out;
}

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

/** `russias-2000-military-doctrine` → `Russias 2000 Military Doctrine` */
export function titleFromSlug(url: string): string {
  const slug = url
    .replace(/[#?].*$/, "")
    .replace(/\/+$/, "")
    .split("/")
    .pop();
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/**
 * sitemap `<url>` 목록 → 행. sitemap 은 lastmod 오름차순이라 최신이 뒤에 있어서
 * 끝에서 limit 개를 잘라 최신순으로 되돌린다.
 */
export function parseNtiSitemapUrls(
  channel: string,
  xml: string,
  limit: number,
): ReferenceMonitorRow[] {
  const entries: { url: string; lastmod: string | null }[] = [];
  for (const block of allTags(xml, "url")) {
    const loc = plainText(firstTag(block, "loc"), 500);
    if (!loc) continue;
    entries.push({ url: loc, lastmod: toIso(firstTag(block, "lastmod")) });
  }

  const recent = entries.slice(-Math.max(1, limit)).reverse();
  const rows: ReferenceMonitorRow[] = [];
  for (const entry of recent) {
    const title = titleFromSlug(entry.url);
    if (!title) continue;
    const { topics, relevance } = scoreRelevance(`${title} ${entry.url.replace(/[/-]/g, " ")}`);
    rows.push({
      id: referenceItemId("nti", entry.url),
      source: "nti",
      source_label: REFERENCE_MONITOR_SOURCES.nti.label,
      channel: `${channel}-sitemap`,
      url: entry.url,
      title,
      // sitemap 에는 본문 요약이 없다 — 제목은 슬러그에서 복원한 값임을 남긴다
      summary: null,
      author: null,
      categories_json: "[]",
      topics_json: JSON.stringify(topics),
      relevance,
      published_at: entry.lastmod,
      updated_at: entry.lastmod,
    });
  }
  return rows;
}

/* --------------------------------------------------------------- 클라이언트 */

export type ReferenceMonitorItem = {
  id: string;
  source: string;
  sourceLabel: string;
  channel: string;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  categories: string[];
  topics: string[];
  relevance: number;
  publishedAt: string | null;
  updatedAt: string | null;
  firstSeenAt: string;
  hub?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
  thumbCredit?: string | null;
};

export type ReferenceMonitorPayload = {
  items: ReferenceMonitorItem[];
  sources: { source: string; label: string; count: number }[];
  count: number;
  fetchedAt: string;
  stub?: boolean;
};

export function topicLabel(topic: string, locale: "ko" | "en" = "ko"): string {
  const entry = REFERENCE_TOPIC_LABEL[topic as ReferenceTopic];
  return entry ? entry[locale] : topic;
}

/** 발행 후 조용히 고쳐진 항목 — 「갱신됨」 배지 판정 */
export function wasRevised(item: {
  publishedAt: string | null;
  updatedAt: string | null;
}): boolean {
  if (!item.publishedAt || !item.updatedAt) return false;
  const published = Date.parse(item.publishedAt);
  const updated = Date.parse(item.updatedAt);
  if (!Number.isFinite(published) || !Number.isFinite(updated)) return false;
  // 초 단위 오차는 재발행이 아니다 — 하루 이상 벌어진 경우만 개정으로 본다
  return updated - published >= 24 * 60 * 60 * 1000;
}
