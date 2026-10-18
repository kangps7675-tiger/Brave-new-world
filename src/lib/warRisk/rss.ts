/**
 * 최소 RSS 2.0 item 파서 — Worker·Node 공통(의존성 없음, DOMParser 안 씀).
 * 전쟁위험 보험료 수집용이라 title/link/pubDate/description/source 만 본다.
 */

export type RssItem = {
  title: string;
  link: string;
  pubDate: string | null;
  description: string;
  source: string | null;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function unwrapCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? unwrapCdata(m[1]) : null;
}

export function parseRssItems(xml: string): RssItem[] {
  const out: RssItem[] = [];
  const re = /<item[\s>][\s\S]*?<\/item>/gi;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const block = m[0];
    const title = decodeEntities(stripTags(decodeEntities(tag(block, "title") ?? "")));
    const link = decodeEntities((tag(block, "link") ?? "").trim());
    if (!title || !/^https?:\/\//.test(link)) continue;
    // 설명은 HTML 이 entity 로 한 번 더 감싸진 경우가 많다 (Google News) — decode → strip → decode
    const description = decodeEntities(stripTags(decodeEntities(tag(block, "description") ?? "")));
    const source = tag(block, "source");
    out.push({
      title,
      link,
      pubDate: (tag(block, "pubDate") ?? "").trim() || null,
      description: description.length > 1200 ? description.slice(0, 1200) : description,
      source: source ? decodeEntities(stripTags(source)) || null : null,
    });
  }
  return out;
}

/** Google News 제목은 "기사 제목 - 매체명" — 매체명을 떼어낸다 */
export function splitGoogleNewsTitle(title: string): { headline: string; outlet: string | null } {
  const i = title.lastIndexOf(" - ");
  if (i <= 0 || title.length - i > 60) return { headline: title, outlet: null };
  return { headline: title.slice(0, i).trim(), outlet: title.slice(i + 3).trim() || null };
}
