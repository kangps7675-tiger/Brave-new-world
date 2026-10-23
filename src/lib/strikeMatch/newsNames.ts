/**
 * 뉴스에서 "맞은 배의 이름" 뽑기 — UKMTO 는 선명을 거의 공개하지 않지만(자리표시 `.`/MERCHANT/TKR),
 * 해운 전문지·해사 정보사·선주 성명이 몇 시간~하루 뒤에 이름을 내는 경우가 있다.
 *
 * 이 파일은 "이름 후보"만 만든다. 이름이 곧 사실은 아니다:
 *  - 기사가 이전 사건·호송 선박 이름을 같이 쓰는 일이 흔하다
 *  - 그래서 여기서 나온 이름은 AIS 위치 검증(사건 시각에 사건 지점 150km 안)을 통과해야 "확인"에 쓴다 (workers/cron-ingest/src/strikeNames.ts)
 *
 * 규칙은 보수적으로: 선종어 바로 뒤의 대문자 이름 + 피격 동사, 또는 M/V 접두어·따옴표 표기. 애매하면 버린다.
 * 의존성 없음 (Worker·Next·테스트 공통).
 */

import { validImo } from "../../../workers/cron-ingest/src/vesselIdentity";
import { extractShipName } from "./shipName";
import { GENERIC_NAMES, normalizeShipName } from "./scoreCandidates";

export type NewsItem = {
  title: string;
  description: string | null;
  url: string;
  outlet: string | null;
  publishedAt: string | null;
};

export type NamedClaim = {
  /** 기사에 나온 표기 그대로 */
  name: string;
  imo: string | null;
  url: string;
  outlet: string | null;
  headline: string;
  publishedAt: string | null;
};

/** 사건 시각 이후 이 시간까지의 기사만 본다 (그 뒤의 기사는 다른 사건을 섞기 쉽다) */
export const NEWS_WINDOW_AFTER_HOURS = 72;
/** 사건 직전 기사는 거의 없지만, UKMTO 시각 오차를 감안해 약간 허용 */
export const NEWS_WINDOW_BEFORE_HOURS = 6;

const TYPE_WORDS =
  "tanker|vlcc|suezmax|aframax|bulk carrier|bulker|container ship|containership|container vessel|cargo ship|cargo vessel|freighter|lng carrier|lpg carrier|gas carrier|chemical tanker|product tanker|crude tanker|oil tanker|car carrier|ro-ro|vessel|ship";

const STRIKE_WORD = /\b(?:struck|strike|hit|attack(?:ed)?|drone|projectile|missile|explosion|exploded|fire|ablaze|targeted|damaged)\b/i;

/** 사건이 난 해역 키워드 — 사건 place 와 아래 고정 목록 중 하나라도 기사에 있어야 한다 */
const REGION_WORDS =
  /\b(?:hormuz|oman|fujairah|khor fakkan|bukha|musandam|gulf|persian|arabian|red sea|aden|yemen|hodeidah|bab el|black sea|odesa|odessa)\b/i;

const NOT_SHIP_FIRST = new Set([
  "STRAIT", "GULF", "SEA", "OMAN", "IRAN", "IRANIAN", "UAE", "US", "USA", "UK", "ISRAEL", "ISRAELI", "SAUDI",
  "QATAR", "KUWAIT", "IRAQ", "YEMEN", "HOUTHI", "HOUTHIS", "UKMTO", "AMBREY", "NAVY", "COAST", "PORT",
  "HORMUZ", "RED", "BLACK", "ARABIAN", "PERSIAN", "BRITISH", "AMERICAN", "RUSSIAN", "UKRAINIAN", "CHINESE",
  "GREEK", "LIBERIAN", "PANAMANIAN", "MARSHALL", "WESTERN", "EASTERN", "NORTHERN", "SOUTHERN", "ANOTHER",
  "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "MULTIPLE", "SEVERAL", "ALL", "ANY", "NEW", "LATEST", "FIRST",
  "SECOND", "THIRD", "RECENT", "EARLIER", "SAME", "OTHER", "THIS", "THAT", "THESE", "THOSE", "THE", "AN", "A",
]);

