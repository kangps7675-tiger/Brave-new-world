/**
 * 한 사건에 대해, RSS가 실제로 말한 갈래만 최대 네 개.
 * 제목을 고치지 않는다. 추측·전망 문장은 갈래가 아니다.
 * 당사자 매체(tier 3)는 그 나라의 이니셔티브(성명)이지, 실행의 확인이 아니다.
 */
import { decodeHtmlEntities } from "@/lib/htmlEntities";
import type { NewsStreamItem } from "@/lib/news/types";

export type ScenarioPath = "talks" | "force" | "pause" | "sanction";

export type EventScenario = {
  path: ScenarioPath;
  title: string;
  url: string;
  source: string;
  /** initiative = 당사자 매체가 한 말. reported = 다른 매체가 전한 말 또는 경과. */
  stance: "initiative" | "reported";
  /** 제목 앞머리에서 화자로 읽힌 나라. 없으면 null. */
  actorKo: string | null;
  actorEn: string | null;
};

export type EventScenarioBoard = {
  eventTitle: string;
  eventUrl: string;
  eventSource: string;
  scenarios: EventScenario[];
};

const WINDOW_MS = 72 * 3_600_000;
const MAX_SCENARIOS = 4;

const HEDGE =
  /\b(could|might|may|risks?|fears?|analysts?|experts?|scenario|what\s+if|potentially|likely\s+to|warns?)\b|우려|가능성|전망|관측|경고/i;

const SPEECH =
  /\b(says?|said|announces?|announced|orders?|ordered|vows?|vowed|pledges?|pledged|proposes?|proposed|offers?|offered|rejects?|rejected|declares?|declared|imposes?|imposed|approves?|approved|agrees?|agreed|signs?|signed|begins?|began|launches?|launched)\b|밝혔다|발표|제의|거부|서명|합의|착수|발동/;

const PATHS: Array<{ path: ScenarioPath; re: RegExp }> = [
  { path: "pause", re: /\b(ceasefire|truce|pause|halt|withdraw|de-?escalat)\b|휴전|중단|철수/i },
  { path: "talks", re: /\b(talks?|negotiat\w*|summit|diplomacy|diplomatic)\b|회담|협상/i },
  { path: "sanction", re: /\b(sanctions?|embargo|blockade|interdict)\b|제재|봉쇄|금수/i },
  { path: "force", re: /\b(retaliat\w*|strike\s+back|offensive|mobilis\w*|mobiliz\w*)\b|보복|반격|동원/i },
];

/** 희귀 지명 하나면 같은 사건. 나라 이름만으로는 묶지 않는다. */
const RARE: Array<[RegExp, string]> = [
  [/strait of hormuz|\bhormuz\b|호르무즈|ホルムズ|霍尔木兹|霍爾木茲|Ормуз|Гормуз|Хормуз|هرمز/i, "hormuz"],
  [/red sea|홍해|紅海|红海|Красное море|Красного моря|Червоне море|البحر الأحمر/i, "red-sea"],
  [/bab[\s-]?el[\s-]?mandeb|바브엘만데브|バブ・?エル・?マンデブ|曼德海峡|Баб-эль-Мандеб|باب المندب/i, "bab"],
  [/zaporizhzhia|자포리자|ザポリージャ|扎波罗热|Запорож|Запоріж/i, "zaporizhzhia"],
  [/\bkharkiv\b|하르키우|ハルキウ|ハリコフ|哈尔科夫|Харків|Харьк|Харк/i, "kharkiv"],
  [/\bdonbas\b|돈바스|ドンバス|顿巴斯|Донбас/i, "donbas"],
  [/\bbakhmut\b|바흐무트|バフムト|巴赫穆特|Бахмут/i, "bakhmut"],
  [/\bkherson\b|헤르손|ヘルソン|赫尔松|Херсон/i, "kherson"],
  [/\brafah\b|라파|ラファ|拉法|Рафах/i, "rafah"],
  [/\bgaza\b|가자|ガザ|加沙|сектор[а-я]* газа|غزة/i, "gaza"],
  [/taiwan strait|대만해협|台湾海峡|台灣海峽|Тайваньск[а-я]* пролив/i, "taiwan-strait"],
  [/\bkinmen\b|진먼|金門|金门/i, "kinmen"],
  [/\bdmz\b|판문점|비무장지대|非武装地帯|非军事区|非軍事區/i, "dmz"],
];

