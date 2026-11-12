import { decodeHtmlEntities } from "@/lib/htmlEntities";

/**
 * 싱크탱크 분석 글(38 North 등)의 RSS → 제목·링크·날짜·저자·분류·짧은 요약.
 * 공식 문서도 언론 기사도 아닌 "전문가 해석"이라 따로 다룬다. 원문(content:encoded)은 읽지도 저장하지도 않는다:
 * 사이트가 "All rights reserved"라서 제목과 링크, 피드가 주는 짧은 발췌만 쓴다.
 */

export type AnalysisSource = { id: string; name: string; org: string; url: string; scope: string; label: string };

export type AnalysisItem = {
  url: string;
  title: string;
  /** ISO 시각. 읽지 못하면 null */
  publishedAt: string | null;
  author: string;
  /** 사이트가 붙인 분류·태그(소문자). "wmd", "choe hyon destroyer", "cruise missiles" … */
  tags: string[];
  summary: string;
  source: { id: string; name: string; org: string };
};

function tag(block: string, name: string): string {
  const m =
    block.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>`, "i")) ||
    block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decodeHtmlEntities(m[1]).trim() : "";
}

function allTags(block: string, name: string): string[] {
  const out: string[] = [];
  for (const m of block.matchAll(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${name}>`, "gi"))) {
    const v = decodeHtmlEntities((m[1] ?? m[2] ?? "").trim());
    if (v) out.push(v);
  }
  return out;
}

/** 워드프레스 피드 발췌 끝에 붙는 "The post … appeared first on …"을 떼고 글자만 남긴다 */
function cleanSummary(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(/<p>\s*The post\b[\s\S]*$/i, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/The post .* appeared first on .*$/i, ""),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function parseAnalysisFeed(xml: string, source: AnalysisSource): AnalysisItem[] {
  if (/^\s*<(!doctype\s+html|html)/i.test(xml)) return [];
  const out: AnalysisItem[] = [];
  for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
    const block = m[1];
    const title = tag(block, "title");
    const url = tag(block, "link");
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const at = Date.parse(tag(block, "pubDate"));
    out.push({
      url,
      title,
      publishedAt: Number.isFinite(at) ? new Date(at).toISOString() : null,
      author: tag(block, "dc:creator"),
      tags: allTags(block, "category").map((t) => t.toLowerCase()),
      summary: cleanSummary(tag(block, "description")),
      source: { id: source.id, name: source.name, org: source.org },
    });
  }
  return out;
}
