/**
 * 전황 보고서용 Tier 1 RSS 참고.
 * 수치·좌표를 채우지 않고 링크만 붙인다.
 */

import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type {
  SitrepRssRef,
  TheaterSitrepRegionId,
  TheaterSitrepRow,
} from "@/lib/theaterReport/types";

const MAX_RSS = 12;
const MAX_PER_ROW = 2;
const JOIN_MAX_MS = 12 * 3600_000;

const REGION_FILTER: Record<
  TheaterSitrepRegionId,
  { theaters: NewsTheater[]; keywords: RegExp }
> = {
  ukraine: {
    theaters: ["russia-ukraine"],
    keywords:
      /\bukraine\b|\bukrainian\b|\bkyiv\b|\bkiev\b|\bkharkiv\b|\bdonetsk\b|\bzaporizh|\bcrimea\b|\bblack sea\b|우크라이나|키이우|하르키우|도네츠크|크림/i,
  },
  iran: {
    theaters: ["middle-east"],
    keywords:
      /\biran\b|\biranian\b|\btehran\b|\bstrait of hormuz\b|\bpersian gulf\b|\bgulf of oman\b|이란|테헤란|호르무즈|페르시아\s*만/i,
  },
  yemen: {
    theaters: ["middle-east"],
    keywords:
      /\byemen\b|\bhouthi\b|\bred sea\b|\bbab el.?mandeb\b|\baden\b|예멘|후티|홍해|아덴/i,
  },
};

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9\uac00-\ud7a3]+/i)) {
    const t = raw.trim();
    if (t.length >= 3) out.add(t);
  }
  return out;
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) {
    if (b.has(t)) n += 1;
  }
  return n;
}

function itemTimeMs(item: NewsStreamItem): number | null {
  const t = Date.parse(item.pubDate);
  return Number.isFinite(t) ? t : null;
}

function toRef(item: NewsStreamItem, link: "row" | "theater"): SitrepRssRef {
  return {
    id: item.id,
    title: item.titleKo?.trim() || item.title,
    sourceName: item.publisher?.trim() || item.source,
    url: item.link,
    occurredAt: item.pubDate || null,
    trustTier: 1,
    link,
  };
}

/** trustTier 1 + 전황 키워드/시어터 + 시간창 + 호스트 dedupe */
export function filterTier1RssForTheater(input: {
  regionId: TheaterSitrepRegionId;
  items: NewsStreamItem[];
  cutoffMs: number;
  nowMs: number;
}): NewsStreamItem[] {
  const conf = REGION_FILTER[input.regionId];
  const seen = new Set<string>();
  const out: NewsStreamItem[] = [];

  const sorted = [...input.items].sort((a, b) => {
    const ta = itemTimeMs(a) ?? 0;
    const tb = itemTimeMs(b) ?? 0;
    return tb - ta;
  });

  for (const item of sorted) {
    if (item.trustTier !== 1) continue;
    const t = itemTimeMs(item);
    if (t == null || t < input.cutoffMs || t > input.nowMs + 3600_000) continue;

    const blob = `${item.title}\n${item.titleKo ?? ""}\n${item.summary ?? ""}`;
    const theaterOk = conf.theaters.includes(item.theater);
    const kwOk = conf.keywords.test(blob);
    if (!theaterOk && !kwOk) continue;
    // middle-east 공유 전장: iran/yemen은 키워드 필수
    if (item.theater === "middle-east" && !kwOk) continue;

    const key = uniqueSourceKey(item.source, item.link);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= MAX_RSS) break;
  }
  return out;
}

export function attachTier1RssToRows(input: {
  rows: TheaterSitrepRow[];
  rssItems: NewsStreamItem[];
}): { rows: TheaterSitrepRow[]; theaterRefs: SitrepRssRef[] } {
  const used = new Set<string>();
  const rows = input.rows.map((row) => {
    const rowMs = Date.parse(row.occurredAt);
    const rowTokens = tokenize(`${row.place} ${row.title}`);
    const refs: SitrepRssRef[] = [];

    for (const item of input.rssItems) {
      if (used.has(item.id)) continue;
      const t = itemTimeMs(item);
      if (t == null || !Number.isFinite(rowMs)) continue;
      if (Math.abs(t - rowMs) > JOIN_MAX_MS) continue;
      const itemTokens = tokenize(
        `${item.title} ${item.titleKo ?? ""} ${item.summary ?? ""}`,
      );
      if (overlapCount(rowTokens, itemTokens) < 1) continue;
      refs.push(toRef(item, "row"));
      used.add(item.id);
      if (refs.length >= MAX_PER_ROW) break;
    }

    return refs.length ? { ...row, rssRefs: refs } : row;
  });

  const theaterRefs = input.rssItems
    .filter((item) => !used.has(item.id))
    .map((item) => toRef(item, "theater"));

  return { rows, theaterRefs };
}