const ACTORS: Array<[RegExp, string]> = [
  [/\biran\b|\btehran\b|이란|테헤란/i, "iran"],
  [/\bisrael\b|이스라엘/i, "israel"],
  [/\brussia\b|\bmoscow\b|\bkremlin\b|러시아|모스크바/i, "russia"],
  [/\bukraine\b|\bkyiv\b|\bkiev\b|우크라이/i, "ukraine"],
  [/\bchina\b|\bbeijing\b|중국|베이징/i, "china"],
  [/\btaiwan\b|대만/i, "taiwan"],
  [/north korea|\bdprk\b|\bpyongyang\b|북한|평양/i, "dprk"],
  [/south korea|\bseoul\b|한국|서울/i, "rok"],
  [/united states|\bu\.?s\.?\b|\bamerica\b|\bwashington\b|미국|워싱턴/i, "us"],
  [/\bnato\b|나토/i, "nato"],
  [/houthis?|후티/i, "houthi"],
  [/hezbollah|헤즈볼라/i, "hezbollah"],
];

const SPEAKERS: Array<[RegExp, string, string]> = [
  [/\b(iran|tehran)\b|이란|테헤란/i, "Iran", "이란"],
  [/\bisrael\b|이스라엘/i, "Israel", "이스라엘"],
  [/\b(russia|moscow|kremlin)\b|러시아|모스크바/i, "Russia", "러시아"],
  [/\b(ukraine|kyiv|kiev)\b|우크라이/i, "Ukraine", "우크라이나"],
  [/\b(china|beijing)\b|중국|베이징/i, "China", "중국"],
  [/\btaiwan\b|대만/i, "Taiwan", "대만"],
  [/north korea|\bdprk\b|\bpyongyang\b|북한|평양/i, "North Korea", "북한"],
  [/south korea|\bseoul\b|한국|서울/i, "South Korea", "한국"],
  [/united states|\bu\.?s\.?\b|\bwashington\b|미국|워싱턴/i, "United States", "미국"],
  [/\bnato\b|나토/i, "NATO", "나토"],
  [/houthis?|후티/i, "Houthis", "후티"],
  [/hezbollah|헤즈볼라/i, "Hezbollah", "헤즈볼라"],
];

const ACTIONS: Array<[RegExp, string]> = [
  [/\b(strike|airstrike|missile|drone|attack|shell)\b|공습|미사일|피격|공격|포격/i, "strike"],
  [/\b(talks?|negotiat\w*|summit|ceasefire|truce)\b|회담|협상|휴전/i, "talks"],
  [/\b(sanctions?|embargo|blockade)\b|제재|봉쇄/i, "sanction"],
  [/\b(ship|tanker|vessel|seized|boarded)\b|선박|유조선|나포/i, "ship"],
];

type Mark = { rare: Set<string>; actors: Set<string>; actions: Set<string> };

function mark(title: string): Mark {
  const rare = new Set<string>();
  const actors = new Set<string>();
  const actions = new Set<string>();
  for (const [re, id] of RARE) if (re.test(title)) rare.add(id);
  for (const [re, id] of ACTORS) if (re.test(title)) actors.add(id);
  for (const [re, id] of ACTIONS) if (re.test(title)) actions.add(id);
  return { rare, actors, actions };
}

function sameEvent(a: Mark, b: Mark): boolean {
  for (const id of a.rare) if (b.rare.has(id)) return true;
  for (const actor of a.actors) {
    if (!b.actors.has(actor)) continue;
    for (const action of a.actions) if (b.actions.has(action)) return true;
  }
  return false;
}

/** 두 글이 같은 사건을 말하는지(희귀 지명 하나, 또는 같은 나라+같은 행동). 속보와 기사·문서를 잇는 데 쓴다. */
export function sameEventText(a: string, b: string): boolean {
  return sameEvent(mark(a), mark(b));
}

/** 글에서 읽힌 당사자 id(iran, russia, us…). 두 나라가 함께 나온 글을 양국 문서와 잇는 데 쓴다. */
export function actorsOf(text: string): string[] {
  return Array.from(mark(text).actors);
}

