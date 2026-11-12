import type { MissileRangeSpec } from "@/data/missileRanges";
import { missileRangeForText } from "@/lib/missileRange";

/**
 * 사거리 표에 없는 기종의 사거리를 뉴스 서술에서 자동으로 뽑는다.
 *  - 한 문장에 "기종 이름"과 "사거리 수치"가 같이 있을 때만 한 건으로 센다(예: "Hwasong-20 … a range of 15,000 km").
 *  - 서로 다른 기사 2건 이상이 비슷한 값(중앙값의 ±25%)을 말할 때만 표에 올린다. 한 기사의 주장만으로는 그리지 않는다.
 *  - 이렇게 만든 값은 공식 표와 구분되도록 `auto`를 달고, 화면에는 "자동 추출·검수 전"으로 표시한다.
 *  - 이미 등록된 기종, 값이 크게 엇갈리는 기종(최대/최소 1.6배 초과), 이름이 흔한 단어인 후보는 제외한다.
 */

export type AutoRangeClaim = { key: string; name: string; km: number; url: string; title: string; at: string | null };

export type AutoRangeSpec = MissileRangeSpec & { auto: { count: number; links: { title: string; url: string }[] } };

/** 전송용: RegExp는 JSON이 안 되므로 소스 문자열로 보낸다 */
export type AutoRangeWire = Omit<AutoRangeSpec, "pattern"> & { patternSource: string };

const NAME_TOKENS: RegExp[] = [
  /\b[A-Z][A-Za-z]{2,}-\d{1,3}[A-Za-z]?\b/g,
  /\b[A-Z]{2,3}-\d{1,3}[A-Za-z]?\b/g,
  /화성포?-?\s?\d{1,2}\s?[형가나다]?/g,
];
const NOT_A_MODEL = new Set(["covid", "mig", "su", "f", "j", "h", "b", "mi", "ka", "tu"]);

const NUM = String.raw`([\d,]+(?:\.\d+)?)`;
const KM = String.raw`\s?(?:km|kilomet(?:er|re)s?|㎞|킬로미터)`;
const HEDGE = String.raw`(?:about|around|approximately|some|roughly|over|nearly|up to|at least|more than)?\s*`;
const RANGE_PATTERNS: RegExp[] = [
  new RegExp(String.raw`\b(?:range|ranges|reach|reaching|travel|traveling|travelling)\s+(?:of\s+|up to\s+|to\s+)?${HEDGE}${NUM}${KM}`, "i"),
  new RegExp(String.raw`${NUM}${KM}[- ]?(?:range|reach)\b`, "i"),
  new RegExp(String.raw`사거리\D{0,6}?(?:약\s*)?${NUM}\s?(?:여\s?)?(?:km|㎞|킬로미터)`),
  new RegExp(String.raw`${NUM}\s?(?:여\s?)?(?:km|㎞|킬로미터)\s?(?:에?\s?달하는\s?)?사거리`),
];

/** "Hwasong 20", "HS-20", "화성포-20형" 같은 표기를 같은 키로 모은다 */
export function modelKey(name: string): string {
  const ko = name.match(/화성포?-?\s?(\d{1,2})/);
  if (ko) return `hwasong-${ko[1]}`;
  const m = name.match(/^([A-Za-z]+)-?(\d{1,3}[A-Za-z]?)$/);
  if (m) return `${m[1].toLowerCase() === "hs" ? "hwasong" : m[1].toLowerCase()}-${m[2].toLowerCase()}`;
  return name.toLowerCase().replace(/\s+/g, "-");
}

function num(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 50 && n <= 20_000 ? n : undefined;
}

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?。])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

