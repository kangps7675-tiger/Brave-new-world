/**
 * 우측 이벤트 도크에 띄울 "큰 타격" 판정.
 * 드론·미사일·유도폭탄이 실제로 떨어진 속보(liveuaConfirmedStrike) 중에서
 * 피해가 확인되었거나 규모가 큰 것만 고른다. 나머지는 유저가 지도에서 본다.
 *
 * 큰 것 = 아래 중 하나
 *   ① 감시 시설(정유소·항구·터미널)에 맞음
 *   ② 공항·공군기지·발전소 같은 인프라 + 파손/화재 표현
 *   ③ 사망·부상 보도
 *   ④ 미사일·유도폭탄 + 파손/화재 표현
 * 드론이 "맞았다"만 있고 피해 표현이 없으면 큰 것으로 치지 않는다.
 */

import { liveuaConfirmedStrike, type LiveuaStrikeKind } from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { strikeFacilityFor } from "@/lib/strikeFacility";

export type MajorStrikeReason = "facility" | "infrastructure" | "casualty" | "heavy";

export type MajorStrike = {
  kind: LiveuaStrikeKind;
  reason: MajorStrikeReason;
  /** 판정 근거 — 원문에서 걸린 표현 (감시 시설이면 시설 이름) */
  evidence: string[];
  facilityName?: { ko: string; en: string };
};

function hits(re: RegExp, text: string): string[] {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return [...new Set([...text.matchAll(g)].map((m) => m[0]).filter(Boolean))].slice(0, 4);
}

type Input = Pick<LiveuamapEvent, "title" | "body" | "titleKo" | "bodyKo" | "tags" | "lat" | "lng">;

const INFRA_RE =
  /\b(?:airports?|airfields?|air ?bases?|airbase|refiner(?:y|ies)|oil (?:depot|terminal|facility|facilities)|fuel depot|power (?:plant|station)|substations?|ports?|harbou?rs?|terminals?|bridges?|dams?|pipelines?|railway|rail hub|gas (?:facility|plant|processing))\b|공항|비행장|공군기지|정유|발전소|변전소|항구|항만|터미널|송유관|가스\s*(?:시설|처리)|교량|댐|철도/i;

const DAMAGE_RE =
  /\b(?:destroyed|damaged|damage|ablaze|on fire|fire|burn(?:ing|ed|s)?|explosions?|exploded|blaze)\b|파괴|파손|피해|불타|화재|폭발/i;

const CASUALTY_RE =
  /\b(?:killed|dead|deaths?|casualt(?:y|ies)|injured|wounded|fatalit(?:y|ies))\b|사망|숨졌|부상|희생|사상자/i;

export function isMajorConfirmedStrike(event: Input): MajorStrike | null {
  const strike = liveuaConfirmedStrike(event);
  if (!strike) return null;
  const text = [event.title, event.body, event.titleKo, event.bodyKo]
    .filter((p) => typeof p === "string" && p.trim())
    .join("\n");
  const facility = strikeFacilityFor({ lat: event.lat, lng: event.lng, text });
  if (facility) {
    return {
      kind: strike.kind,
      reason: "facility",
      evidence: [],
      facilityName: { ko: `${facility.nameKo} (${facility.kindKo})`, en: `${facility.nameEn} (${facility.kindEn})` },
    };
  }
  const damage = DAMAGE_RE.test(text);
  if (INFRA_RE.test(text) && damage) {
    return { kind: strike.kind, reason: "infrastructure", evidence: [...hits(INFRA_RE, text), ...hits(DAMAGE_RE, text)].slice(0, 4) };
  }
  if (CASUALTY_RE.test(text)) return { kind: strike.kind, reason: "casualty", evidence: hits(CASUALTY_RE, text) };
  if ((strike.kind === "missile" || strike.kind === "bomb") && damage) {
    return { kind: strike.kind, reason: "heavy", evidence: hits(DAMAGE_RE, text) };
  }
  return null;
}
