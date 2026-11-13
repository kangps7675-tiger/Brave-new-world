import { ACTOR_OF_ISSUER } from "@/lib/officialDocs/match";
import { actorsOf, rareTagsOf } from "@/lib/news/eventScenarios";
import { topicsOf } from "@/lib/officialDocs/federalRegister";
import { issuerNameEn, issuerNameKo } from "@/lib/countryName";
import type { PolledDoc } from "@/lib/officialDocs/matchPolled";

/**
 * 외교·협상 "가닥" — 거시 사건을 사람이 만든 의제 목록 없이 자동으로 묶는다.
 *
 * 한 가닥 = 같은 당사자들이, 같은 주제(희귀 지명·주제 태그)로, 며칠 간격 안에 이어서 낸 공식 문서들.
 * 나라를 두 곳으로 못 박지 않고, 문서를 낸 나라와 글에 이름이 나온 나라를 모두 한 가닥에 담는다.
 * 그 나라가 직접 당사자인지 제3자(중재·주선·논평)인지는 자동으로 가를 수 없어 단정하지 않고,
 * 직접 발표했는지·남의 발표에 이름이 나왔는지·중재 표현 가까이에 나왔는지만 센다.
 *
 * 자동 묶음이라 가끔 엉뚱한 문서가 섞인다. 화면에는 "자동으로 묶음 · 검수 전"이라고 밝히고,
 * 어느 쪽 말이 맞는지는 가리지 않는다.
 */

export type DiplomacyThread = {
  id: string;
  /** 가닥의 당사자(많이 나온 순). 속보 글에서 읽히는 id: iran·us·russia… */
  actors: string[];
  /** 이 가닥에서 실제로 문서를 낸 곳(issuer id) */
  issuerIds: string[];
  /** 이름이 나왔고 공식 문서를 모으는 나라인데 이 가닥에서는 아무 문서도 내지 않은 쪽 */
  silent: string[];
  /**
   * 나라별 등장 방식. 당사자인지 제3자인지는 자동으로 못 가르므로 단정하지 않고 "어떻게 나왔는지"만 센다.
   * spoke = 이 나라가 직접 낸 문서 수, named = 다른 나라 문서에 이름이 나온 수, mediation = 중재·주선 표현 근처에 나온 수
   */
  roles: Record<string, { spoke: number; named: number; mediation: number }>;
  /** 중재·주선 표현 근처에 이름이 나온 나라(가닥 당사자 목록에 없는 제3국 포함). key = 당사자 id 또는 ISO 코드 */
  mediators: Array<{ key: string; count: number }>;
  tags: string[];
  topics: string[];
  /** 오래된 것부터 */
  docs: PolledDoc[];
  firstAt: string;
  lastAt: string;
};

/** 외교·협상·제재·합의 같은 말이 걸리는 글만 가닥 후보로 삼는다(그냥 행정 고시·인사 발표는 제외) */
const DIPLOMACY =
  /\b(talks?|negotiat\w*|summit|ceasefire|cease-fire|truce|diplomati\w*|bilateral|trilateral|mediat\w*|envoy|dialogue|agreement|accord|treaty|sanctions?|embargo|ultimatum|de-?escalat\w*|peace|normaliz\w*|met with|meeting with|phone call|telephone conversation|call with)\b|회담|협상|정상회담|휴전|제재|합의|조약|중재|대화|통화|면담/i;

/** 중재·주선·개최 표현 — 이 말 가까이에 이름이 나온 나라는 당사자가 아니라 제3자일 수 있다 */
const MEDIATION = /mediat\w*|brokered|broker(?:ing)?\b|facilitat\w*|good offices|\bhost(?:ed|ing|s)\b|중재|주선|개최/gi;

