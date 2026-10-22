/**
 * 선박·군용기를 눌렀을 때 보여 줄 "관련 기사" 몇 건.
 * 이미 받아 둔 RSS 뉴스·liveuamap 속보에서 이름(선박명·콜사인·등록번호)이 제목/요약에 그대로 나온 것만 고른다.
 * 이름이 짧거나 흔하면(번호만, UNKNOWN 등) 엉뚱한 기사가 붙으므로 아예 찾지 않는다.
 */

export type NewsRef = {
  id: string;
  title: string;
  link: string;
  source: string;
  /** epoch ms */
  at: number;
};

const SHIP_PREFIX = new Set(["mv", "mt", "ms", "ss", "fv", "uss", "hms", "ins", "hmas"]);
const GENERIC = new Set(["unknown", "military", "vessel", "ship", "tanker", "cargo", "navy", "fishing"]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** 검색에 쓸 수 있는 이름인지 + 정규화된 구문 */
export function usableVesselKey(name: string | null | undefined): string | null {
  if (!name) return null;
  let tokens = norm(name).split(" ").filter(Boolean);
  if (tokens.length > 1 && SHIP_PREFIX.has(tokens[0]!)) tokens = tokens.slice(1);
  const phrase = tokens.join(" ");
  if (phrase.length < 5) return null;
  if (/^[\d\s]+$/.test(phrase)) return null;
  if (GENERIC.has(phrase)) return null;
  return phrase;
}

export function newsAboutVessel(
  names: ReadonlyArray<string | null | undefined>,
  pool: readonly NewsRef[],
  max = 4,
): NewsRef[] {
  const keys = [...new Set(names.map(usableVesselKey).filter((k): k is string => k !== null))];
  if (keys.length === 0) return [];
  const hits = pool.filter((n) => {
    if (!/^https?:\/\//i.test(n.link)) return false;
    const text = ` ${norm(n.title)} `;
    return keys.some((k) => text.includes(` ${k} `));
  });
  const seen = new Set<string>();
  return hits
    .sort((a, b) => b.at - a.at)
    .filter((n) => (seen.has(n.link) ? false : (seen.add(n.link), true)))
    .slice(0, max);
}