/** 기사 한 건에서 "기종 + 사거리" 서술을 뽑는다. 이미 등록된 기종이 읽히는 문장은 건너뛴다. */
export function rangeClaimsFromText(
  text: string,
  meta: { url: string; title: string; at?: string | null },
): AutoRangeClaim[] {
  const out: AutoRangeClaim[] = [];
  for (const s of sentencesOf(text)) {
    if (!/missile|icbm|irbm|srbm|mrbm|slbm|미사일/i.test(s)) continue;
    let km: number | undefined;
    for (const re of RANGE_PATTERNS) {
      km = num(re.exec(s)?.[1]);
      if (km != null) break;
    }
    if (km == null) continue;
    // "Hwasong-15 … range of 13,000 km" 같은 등록 기종 문장은 새 기종 후보가 아니다
    if (missileRangeForText(`launch ${s}`)) continue;
    const names = new Set<string>();
    for (const re of NAME_TOKENS) for (const m of s.matchAll(re)) names.add(m[0].trim().replace(/\s+/g, " "));
    // 문장에 기종이 둘 이상이면 어느 쪽 수치인지 알 수 없어 버린다
    const keys = new Map([...names].map((n) => [modelKey(n), n] as const));
    if (keys.size !== 1) continue;
    const [[key, name]] = [...keys];
    if (NOT_A_MODEL.has(key.split("-")[0])) continue;
    out.push({ key, name, km, url: meta.url, title: meta.title, at: meta.at ?? null });
  }
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function patternSourceFor(name: string): string {
  const key = modelKey(name);
  const m = key.match(/^([a-z]+)-(\d{1,3}[a-z]?)$/);
  if (!m) return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fam = m[1] === "hwasong" ? "(?:hwasong|hs|화성포?)" : m[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String.raw`${fam}[- ]?${m[2]}(?![\d])`;
}

/** 서술들을 기종별로 모아, 서로 다른 기사 2건 이상이 일치하는 값만 표 항목으로 만든다 */
export function autoRangeSpecs(claims: readonly AutoRangeClaim[]): AutoRangeSpec[] {
  const byKey = new Map<string, AutoRangeClaim[]>();
  for (const c of claims) {
    const arr = byKey.get(c.key) ?? [];
    arr.push(c);
    byKey.set(c.key, arr);
  }
  const specs: AutoRangeSpec[] = [];
  for (const [key, list] of byKey) {
    // 같은 기사의 중복은 한 건으로
    const uniq = [...new Map(list.map((c) => [c.url, c])).values()];
    if (uniq.length < 2) continue;
    const med = median(uniq.map((c) => c.km));
    const agree = uniq.filter((c) => c.km >= med * 0.75 && c.km <= med * 1.25);
    if (agree.length < 2) continue;
    const kms = agree.map((c) => c.km);
    const lo = Math.min(...kms);
    const hi = Math.max(...kms);
    if (hi / lo > 1.6) continue;
    const newest = [...agree].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))[0];
    specs.push({
      id: `auto-${key}`,
      name: newest.name,
      country: "unknown",
      rangeKm: [lo, hi],
      note: `뉴스 ${agree.length}건의 서술을 자동 추출(검수 전)`,
      source: { name: `뉴스 ${agree.length}건에서 자동 추출`, url: newest.url },
      pattern: new RegExp(patternSourceFor(newest.name), "i"),
      auto: { count: agree.length, links: agree.slice(0, 3).map((c) => ({ title: c.title, url: c.url })) },
    });
  }
  return specs.sort((a, b) => b.auto.count - a.auto.count);
}

export function toWire(spec: AutoRangeSpec): AutoRangeWire {
  const { pattern, ...rest } = spec;
  return { ...rest, patternSource: pattern.source };
}

export function fromWire(w: AutoRangeWire): AutoRangeSpec {
  const { patternSource, ...rest } = w;
  return { ...rest, pattern: new RegExp(patternSource, "i") };
}

/** 발표문이 낙하·탄착을 서술한 문장을 그대로 꺼낸다. 좌표로 바꾸지 않는다(글에 좌표가 없으므로) */
const IMPACT = /\b(landed|fell|splashed|splashdown|impact(?:ed)?|EEZ|exclusive economic zone|crashed into)\b|탄착|낙하|떨어졌|EEZ|배타적경제수역/i;
export function impactClaimsOf(text: string): string[] {
  return sentencesOf(text)
    .filter((s) => IMPACT.test(s) && /missile|launch|fired|ballistic|미사일|발사/i.test(`${text}`))
    .map((s) => s.slice(0, 180))
    .slice(0, 2);
}