let countryRes: Array<[string, RegExp]> | null = null;
function countries(): Array<[string, RegExp]> {
  if (countryRes) return countryRes;
  const out: Array<[string, RegExp]> = [];
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const name = dn.of(code);
        if (!name || name === code || name.length < 4 || /\b(and|of the)\b/.test(name)) continue;
        out.push([code.toLowerCase(), new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)]);
      }
    }
  } catch {
    /* Intl 미지원이면 제3국 탐지는 건너뛴다 */
  }
  countryRes = out;
  return out;
}

/** 나라 코드(ISO)를 가닥의 당사자 id로 맞춘다(us→us, ru→russia …). 없으면 코드 그대로 */
function normalizeCountry(code: string): string {
  return ACTOR_OF_ISSUER[code] ?? code;
}

/**
 * 중재·주선 표현에 붙어 나온 나라. "mediated by Oman"처럼 표현 뒤에 by·through·via·from이 오면 그 뒤 30자,
 * "Oman mediation"처럼 표현 바로 앞(18자)에 나온 이름만 본다. 같은 문장에 그냥 함께 나온 협상 당사국은 세지 않는다.
 */
export function mediationCountriesOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(MEDIATION)) {
    const i = m.index ?? 0;
    const end = i + m[0].length;
    // 표현 바로 앞에 붙은 이름: "Oman mediation", "Oman-brokered" (이름이 끝나는 자리가 표현 시작 직전이어야 한다)
    const before = text.slice(Math.max(0, i - 24), i);
    for (const [code, re] of countries()) {
      if (new RegExp(`(?:${re.source})[\\s-]*$`).test(before)) out.add(normalizeCountry(code));
    }
    // 표현 뒤 by·through·via·from 다음의 이름: "mediated by Oman"
    const after = text.slice(end, end + 36);
    const lead = /^\W*(?:by|through|via|from)\b/i.exec(after);
    if (lead) {
      const tail = after.slice(lead[0].length, lead[0].length + 30);
      for (const [code, re] of countries()) if (re.test(tail)) out.add(normalizeCountry(code));
    }
  }
  return out;
}

const GAP_MS = 5 * 86_400_000;
const WINDOW_MS = 14 * 86_400_000;
const MAX_DOCS_PER_THREAD = 12;

const ISSUER_OF_ACTOR: Record<string, string> = Object.fromEntries(Object.entries(ACTOR_OF_ISSUER).map(([issuer, actor]) => [actor, issuer]));

