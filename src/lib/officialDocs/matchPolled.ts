import { ACTOR_OF_ISSUER } from "@/lib/officialDocs/match";
import { topicsOf } from "@/lib/officialDocs/federalRegister";
import { actorsOf, rareTagsOf } from "@/lib/news/eventScenarios";

/**
 * 워커가 자동으로 모은 공식 문서(`/api/official-docs`)를 속보에 붙이는 규칙.
 * 사람이 승인한 문서(OFFICIAL_DOCS)와 달리 검수 전이라, 잡음을 줄이려고 "한 가지 단서만으로는" 붙이지 않는다.
 *
 * 점수(합계 3 이상이어야 붙는다):
 *  - 속보와 문서에 같은 희귀 지명(hormuz·gaza 등)이 읽힌다 → 3 (지명은 드물어서 그 하나로 충분하다)
 *  - 같은 주제(반도체·제재·수출통제·방산…)가 걸린다 → 1 (주제는 흔해서 혼자서는 모자란다. "지정학" 일반 주제는 제외)
 *  - 문서를 낸 나라가 속보에 당사자로 나온다 → 1
 *  - 제목에 같은 고유한 단어(회사·품목·조약 이름 등)가 1개 → 1, 2개 이상 → 2
 *  - 발행일이 속보 14일 전 ~ 3일 후 범위 밖이면 점수와 상관없이 뺀다
 */

export type PolledDoc = {
  id: string;
  issuerId: string;
  kind: string;
  weight: string;
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  tags: string;
  feed: string;
  agency: string;
};

export type PolledDocMatch = {
  doc: PolledDoc;
  score: number;
  /** 왜 붙었는지(화면에 그대로 보여 준다) */
  reasons: { places: string[]; topics: string[]; terms: string[]; actor: boolean };
};

const MAX_DOCS = 3;
const MIN_SCORE = 3;
const BEFORE_MS = 14 * 86_400_000;
const AFTER_MS = 3 * 86_400_000;

/** 어느 문서 제목에나 나오는 말·나라 이름은 "같은 단어"로 세지 않는다 */
const STOP = new Set(
  (
    "statement joint declaration communique readout factsheet fact sheet press release remarks meeting talks " +
    "united states state states american department secretary president minister ministry foreign affairs office " +
    "government federal national international general council committee regarding concerning following between " +
    "about after before their there which would should could where these those other under against during " +
    "russia russian china chinese iran iranian israel israeli ukraine ukrainian korea korean japan japanese " +
    "india indian france french germany german turkey turkish britain british european union nato " +
    "rule rules notice final proposed order orders action actions request comment comments agency program " +
    "announces announced says said new first second third week month year today"
  ).split(/\s+/),
);

function termsOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.toLowerCase().matchAll(/[a-z][a-z-]{4,}/g)) if (!STOP.has(m[0])) out.add(m[0]);
  return out;
}

function placeTagsOf(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter((t) => t && !t.startsWith("topic:"));
}

function topicTagsOf(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter((t) => t.startsWith("topic:")).map((t) => t.slice(6));
}

export function polledDocsForFlash(
  text: string,
  at: number,
  docs: readonly PolledDoc[],
  opts: { excludeUrls?: ReadonlySet<string> } = {},
): PolledDocMatch[] {
  if (!text.trim() || docs.length === 0) return [];
  const places = new Set(rareTagsOf(text));
  const actors = new Set(actorsOf(text));
  const flashTopics = new Set(topicsOf(text, "").filter((t) => t !== "geopolitics"));
  const flashTerms = termsOf(text);

  const out: PolledDocMatch[] = [];
  for (const doc of docs) {
    if (opts.excludeUrls?.has(doc.url)) continue;
    const published = doc.publishedAt ? Date.parse(doc.publishedAt) : NaN;
    if (!Number.isFinite(published) || published < at - BEFORE_MS || published > at + AFTER_MS) continue;

    const samePlaces = placeTagsOf(doc.tags).filter((t) => places.has(t));
    const sameTopics = topicTagsOf(doc.tags).filter((t) => t !== "geopolitics" && flashTopics.has(t));
    const actor = actors.has(ACTOR_OF_ISSUER[doc.issuerId] ?? "");
    const docTerms = termsOf(doc.title);
    const sameTerms = [...docTerms].filter((t) => flashTerms.has(t));

    let score = 0;
    if (samePlaces.length > 0) score += 3;
    if (sameTopics.length > 0) score += 1;
    if (actor) score += 1;
    score += Math.min(sameTerms.length, 2);
    if (score < MIN_SCORE) continue;
    out.push({ doc, score, reasons: { places: samePlaces, topics: sameTopics, terms: sameTerms.slice(0, 3), actor } });
  }
  return out
    .sort((a, b) => b.score - a.score || (b.doc.publishedAt ?? "").localeCompare(a.doc.publishedAt ?? ""))
    .slice(0, MAX_DOCS);
}
