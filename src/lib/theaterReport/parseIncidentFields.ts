/**
 * LiveUA title/body에서 사상·피해를 보수적으로만 뽑는다.
 * 숫자가 문장에 없으면 null — 추정·합산 금지.
 */

export type ParsedCasualties = {
  killed: number | null;
  wounded: number | null;
  raw: string | null;
};

const KILLED_RE =
  /(\d{1,5})\s*(?:people\s+)?(?:killed|dead|deaths|fatalities)|(?:killed|dead|deaths)\s*[:=]?\s*(\d{1,5})|(\d{1,5})\s*(?:명\s*)?(?:사망|숨진|전사|숨졌)/i;

const WOUNDED_RE =
  /(\d{1,5})\s*(?:people\s+)?(?:wounded|injured|hurt)|(?:wounded|injured)\s*[:=]?\s*(\d{1,5})|(\d{1,5})\s*(?:명\s*)?(?:부상|다친)/i;

const DAMAGE_RE =
  /((?:destroyed|damaged|ablaze|set on fire|burned|hit(?:ting)?|struck)[^.!?\n]{0,100}|[^.!?\n]{0,40}(?:파괴|파손|화재|불탔|피격|손상)[^.!?\n]{0,60})/i;

function firstInt(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  for (let i = 1; i < match.length; i++) {
    const n = Number(match[i]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function parseCasualties(text: string): ParsedCasualties {
  const blob = text.trim();
  if (!blob) return { killed: null, wounded: null, raw: null };
  const killed = firstInt(blob.match(KILLED_RE));
  const wounded = firstInt(blob.match(WOUNDED_RE));
  const raw =
    killed != null || wounded != null
      ? [killed != null ? `K${killed}` : null, wounded != null ? `W${wounded}` : null]
          .filter(Boolean)
          .join(" · ")
      : null;
  return { killed, wounded, raw };
}

export function parseMaterialDamage(text: string): string | null {
  const blob = text.trim();
  if (!blob) return null;
  const m = blob.match(DAMAGE_RE);
  if (!m?.[1]) return null;
  const clipped = m[1].replace(/\s+/g, " ").trim();
  return clipped.length > 140 ? `${clipped.slice(0, 137)}…` : clipped;
}

/** 표용 장소 — 제목 앞부분만. 없으면 좌표. */
export function placeLabelFromEvent(input: {
  title: string;
  lat: number;
  lng: number;
}): string {
  const title = input.title.trim();
  if (!title) {
    return `${input.lat.toFixed(2)}, ${input.lng.toFixed(2)}`;
  }
  const cut = title.split(/\s+[—–|-]\s+/)[0]?.trim() || title;
  const short = cut.length > 72 ? `${cut.slice(0, 69)}…` : cut;
  return short;
}