const TYPE_NAME_RE = new RegExp(
  `\\b(?:${TYPE_WORDS})\\s+(?:named\\s+|called\\s+)?["“'‘]?([A-Za-z0-9][A-Za-z0-9'’-]*(?:\\s+[A-Za-z0-9][A-Za-z0-9'’-]*){0,3})["”'’]?\\s*(?:\\(\\s*IMO[:\\s#]*(\\d{7})\\s*\\))?\\s*,?\\s*(?:was|were|has been|had been|got|struck|hit|attacked|came under|sustained|caught fire|reported|is|suffered|took)\\b`,
  "i",
);
const IMO_RE = /\bIMO\s*(?:no\.?|number)?\s*[:#]?\s*(\d{7})\b/i;

/** 대문자/숫자로 시작하는 단어만 이름으로 — 첫 소문자 단어에서 자른다 */
function trimToName(raw: string): string | null {
  const words = raw.trim().split(/\s+/);
  const kept: string[] = [];
  for (const w of words) {
    if (!/^[A-Z0-9]/.test(w)) break;
    kept.push(w.replace(/[’']s$/, ""));
  }
  const name = kept.join(" ").replace(/[.,;:]+$/, "").trim();
  if (name.length < 3) return null;
  const first = name.split(" ")[0]!.toUpperCase().replace(/[^A-Z]/g, "");
  if (NOT_SHIP_FIRST.has(first)) return null;
  if (GENERIC_NAMES.has(normalizeShipName(name))) return null;
  return name;
}

/** 기사 한 건 텍스트에서 선명 후보 하나 (없으면 null) */
export function nameFromText(text: string): { name: string; imo: string | null } | null {
  const imoNear = (() => {
    const m = IMO_RE.exec(text);
    return m ? validImo(m[1]) : null;
  })();
  // 1) M/V 접두어·따옴표 표기 (기존 규칙 — 가장 확실)
  const prefixed = extractShipName(text);
  if (prefixed) {
    const n = trimToName(prefixed);
    if (n) return { name: n, imo: imoNear };
  }
  // 2) 선종어 + 이름 + 피격 동사
  const m = TYPE_NAME_RE.exec(text);
  if (m) {
    const n = trimToName(m[1]!);
    if (n) return { name: n, imo: validImo(m[2]) ?? imoNear };
  }
  return null;
}

function inWindow(publishedAt: string | null, incidentAtMs: number): boolean {
  if (!publishedAt) return false;
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return false;
  return t >= incidentAtMs - NEWS_WINDOW_BEFORE_HOURS * 3_600_000 && t <= incidentAtMs + NEWS_WINDOW_AFTER_HOURS * 3_600_000;
}

/**
 * 기사 목록 → 이 사건의 선명 후보.
 * 기사는 피격 단어와 해역 키워드를 함께 가져야 하고, 사건 시각 -6h ~ +72h 안에 나와야 한다.
 */
export function extractNamedClaims(
  items: NewsItem[],
  incident: { atMs: number; place: string | null },
): NamedClaim[] {
  const placeRe = incident.place && incident.place.trim().length >= 4
    ? new RegExp(incident.place.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;
  const out: NamedClaim[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!inWindow(it.publishedAt, incident.atMs)) continue;
    const text = [it.title, it.description ?? ""].filter(Boolean).join(". ");
    if (!STRIKE_WORD.test(text)) continue;
    if (!REGION_WORDS.test(text) && !(placeRe && placeRe.test(text))) continue;
    const c = nameFromText(text);
    if (!c) continue;
    const key = `${normalizeShipName(c.name)}|${it.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: c.name,
      imo: c.imo,
      url: it.url,
      outlet: it.outlet,
      headline: it.title.slice(0, 300),
      publishedAt: it.publishedAt,
    });
  }
  return out;
}

/** 같은 이름(표기 정규화)을 낸 서로 다른 매체 수 */
export function outletsByName(claims: NamedClaim[]): Map<string, { name: string; imo: string | null; outlets: Set<string>; claims: NamedClaim[] }> {
  const m = new Map<string, { name: string; imo: string | null; outlets: Set<string>; claims: NamedClaim[] }>();
  for (const c of claims) {
    const k = normalizeShipName(c.name);
    const cur = m.get(k) ?? { name: c.name, imo: c.imo, outlets: new Set<string>(), claims: [] };
    cur.imo = cur.imo ?? c.imo;
    cur.outlets.add((c.outlet ?? c.url).toLowerCase());
    cur.claims.push(c);
    m.set(k, cur);
  }
  return m;
}

/**
 * 사건별 뉴스 재검색 시점 — 선명은 몇 시간~하루 뒤에 나온다.
 *  첫 검색은 사건 1시간 뒤, 이후 24시간까지 2시간 간격, 그 뒤 72시간까지 12시간 간격. 최대 NEWS_MAX_TRIES 회.
 */
export const NEWS_MAX_TRIES = 20;
export function newsSearchDue(ageHours: number, tries: number, lastTryMs: number | null, nowMs: number): boolean {
  if (ageHours > NEWS_WINDOW_AFTER_HOURS || tries >= NEWS_MAX_TRIES) return false;
  if (tries === 0 || lastTryMs === null) return ageHours >= 1;
  const interval = (ageHours <= 24 ? 2 : 12) * 3_600_000;
  return nowMs - lastTryMs >= interval;
}
