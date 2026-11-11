import type { OfficialDocMeta } from "@/data/officialDocs";
import { describeMedia } from "@/lib/news/mediaTiers";
import { actorsOf, rareTagsOf, sameEventText } from "@/lib/news/eventScenarios";
import type { NewsStreamItem } from "@/lib/news/types";

const MAX_DOCS = 3;
const MAX_ARTICLES = 4;
const ARTICLE_WINDOW_MS = 72 * 3_600_000;

/** 문서를 낸 곳 → 사건 글에서 읽히는 당사자 id */
const ACTOR_OF_ISSUER: Record<string, string> = {
  us: "us", ru: "russia", cn: "china", tw: "taiwan", kp: "dprk", kr: "rok", ir: "iran", il: "israel", ua: "ukraine", nato: "nato",
};

/**
 * 속보에 붙일 근거 문서. 세 가지 중 하나라도 맞으면 붙는다. 나라 이름 하나만으로는 붙이지 않는다
 * (미국이 나왔다고 미국 문서를 다 붙이면 근거가 아니라 잡음이다).
 *  1) 속보 글의 희귀 지명이 문서의 relatedTags와 겹친다.
 *  2) 문서의 keywords 구절이 속보 글에 그대로 들어 있다(예: "new start").
 *  3) 둘 이상이 낸 문서(공동성명·조약)인데, 낸 당사자가 모두 속보 글에 나온다.
 */
export function docsForFlash(text: string, docs: readonly OfficialDocMeta[]): OfficialDocMeta[] {
  const lower = text.toLowerCase();
  const tags = new Set(rareTagsOf(text));
  const actors = new Set(actorsOf(text));
  return docs
    .filter((doc) => {
      if (doc.relatedTags.some((tag) => tags.has(tag))) return true;
      if (doc.keywords?.some((phrase) => phrase.trim() && lower.includes(phrase.toLowerCase()))) return true;
      const sides = doc.issuerIds.map((id) => ACTOR_OF_ISSUER[id]).filter(Boolean);
      return doc.issuerIds.length >= 2 && sides.length === doc.issuerIds.length && sides.every((id) => actors.has(id));
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_DOCS);
}

export type RelatedArticle = {
  title: string;
  url: string;
  source: string;
  at: number;
  /** 3 = 당사자(정부·국영) 매체. 그 나라의 입장이다. */
  tier: 1 | 2 | 3;
  /** "러시아 국영", "미국 정부 발표"처럼 매체의 성격. 알 수 없으면 null. */
  label: string | null;
};

/** 같은 사건을 다룬 최근 기사. 매체 등급을 같이 준다. 속보 자체와 같은 주소는 뺀다. */
export function articlesForFlash(
  text: string,
  at: number,
  pool: readonly NewsStreamItem[],
  ownUrl?: string,
): RelatedArticle[] {
  const seen = new Set<string>();
  const out: RelatedArticle[] = [];
  for (const row of pool) {
    if (!row.title?.trim() || !/^https?:\/\//i.test(row.link) || row.link === ownUrl || seen.has(row.link)) continue;
    const rowAt = Date.parse(row.pubDate);
    if (!Number.isFinite(rowAt) || Math.abs(rowAt - at) > ARTICLE_WINDOW_MS) continue;
    if (!sameEventText(text, row.title)) continue;
    seen.add(row.link);
    out.push({
      title: row.title.trim(),
      url: row.link,
      source: (row.publisher || row.source).trim(),
      at: rowAt,
      tier: row.trustTier,
      label: describeMedia(row.source, row.link).label,
    });
  }
  return out.sort((a, b) => a.tier - b.tier || b.at - a.at).slice(0, MAX_ARTICLES);
}
