/**
 * liveuamap 속보 텍스트에서 "상선 피격" 여부·선박명·선종을 읽는 규칙.
 *
 * liveuamap 이벤트에는 선박명 전용 필드가 없다 — 제목·본문 자유 텍스트뿐이다.
 * 그래서 선박명은 "MV Name", "tanker 'Name'"처럼 이름이 분명히 드러나는 표기에서만 뽑고,
 * 확실하지 않으면 null로 둔다. (엉뚱한 이름으로 사진을 찾으면 오보가 되기 때문)
 */

export type VesselKind = "tanker" | "bulk" | "container" | "cargo" | null;

/** 상선·화물선 계열 단어 (군함은 아래 MILITARY에서 따로 걸러낸다) */
const MERCHANT =
  /\b(tankers?|vessels?|ships?|cargo\s+(?:ship|vessel)s?|container\s+(?:ship|vessel)s?|bulk\s?carriers?|bulkers?|freighters?|merchant\s+(?:ship|vessel)s?|lng\s+carriers?|lpg\s+carriers?)\b|선박|유조선|상선|화물선|컨테이너선|벌크선/i;

/** 피격·나포 계열 단어 — 이게 없으면 "통과·입항·제재" 같은 일반 해운 소식이다 */
const ATTACK =
  /\b(attack(?:ed|s|ing)?|struck|strikes?|striking|hits?|hit|targeted|drone|missiles?|rockets?|torpedo(?:es)?|explosions?|exploded|blasts?|ablaze|on\s+fire|fire\s+broke|damaged|sinking|sank|sunk|seiz(?:ed|ure|es)|hijack(?:ed|ing|s)?|boarded|boarding|captur(?:ed|e)|mine|mines|piracy|pirates?|usv|unmanned\s+(?:surface|boat))\b|공격|피격|타격|폭발|화재|침몰|나포|피랍|납치|드론|미사일|기뢰|해적|선박\s?습격/i;

/** 군함·군사 선박 — 상선 피격이 아니므로 선박 사건 스택에서 뺀다 */
const MILITARY =
  /\b(warships?|frigates?|destroyers?|corvettes?|submarines?|aircraft\s+carriers?|navy\s+(?:ship|vessel)|naval\s+(?:ship|vessel)|coast\s+guard)\b|군함|호위함|구축함|잠수함|항공모함|해군\s?함정/i;

/** 연습·회담 등 피격이 아닌 맥락 */
const NOT_AN_ATTACK = /\b(exercises?|drills?|wargames?|sanctions?|talks|summit|insurance|premium)\b|훈련|연습|제재|회담/i;

/** 텍스트가 "상선 피격 사건"으로 읽히는지 — 상선 단어 + 피격 단어가 모두 있고 군함·연습이 아닐 때 */
export function looksLikeMerchantAttack(text: string): boolean {
  if (!MERCHANT.test(text) || !ATTACK.test(text)) return false;
  if (MILITARY.test(text)) return false;
  if (NOT_AN_ATTACK.test(text)) return false;
  return true;
}

/** UKMTO 사건 유형 중 실제 피습·나포만 (Advisory·Suspicious Activity는 경고일 뿐) */
export function isUkmtoAttackType(typeName: string | null | undefined): boolean {
  return /attack|hijack|board|seiz|explos|piracy|missile|drone/i.test(typeName ?? "");
}

export function guessVesselKind(text: string): VesselKind {
  if (/\b(tankers?|lng\s+carriers?|lpg\s+carriers?)\b|유조선/i.test(text)) return "tanker";
  if (/\bbulk\s?carriers?\b|\bbulkers?\b|벌크선/i.test(text)) return "bulk";
  if (/\bcontainer\s+(?:ship|vessel)s?\b|컨테이너선/i.test(text)) return "container";
  if (/\bcargo\s+(?:ship|vessel)s?\b|\bfreighters?\b|화물선/i.test(text)) return "cargo";
  return null;
}

