/**
 * 라이브유어맵 속보 중, 드론·미사일이 실제로 어딘가에 떨어진 경우만 고른다.
 * 발사, 요격, 격추, 경보, 훈련, 시험발사, 미확인 언급은 타격으로 치지 않는다.
 */

import type { LiveuamapEvent } from "@/lib/liveuamap/types";

export type LiveuaStrikeKind = "drone" | "missile";

export type LiveuaConfirmedStrike = {
  kind: LiveuaStrikeKind;
};

type StrikeText = Pick<
  LiveuamapEvent,
  "title" | "body" | "titleKo" | "bodyKo" | "tags" | "lat" | "lng"
>;

const DRONE_RE =
  /\b(?:drones?|uavs?|shaheds?|gerans?|loitering munitions?)\b|드론|무인기|자폭|샤헤드|게란/i;

const MISSILE_RE =
  /\b(?:missiles?|ballistic|cruise missiles?|iskanders?|kalibrs?|kinzhals?)\b|미사일|탄도탄|탄도미사일|순항미사일|이스칸데르|칼리브르|킨잘/i;

/** 맞은 사실이 문장에 있다. */
const STRONG_IMPACT_RE =
  /\b(?:struck|strikes|slammed into|impacted|destroyed|damaged|set (?:ablaze|on fire)|(?:exploded|explosion|explosions|blast|blasts) (?:in|at|on|over))\b|\bhits?\b|타격|피격|명중|피폭|파괴|파손|폭발|불타|화재/i;

/** 요격·격추 문장과 겹쳐도 지상 타격으로 남길 표현. 공중 폭발만으로는 넘기지 않는다. */
const GROUND_HIT_RE =
  /\b(?:struck|strikes|slammed into|impacted|destroyed|damaged|set (?:ablaze|on fire))\b|\bhits?\b|타격|피격|명중|파괴|파손|불타|화재/i;

/** 공격 표현. 요격·미확인·경보가 같이 있으면 이것만으로는 통과하지 않는다. */
const WEAK_IMPACT_RE =
  /\b(?:attack(?:s|ed)? (?:on|in)|strike on|airstrike on|drone attack|missile attack|uav attack)\b|드론\s*공격|무인기\s*공격|미사일\s*공격|미사일\s*피격|공습/i;

/** 맞았다는 뜻으로 읽으면 안 되는 문맥. 지상 타격 단어가 있으면 넘긴다. */
const SOFT_VETO_RE =
  /\b(?:intercept(?:ed|s|ion)?|shot down|downed|repelled|thwarted|foiled|neutrali[sz]ed|threatens?|warning of|prepares? to|plans? to|will (?:strike|launch|attack)|sirens?|air[- ]raid alert)\b|요격|격추|격퇴|저지|무력화|예고|위협|공습\s*경보|사이렌/i;

/** 훈련·시험·빗나감·미확인은 타격 단어가 있어도 표시하지 않는다. */
const HARD_VETO_RE =
  /\b(?:missed|did not hit|didn't hit|failed to (?:hit|reach)|no impact|exercises?|drills?|test[- ]?fir(?:e|ing)|test launch|unconfirmed|possible|alleged)\b|빗나|군사\s*훈련|훈련\s*중|시험\s*발사|미확인|추정|가능성/i;

const CONFIRMED_WORD_RE = /\b(?:confirmed|confirmation)\b|확인됐|확인된|확인됨/i;

function hasMissile(text: string): boolean {
  const offensive = text.replace(
    /\bmissile defen[cs]e\b|방공\s*미사일|미사일\s*방어|요격\s*미사일/gi,
    " ",
  );
  return MISSILE_RE.test(offensive);
}

function strikeBlob(event: StrikeText): string {
  return [event.title, event.body, event.titleKo, event.bodyKo, ...(event.tags ?? [])]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n");
}

function hasStrikePoint(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * 보병·기갑·경장갑이 그 자리를 공격한 경우.
 * 유류 탱크, 포격만, 드론·미사일 타격은 여기 넣지 않는다.
 */
const GROUND_ARM_RE =
  /\b(?:infantry|infantrymen|riflemen|foot soldiers|mechanized infantry|mechanised infantry|armou?red (?:vehicles?|column|forces|troops|assault|group|unit|personnel)|light armou?r(?:ed)?|apcs?|ifvs?|bmps?|btrs?|bmds?|bradleys?|marders?)\b|(?<!(?:oil|fuel|storage|water|gas|propane)\s)\btanks?\b|보병|기갑|전차|장갑차|경장갑|기계화보병|보병전투/i;

const GROUND_IMPACT_RE =
  /\b(?:attack(?:s|ed|ing)?|assault(?:s|ed|ing)?|stormed|entered|seized|captured|overran|pushed into|advanced into|broke into)\b|공격|돌격|진입|점령|진격|투입|탈환|돌파/i;

/** 아직 안 일어난 공격. 이미 공격한 동사가 있으면 넘긴다. */
const GROUND_FUTURE_RE =
  /\b(?:will (?:attack|assault|storm)|prepares? to|plans? to|threatens?)\b|예고/i;

const GROUND_DONE_RE =
  /\b(?:attacked|assaulted|stormed|entered|seized|captured|overran|attack on|assault on)\b|공격했|돌격|진입|점령|진격|투입|탈환|돌파/i;

export type LiveuaGroundAssault = {
  kind: "ground";
};

/** 좌표가 있고, 드론 또는 미사일이 그 지점을 때린 속보일 때만 종류를 반환한다. */
export function liveuaConfirmedStrike(event: StrikeText): LiveuaConfirmedStrike | null {
  if (!hasStrikePoint(event.lat, event.lng)) return null;
  const text = strikeBlob(event);
  if (!text.trim()) return null;

  const drone = DRONE_RE.test(text);
  const missile = hasMissile(text);
  if (!drone && !missile) return null;

  const strong = STRONG_IMPACT_RE.test(text);
  const weak = WEAK_IMPACT_RE.test(text);
  if (!strong && !weak) return null;
  if (HARD_VETO_RE.test(text) && !CONFIRMED_WORD_RE.test(text)) return null;
  if (SOFT_VETO_RE.test(text) && !GROUND_HIT_RE.test(text)) return null;

  return { kind: missile ? "missile" : "drone" };
}

/** 지상군이 공격한 좌표. 드론·미사일 타격이 잡히면 그쪽 표시에 맡긴다. */
export function liveuaGroundAssault(event: StrikeText): LiveuaGroundAssault | null {
  if (!hasStrikePoint(event.lat, event.lng)) return null;
  if (liveuaConfirmedStrike(event)) return null;
  const text = strikeBlob(event);
  if (!text.trim()) return null;
  if (!GROUND_ARM_RE.test(text) || !GROUND_IMPACT_RE.test(text)) return null;
  if (HARD_VETO_RE.test(text) && !CONFIRMED_WORD_RE.test(text)) return null;
  if (GROUND_FUTURE_RE.test(text) && !GROUND_DONE_RE.test(text)) return null;
  return { kind: "ground" };
}