function dayMs(d: string | null): number | null {
  if (!d) return null;
  const t = Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

type Item = { doc: PolledDoc; at: number; mediators: Set<string>; actors: Set<string>; tags: Set<string>; topics: Set<string>; marks: Set<string> };

function itemOf(doc: PolledDoc, now: number): Item | null {
  const at = dayMs(doc.publishedAt);
  if (at == null || now - at > WINDOW_MS || at - now > 3 * 86_400_000) return null;
  const text = `${doc.title} ${doc.summary}`;
  if (!DIPLOMACY.test(text)) return null;
  const actors = new Set(actorsOf(text));
  const self = ACTOR_OF_ISSUER[doc.issuerId];
  if (self) actors.add(self);
  // 문서를 낸 나라 하나만 나오는 글(자국 일정·내부 발표)은 가닥이 아니다
  if (actors.size < 2) return null;
  const tags = new Set<string>([...rareTagsOf(text), ...doc.tags.split(",").map((t) => t.trim()).filter(Boolean)]);
  const topics = new Set<string>(topicsOf(doc.title, doc.summary).filter((t) => t !== "geopolitics"));
  return { doc, at, mediators: mediationCountriesOf(text), actors, tags, topics, marks: new Set<string>([...tags, ...topics]) };
}

function shared<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function linked(a: Item, b: Item): boolean {
  if (Math.abs(a.at - b.at) > GAP_MS) return false;
  const common = shared(a.actors, b.actors);
  if (common >= 2) return true;
  return common >= 1 && shared(a.marks, b.marks) >= 1;
}

export function buildDiplomacyThreads(docs: readonly PolledDoc[], now: number = Date.now(), minDocs = 1): DiplomacyThread[] {
  const items = docs.map((d) => itemOf(d, now)).filter((x): x is Item => x != null);
  items.sort((a, b) => a.at - b.at);

  // union-find
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].at - items[i].at > GAP_MS) break;
      if (linked(items[i], items[j])) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, Item[]>();
  items.forEach((it, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), it]);
  });

  const threads: DiplomacyThread[] = [];
  for (const group of groups.values()) {
    if (group.length < minDocs) continue;
    const kept = group.slice(-MAX_DOCS_PER_THREAD);
    const actorCount = new Map<string, number>();
    const tagCount = new Map<string, number>();
    const topicCount = new Map<string, number>();
    for (const it of kept) {
      for (const a of it.actors) actorCount.set(a, (actorCount.get(a) ?? 0) + 1);
      for (const t of it.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      for (const t of it.topics) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
    }
    const byCount = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const ranked = [...actorCount.entries()].sort((a, b) => b[1] - a[1]);
    // 한 번 스친 나라까지 당사자로 올리지 않는다: 문서가 여럿이면 2건 이상 나온 나라만
    const actors = ranked.filter(([, n]) => kept.length < 3 || n >= 2).map(([a]) => a).slice(0, 4);
    const issuerIds = [...new Set(kept.map((it) => it.doc.issuerId))];
    const silent = actors.filter((a) => {
      const issuer = ISSUER_OF_ACTOR[a];
      return issuer != null && !issuerIds.includes(issuer);
    });
    const roles: DiplomacyThread["roles"] = {};
    const mediatorCount = new Map<string, number>();
    for (const a of actors) {
      const issuer = ISSUER_OF_ACTOR[a];
      roles[a] = {
        spoke: issuer ? kept.filter((it) => it.doc.issuerId === issuer).length : 0,
        named: kept.filter((it) => it.actors.has(a) && (!issuer || it.doc.issuerId !== issuer)).length,
        mediation: kept.filter((it) => it.mediators.has(a)).length,
      };
    }
    for (const it of kept) for (const m of it.mediators) mediatorCount.set(m, (mediatorCount.get(m) ?? 0) + 1);
    const mediators = [...mediatorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key, count]) => ({ key, count }));
    const docsOrdered = kept.map((it) => it.doc);
    threads.push({
      id: kept.map((it) => it.doc.id).sort()[0],
      actors,
      issuerIds,
      silent,
      roles,
      mediators,
      tags: byCount(tagCount).slice(0, 3),
      topics: byCount(topicCount).slice(0, 3),
      docs: docsOrdered,
      firstAt: kept[0].doc.publishedAt ?? "",
      lastAt: kept[kept.length - 1].doc.publishedAt ?? "",
    });
  }
  // 최근에 움직인 가닥, 그다음 서로 다른 쪽이 말한 가닥이 위로
  return threads.sort((a, b) => b.lastAt.localeCompare(a.lastAt) || b.issuerIds.length - a.issuerIds.length || b.docs.length - a.docs.length);
}

const EXTRA_ACTOR_NAME: Record<string, { ko: string; en: string }> = {
  houthi: { ko: "후티", en: "Houthis" },
  hezbollah: { ko: "헤즈볼라", en: "Hezbollah" },
};

/** 당사자 id(iran·us…)의 화면 이름 */
export function actorLabel(actor: string, en: boolean): string {
  const extra = EXTRA_ACTOR_NAME[actor];
  if (extra) return en ? extra.en : extra.ko;
  const issuer = ISSUER_OF_ACTOR[actor];
  if (issuer) return en ? issuerNameEn(issuer) : issuerNameKo(issuer);
  // 당사자 id가 아닌 ISO 국가 코드(om·qa…)
  if (/^[a-z]{2}$/.test(actor)) return en ? issuerNameEn(actor) : issuerNameKo(actor);
  return actor;
}