const STOP = new Set([
  "the", "a", "an", "in", "on", "at", "off", "near", "of", "and", "after", "by", "was", "were",
  "is", "has", "have", "hit", "struck", "attacked", "reported", "carrying", "bound", "sailing",
  "flagged", "owned", "operated", "crew", "oil", "cargo", "ship", "vessel", "tanker", "another",
  "unknown", "unidentified", "commercial", "merchant", "iranian", "yemeni", "greek", "us",
]);

function cleanName(raw: string): string | null {
  const name = raw
    .replace(/[“”"'‘’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 3 || name.length > 40) return null;
  const words = name.split(" ");
  if (words.every((w) => STOP.has(w.toLowerCase()))) return null;
  if (STOP.has(words[0]!.toLowerCase())) return null;
  return name;
}

/**
 * 선박명 추출. 아래 둘 중 하나일 때만 뽑는다:
 *  1) 접두어 표기 — "MV Rubymar", "M/T Sounion", "MT Front Altair"
 *  2) 선종 단어 + 따옴표로 감싼 이름 — tanker "Sounion", 유조선 '수니온'
 * 따옴표 없는 일반 문장("a tanker near Hormuz")에서는 뽑지 않는다.
 */
export function extractVesselName(text: string): string | null {
  const prefixed = /\b(?:M\/V|M\/T|MV|MT|MS|M\.V\.|M\.T\.)\s+([A-Z][A-Za-z0-9'’\-]*(?:\s+[A-Z0-9][A-Za-z0-9'’\-]*){0,2})/.exec(text);
  if (prefixed?.[1]) {
    const name = cleanName(prefixed[1]);
    if (name) return name;
  }
  const quoted =
    /(?:tanker|vessel|ship|carrier|freighter|bulker|유조선|선박|상선|화물선|컨테이너선|벌크선)\s*[“"'‘]([^”"'’\n]{3,40})[”"'’]/i.exec(text);
  if (quoted?.[1]) {
    const name = cleanName(quoted[1]);
    if (name) return name;
  }
  return null;
}

/**
 * UKMTO는 선박명을 비공개로 한다 — 실제 응답의 vesselName이 ".", "MERCHANT", "TKR", "-", "tkr",
 * "vessel", "Tanker" 같은 자리표시어다. 이런 값은 이름이 아니므로 null로 돌려
 * 카드에 가짜 선박명이 뜨거나 사진 검색이 엉뚱한 배를 찾는 일을 막는다.
 */
const PLACEHOLDER_NAME =
  /^(?:[\s\-._/]*|n\/?a|none|null|unknown|unnamed|undisclosed|unidentified|tkr|tnk|bc|b\/c|cs|gc|mv|mt|merchant|vessel|ship|tanker|cargo|container|bulker|bulk\s?carrier|lng|lpg|fishing|dhow|skiff)(?:\s+(?:vessel|ship|tanker|carrier))?$/i;

export function realVesselName(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (t.length < 3) return null;
  if (PLACEHOLDER_NAME.test(t)) return null;
  return t;
}

export type VesselInfo = {
  kind: VesselKind;
  /** LNG·LPG 운반선 여부 — 일러스트는 유조선과 같지만 라벨이 다르다 */
  gas: boolean;
  /** 본문에 적힌 톤수 (예: "a 19,000 tonne Container ship") */
  tonnes: number | null;
};

/** 선박명이 없어도 본문(UKMTO 설명 등)에서 읽을 수 있는 선종·톤수 */
export function describeVessel(text: string | null | undefined, type?: string | null): VesselInfo {
  const hay = `${text ?? ""} ${type ?? ""}`;
  const tonne = /(\d[\d,.]*)\s*(?:tonne|ton|dwt|gt|grt)s?\b/i.exec(hay);
  const parsed = tonne?.[1] ? Number(tonne[1].replace(/,/g, "")) : NaN;
  return {
    kind: guessVesselKind(hay),
    gas: /\b(?:lng|lpg)\b/i.test(hay),
    tonnes: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
  };
}
