import { ACTOR_OF_ISSUER } from "@/lib/officialDocs/match";
import { topicsOf } from "@/lib/officialDocs/federalRegister";
import { actorsOf, rareTagsOf } from "@/lib/news/eventScenarios";
import { activeRivalPairs, rivalPairOf } from "@/lib/officialDocs/rivals";

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
 *
 * 고를 때는 점수순으로 보되 한 나라(issuerId)에서 2건까지만 담아, 당사국이 둘 이상이면 양쪽 입장이 같이 보이게 한다(최대 4건).
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
  /** 한국어·영어 번역(0044 이후, 없으면 비어 있음) */
  titleKo?: string;
  titleEn?: string;
  summaryKo?: string;
  summaryEn?: string;
  /** 원본 파일(PDF) 보관(0045 이후). fileAvailable = 우리 서버에서 직접 열어 보여 줘도 되는 나라의 문서이고 파일이 있다 */
  fileAvailable?: boolean;
  fileBytes?: number;
  fileSha256?: string;
  fileFetchedAt?: string;
  /** 웹 아카이브(archive.org) 보관본 주소 */
  archiveUrl?: string;
};

export type PolledDocMatch = {
  doc: PolledDoc;
  score: number;
  /** 왜 붙었는지(화면에 그대로 보여 준다) */
  reasons: { places: string[]; topics: string[]; terms: string[]; actor: boolean; rival?: boolean };
};

/** 한 속보에 붙이는 문서 수. 한 나라(기관)가 자리를 독차지하지 않도록 나라별로도 상한을 둔다 */
const MAX_DOCS = 4;
const MAX_PER_SIDE = 2;
const MIN_SCORE = 3;
/** 속보에 맞서는 두 당사국이 모두 나왔을 때, 그 두 나라가 낸 문서에만 적용하는 낮은 기준(당사자 1 + 겹치는 단서 하나) */
const MIN_SCORE_RIVAL = 2;
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
  // 속보에 서로 맞서는 두 나라가 함께 나오면, 그 두 나라의 문서는 상대 입장으로서 약간 느슨하게 받는다
  const rivalIssuers = new Set(activeRivalPairs(actors).flat());

  const out: PolledDocMatch[] = [];
  for (const doc of docs) {
    if (opts.excludeUrls?.has(doc.url)) continue;
    const published = doc.publishedAt ? Date.parse(doc.publishedAt) : NaN;
    if (!Number.isFinite(published) || published < at - BEFORE_MS || published > at + AFTER_MS) continue;

    const samePlaces = placeTagsOf(doc.tags).filter((t) => places.has(t));
    const sameTopics = topicTagsOf(doc.tags).filter((t) => t !== "geopolitics" && flashTopics.has(t));
    const actor = actors.has(ACTOR_OF_ISSUER[doc.issuerId] ?? "");
    // 영어가 아닌 제목은 영어 번역의 단어로도 맞춰 본다
    const docTerms = termsOf(`${doc.title} ${doc.titleEn ?? ""}`);
    const sameTerms = [...docTerms].filter((t) => flashTerms.has(t));

    let score = 0;
    if (samePlaces.length > 0) score += 3;
    if (sameTopics.length > 0) score += 1;
    if (actor) score += 1;
    score += Math.min(sameTerms.length, 2);
    const rival = score < MIN_SCORE && score >= MIN_SCORE_RIVAL && actor && rivalIssuers.has(doc.issuerId);
    if (score < MIN_SCORE && !rival) continue;
    out.push({ doc, score, reasons: { places: samePlaces, topics: sameTopics, terms: sameTerms.slice(0, 3), actor, ...(rival ? { rival: true } : {}) } });
  }
  out.sort((a, b) => b.score - a.score || (b.doc.publishedAt ?? "").localeCompare(a.doc.publishedAt ?? ""));
  const perSide = new Map<string, number>();
  const picked: PolledDocMatch[] = [];
  const take = (m: PolledDocMatch): boolean => {
    const n = perSide.get(m.doc.issuerId) ?? 0;
    if (picked.length >= MAX_DOCS || n >= MAX_PER_SIDE || picked.includes(m)) return false;
    perSide.set(m.doc.issuerId, n + 1);
    picked.push(m);
    return true;
  };
  // 맞서는 두 나라가 모두 나온 속보는 양쪽 문서를 먼저 한 건씩 확보한다(한쪽 점수가 높다고 상대 쪽이 밀려나지 않게)
  for (const [a, b] of activeRivalPairs(actors)) {
    const bestA = out.find((m) => m.doc.issuerId === a);
    const bestB = out.find((m) => m.doc.issuerId === b);
    if (bestA && bestB) {
      take(bestA);
      take(bestB);
    }
  }
  for (const m of out) take(m);
  return picked;
}

/**
 * 붙은 문서를 낸 나라(기관)별로 묶는다. 순서는 점수가 가장 높은 문서를 낸 나라부터.
 * 나라가 둘 이상이면 화면이 "당사국별 공식 입장"으로 나란히 보여 준다.
 */
export function groupBySide(matches: readonly PolledDocMatch[]): Array<{ issuerId: string; matches: PolledDocMatch[] }> {
  const groups = new Map<string, PolledDocMatch[]>();
  for (const m of matches) {
    const list = groups.get(m.doc.issuerId);
    if (list) list.push(m);
    else groups.set(m.doc.issuerId, [m]);
  }
  return [...groups].map(([issuerId, list]) => ({ issuerId, matches: list }));
}

/**
 * 붙은 문서 중 서로 맞서는 두 나라(RIVAL_PAIRS)가 모두 있으면 그 쌍과 나머지 묶음으로 나눈다. 없으면 pair는 null.
 * 화면이 맞서는 양측을 좌우로 나란히 놓는 데 쓴다.
 */
export function splitRivalSides(groups: ReadonlyArray<{ issuerId: string; matches: PolledDocMatch[] }>): {
  pair: [{ issuerId: string; matches: PolledDocMatch[] }, { issuerId: string; matches: PolledDocMatch[] }] | null;
  rest: Array<{ issuerId: string; matches: PolledDocMatch[] }>;
} {
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const pair = rivalPairOf(groups[i].issuerId, groups[j].issuerId);
      if (!pair) continue;
      // 쌍에 적힌 순서(예: 미국 → 중국)대로 왼쪽·오른쪽을 정한다
      const first = groups[i].issuerId === pair[0] ? groups[i] : groups[j];
      const second = first === groups[i] ? groups[j] : groups[i];
      return { pair: [first, second], rest: groups.filter((g) => g !== first && g !== second) };
    }
  }
  return { pair: null, rest: [...groups] };
}