/** 글에서 읽힌 희귀 지명 태그(RARE의 id). 문서의 relatedTags와 맞대는 데 쓴다. */
export function rareTagsOf(text: string): string[] {
  return Array.from(mark(text).rare);
}

function pathOf(title: string): ScenarioPath | null {
  if (HEDGE.test(title) || !SPEECH.test(title)) return null;
  for (const row of PATHS) if (row.re.test(title)) return row.path;
  return null;
}

function speakerOf(title: string): { en: string; ko: string } | null {
  const said = title.match(
    /^(.{0,48}?)\b(says?|said|announces?|announced|orders?|ordered|vows?|vowed|pledges?|pledged|proposes?|proposed|rejects?|rejected|declares?|declared)\b/i,
  );
  if (!said) return null;
  for (const [re, en, ko] of SPEAKERS) if (re.test(said[1])) return { en, ko };
  return null;
}

function httpUrl(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

type Row = NewsStreamItem & { at: number; tags: Mark };

function rowsOf(items: NewsStreamItem[]): Row[] {
  const out: Row[] = [];
  for (const item of items) {
    if (!item.title?.trim() || !httpUrl(item.link)) continue;
    if (item.feedTopic === "economy" && !/\b(sanction|embargo|blockade)\b|제재|봉쇄/i.test(item.title)) continue;
    const at = Date.parse(item.pubDate);
    if (!Number.isFinite(at)) continue;
    out.push({ ...item, at, tags: mark(item.title) });
  }
  return out;
}

/**
 * 갈래가 가장 많이 갈리는 사건 하나. 넷을 채우려고 다른 사건을 섞지 않는다.
 * 갈래가 없으면 null.
 */
export function buildEventScenarioBoard(items: NewsStreamItem[], now = Date.now()): EventScenarioBoard | null {
  const rows = rowsOf(items).filter((row) => now - row.at <= WINDOW_MS && row.at <= now + 3_600_000);
  if (rows.length < 2) return null;

  const distinctCount = (peers: Row[]) =>
    new Set(peers.map((row) => `${pathOf(row.title)}:${speakerOf(row.title)?.en ?? row.source}`)).size;

  let best: { anchor: Row; peers: Row[] } | null = null;
  for (const anchor of rows) {
    if (anchor.trustTier > 2) continue;
    if (anchor.tags.rare.size === 0 && anchor.tags.actions.size === 0) continue;
    const peers = rows.filter(
      (row) =>
        row.link !== anchor.link &&
        Math.abs(row.at - anchor.at) <= WINDOW_MS &&
        sameEvent(anchor.tags, row.tags) &&
        pathOf(row.title) != null,
    );
    if (peers.length === 0) continue;
    if (!best) {
      best = { anchor, peers };
      continue;
    }
    const branch = pathOf(anchor.title) != null;
    const bestBranch = pathOf(best.anchor.title) != null;
    const distinct = distinctCount(peers);
    const bestDistinct = distinctCount(best.peers);
    const richer = distinct > bestDistinct || (distinct === bestDistinct && anchor.at > best.anchor.at);
    if (branch !== bestBranch ? !branch : richer) best = { anchor, peers };
  }
  if (!best) return null;

  const picked: EventScenario[] = [];
  const seen = new Set<string>();
  const ordered = [...best.peers].sort((a, b) => {
    if (a.trustTier === 3 && b.trustTier !== 3) return -1;
    if (b.trustTier === 3 && a.trustTier !== 3) return 1;
    return b.at - a.at;
  });
  for (const row of ordered) {
    const path = pathOf(row.title);
    if (!path) continue;
    const who = speakerOf(row.title);
    const key = `${path}:${who?.en ?? row.source.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push({
      path,
      title: decodeHtmlEntities(row.title).trim(),
      url: row.link,
      source: (row.publisher || row.source).trim(),
      stance: row.trustTier === 3 ? "initiative" : "reported",
      actorKo: who?.ko ?? null,
      actorEn: who?.en ?? null,
    });
    if (picked.length >= MAX_SCENARIOS) break;
  }
  if (picked.length === 0) return null;

  return {
    eventTitle: decodeHtmlEntities(best.anchor.title).trim(),
    eventUrl: best.anchor.link,
    eventSource: (best.anchor.publisher || best.anchor.source).trim(),
    scenarios: picked,
  };
}
