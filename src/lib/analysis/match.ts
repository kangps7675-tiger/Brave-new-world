import { actorsOf, rareTagsOf } from "@/lib/news/eventScenarios";
import type { AnalysisItem } from "@/lib/analysis/feed";

/**
 * 속보에 붙일 싱크탱크 분석 글. 합계 3점 이상일 때만 붙는다(공식 문서 규칙과 같은 방식).
 *  - 같은 기종 이름(Hwasong-20 = HS-20 = 화성-20): 3 — 발사 속보와 그 기종을 다룬 분석이 가장 확실한 짝이다
 *  - 같은 희귀 지명(hormuz·gaza…): 3
 *  - 분석 글의 분류·제목에 속보와 같은 고유 단어: 1개 1점, 2개 이상 2점
 *  - 분석이 다루는 당사자가 속보에도 나옴: 1점
 * 분석은 사건 뒤 며칠에 걸쳐 나오므로 발행일 범위는 속보 45일 전 ~ 14일 후로 넓게 둔다.
 */

const BEFORE_MS = 45 * 86_400_000;
const AFTER_MS = 14 * 86_400_000;
const MIN_SCORE = 3;
const MAX_ITEMS = 3;

/** 사이트가 모든 글에 붙이는 큰 분류. 같은 단어라고 세지 않는다 */
const GENERIC = new Set(
  (
    "wmd military affairs foreign affairs domestic affairs satellite imagery media analysis economy politics " +
    "north korea korea dprk analysis report series part quick take update new first second third latest " +
    "statement meeting visit talks missile missiles nuclear weapons launch launches launched test tests"
  ).split(/\s+/),
);

/** 하이픈 숫자형 기종 이름을 같은 꼴로 맞춘다: "HS-20", "Hwasong 20", "화성-20형" → "hwasong-20" */
export function modelTokensOf(text: string): Set<string> {
  const out = new Set<string>();
  const add = (family: string, num: string) => out.add(`${family}-${num.toLowerCase()}`);
  for (const m of text.matchAll(/\b(hwasong|hs|hwasal|pukguksong|shahab|df|kn)[- ]?(\d{1,3}[a-z]?)\b/gi)) {
    const fam = m[1].toLowerCase();
    add(fam === "hs" ? "hwasong" : fam, m[2]);
  }
  for (const m of text.matchAll(/화성포?[- ]?(\d{1,2})/g)) add("hwasong", m[1]);
  for (const m of text.matchAll(/\b([A-Z][a-z]{3,})[- ](\d{1,3})\b/g)) add(m[1].toLowerCase(), m[2]);
  return out;
}

function termsOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.toLowerCase().matchAll(/[a-z][a-z-]{3,}/g)) if (!GENERIC.has(m[0])) out.add(m[0]);
  return out;
}

export type AnalysisMatch = { item: AnalysisItem; score: number; reasons: { models: string[]; places: string[]; terms: string[]; actor: boolean } };

export function analysisForFlash(text: string, at: number, items: readonly AnalysisItem[]): AnalysisMatch[] {
  if (!text.trim() || items.length === 0) return [];
  const models = modelTokensOf(text);
  const places = new Set(rareTagsOf(text));
  const actors = new Set(actorsOf(text));
  const flashTerms = termsOf(text);
  const out: AnalysisMatch[] = [];
  for (const item of items) {
    const published = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
    if (!Number.isFinite(published) || published < at - BEFORE_MS || published > at + AFTER_MS) continue;
    const itemText = `${item.title}. ${item.tags.join(" ")}. ${item.summary}`;
    const sameModels = [...modelTokensOf(itemText)].filter((t) => models.has(t));
    const samePlaces = rareTagsOf(itemText).filter((t) => places.has(t));
    const actor = actorsOf(itemText).some((a) => actors.has(a));
    const itemTerms = termsOf(`${item.title} ${item.tags.join(" ")}`);
    const sameTerms = [...itemTerms].filter((t) => flashTerms.has(t));

    let score = 0;
    if (sameModels.length > 0) score += 3;
    if (samePlaces.length > 0) score += 3;
    if (actor) score += 1;
    score += Math.min(sameTerms.length, 2);
    if (score < MIN_SCORE) continue;
    out.push({ item, score, reasons: { models: sameModels, places: samePlaces, terms: sameTerms.slice(0, 3), actor } });
  }
  return out.sort((a, b) => b.score - a.score || (b.item.publishedAt ?? "").localeCompare(a.item.publishedAt ?? "")).slice(0, MAX_ITEMS);
}
