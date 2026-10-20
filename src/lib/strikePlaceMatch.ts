import { STRIKE_PLACES, type StrikePlaceArea } from "@/data/strikePlaces";
import { normalizePlaceKey, textHasExactPlace } from "@/lib/telegramPlaceMatch";

/**
 * 공습 기사 → 타격 지점. 불꽃 전용 사전(STRIKE_PLACES)에서만 찾는다.
 *
 * 한 문장에 지명이 여럿이면 "맞은 곳"을 고른다:
 *  - 앞에 in/on/at/hit/struck 같은 표현이 붙거나, 한국어로 뒤에 을·를·에가 붙으면 맞은 곳(+)
 *  - 앞에 from/by/launched from 이 붙거나, 한국어로 뒤에 이·가가 붙으면 쏜 곳(−)
 * 쏜 곳으로 읽히는 지명만 있으면 좌표를 주지 않는다 — 발사지에 불꽃을 찍지 않는다.
 */

export type StrikePlaceHit = {
  label: string;
  lat: number;
  lng: number;
  area: StrikePlaceArea;
  /** 맞은 곳이라는 문맥 점수. 2 이상이면 뚜렷한 타격지 */
  score: number;
};

type Entry = { key: string; label: string; lat: number; lng: number; area: StrikePlaceArea };

const ENTRIES: Entry[] = STRIKE_PLACES.flatMap((p) =>
  p.aliases.map((alias) => ({ key: normalizePlaceKey(alias), label: p.label, lat: p.lat, lng: p.lng, area: p.area })),
).sort((a, b) => b.key.length - a.key.length);

const IMPACT_BEFORE_EN =
  /\b(?:in|on|at|into|near|over|hit|hits|struck|strikes? on|attack on|attacked|targeted|targeting|toward|towards)\s+(?:the\s+)?(?:[\p{L}-]+\s+){0,3}$/iu;
const SOURCE_BEFORE_EN = /\b(?:from|by|launched from|fired from|based in)\s+(?:the\s+)?(?:[\p{L}-]+\s+){0,2}$/iu;
const JOSA_TARGET = /^(?:을|를|에서|에)/;
const JOSA_SUBJECT = /^(?:이|가)(?![가-힣])/;

export function resolveStrikePlace(text: string): StrikePlaceHit | null {
  const hay = normalizePlaceKey(text ?? "");
  if (hay.length < 3) return null;

  type Found = StrikePlaceHit & { index: number; len: number };
  const byLabel = new Map<string, Found>();
  for (const e of ENTRIES) {
    if (!textHasExactPlace(hay, e.key)) continue;
    const index = hay.indexOf(e.key);
    if (index < 0) continue;
    // 더 긴 이름(Kerch Strait)이 이미 같은 자리를 차지했으면 짧은 이름(Kerch)은 건너뛴다
    const covered = [...byLabel.values()].some((h) => h.label !== e.label && index >= h.index && index < h.index + h.len);
    if (covered) continue;
    const before = hay.slice(Math.max(0, index - 40), index);
    const after = hay.slice(index + e.key.length);
    let score = 0;
    if (IMPACT_BEFORE_EN.test(before)) score += 2;
    if (SOURCE_BEFORE_EN.test(before)) score -= 3;
    if (JOSA_TARGET.test(after)) score += 3;
    else if (JOSA_SUBJECT.test(after)) score -= 3;
    const prev = byLabel.get(e.label);
    if (!prev || score > prev.score) {
      byLabel.set(e.label, { label: e.label, lat: e.lat, lng: e.lng, area: e.area, score, index, len: e.key.length });
    }
  }

  let best: Found | null = null;
  for (const h of byLabel.values()) {
    if (h.score < 0) continue;
    if (!best || h.score > best.score || (h.score === best.score && h.index < best.index)) best = h;
  }
  if (!best) return null;
  return { label: best.label, lat: best.lat, lng: best.lng, area: best.area, score: best.score };
}
