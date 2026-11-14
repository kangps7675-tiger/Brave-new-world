/**
 * HTML 문자 참조 풀기. RSS 제목·요약에 `&#8211;`, `&#x2013;`, `&ndash;` 가 그대로 남아 화면에
 * 찍히던 문제용. 알 수 없는 이름 참조(&foo;)는 건드리지 않는다.
 */
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
};

function fromCodePoint(code: number): string | null {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return null;
  if (code >= 0xd800 && code <= 0xdfff) return null;
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

export function decodeHtmlEntities(text: string): string {
  // 이중 인코딩(&amp;#8211;)도 풀리도록 &amp;를 먼저 푼 뒤 나머지를 푼다
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#(\d{1,7});/g, (m, d: string) => fromCodePoint(Number(d)) ?? m)
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, h: string) => fromCodePoint(parseInt(h, 16)) ?? m)
    .replace(/&([a-z]{2,8});/gi, (m, name: string) => NAMED[name.toLowerCase()] ?? m);
}
