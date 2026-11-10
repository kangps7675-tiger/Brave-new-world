/**
 * 예민한 지역의 "정세 변화" 속보: 외교 움직임(협상·휴전·정상회담·제재·대사 소환)과
 * 상호 공격적 언사(경고·위협·최후통첩·보복 선언). 평화든 질서 재편이든 방향은 가리지 않는다.
 * 드론·미사일이 실제로 떨어진 속보(confirmedStrike)는 여기서 제외 — 타격 쪽이 맡는다.
 * 훈련, 체포·기소, 수역 폐쇄·항의는 외교나 전선과 합치지 않고 각자 칸이다.
 */

import { liveuaConfirmedStrike } from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

export type PostureKind = "diplomacy" | "rhetoric" | "exercise" | "charge" | "closure";
export type RegionalPosture = { kind: PostureKind; evidence: string[] };

type Input = Pick<LiveuamapEvent, "title" | "body" | "titleKo" | "bodyKo" | "tags" | "lat" | "lng">;

const DIPLOMACY_RE =
  /\b(?:peace talks?|negotiat\w+|ceasefire|cease-fire|truce|summit|treaty|armistice|normali[sz]ation|diplomatic|envoy|ambassador|summon(?:s|ed)?|expel(?:s|led)?|sever(?:s|ed)? (?:ties|relations)|sanctions?|talks (?:in|with|between)|agreement|annex(?:es|ed|ation)?|recogni[sz]es?|alliance|defen[cs]e (?:pact|cooperation)|military cooperation|arms (?:transfer|shipment|supply|deal)|weapons? (?:transfer|shipment|supply|deal)|artillery shells|ammunition|troops? (?:to|in) russia|withdraw(?:s|n|al)? (?:troops|forces))\b|협상|휴전|정전|정상회담|회담|조약|협정|국교|수교|단교|대사|소환|추방|제재|동맹|합병|병합|철군|외교|국방\s*협력|군사\s*협력|무기\s*(?:지원|제공|이전)|포탄|파병/i;

const RHETORIC_RE =
  /\b(?:warns?|warned|warning|threat(?:en|ens|ened|s)?|vows?|vowed|ultimatum|red line|will (?:respond|retaliate|answer|pay)|retaliat\w+|declares? war|nuclear (?:threat|option|weapons?)|"?destroy"?|annihilat\w+|will not tolerate|crushing (?:response|blow))\b|경고|위협|최후통첩|레드라인|보복|응징|선전포고|핵\s*(?:위협|사용)|용납하지|궤멸|초토화/i;

/** 훈련은 그 자체로 사건이다. 루머·미확인만 버린다. */
const EXERCISE_RE = /\b(?:drills?|exercises?|war games|wargames|live-fire)\b|훈련/i;
const CHARGE_RE =
  /\b(?:arrested|indict(?:ed|ment)|espionage|industrial spy|charged with)\b|체포|구속|기소|산업\s*스파이|산업\s*첩보|산업간첩/i;
const CLOSURE_RE =
  /\b(?:closes?|closed|closing)\b.{0,40}\b(?:airspace|waters?|strait|sea|zone)\b|\b(?:exclusion zone|no-fly|no-sail)\b|\b(?:protests|protested|formal protest|diplomatic protest)\b|\blodg\w* (?:a )?protest\b|수역\s*폐쇄|영공\s*폐쇄|항행\s*금지|항의|규탄/i;
const RUMOR_RE = /\b(?:rumou?rs?|unconfirmed|alleged|opinion)\b|루머|미확인|추정/i;

function collect(re: RegExp, text: string): string[] {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  const out = new Set<string>();
  for (const m of text.matchAll(g)) {
    if (m[0]) out.add(m[0]);
    if (out.size >= 4) break;
  }
  return [...out];
}

export function classifyRegionalPosture(event: Input): RegionalPosture | null {
  if (liveuaConfirmedStrike(event)) return null;
  const text = [event.title, event.body, event.titleKo, event.bodyKo]
    .filter((p) => typeof p === "string" && p.trim())
    .join("\n");
  if (!text) return null;
  const title = `${event.title}\n${event.titleKo ?? ""}`;
  if (CHARGE_RE.test(title)) return { kind: "charge", evidence: collect(CHARGE_RE, title) };
  if (CLOSURE_RE.test(title) && !RUMOR_RE.test(title)) return { kind: "closure", evidence: collect(CLOSURE_RE, title) };
  if (EXERCISE_RE.test(title) && !RUMOR_RE.test(title)) return { kind: "exercise", evidence: collect(EXERCISE_RE, title) };
  if (RUMOR_RE.test(text) || EXERCISE_RE.test(text)) return null;
  const dip = collect(DIPLOMACY_RE, text);
  const rhe = collect(RHETORIC_RE, text);
  if (dip.length === 0 && rhe.length === 0) return null;
  // 한 단어만 걸린 평범한 문장은 거른다: 외교는 1개도 충분(협상·휴전 등 명시어), 언사는 주체가 있어야 하므로 1개 허용하되 제목에 있어야 한다
  if (dip.length > 0) return { kind: "diplomacy", evidence: dip };
  const inTitle = RHETORIC_RE.test(`${event.title}\n${event.titleKo ?? ""}`);
  return inTitle ? { kind: "rhetoric", evidence: rhe } : null;
}
