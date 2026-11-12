import { decodeHtmlEntities } from "@/lib/htmlEntities";
import type { DocKind, DocWeight, IssuerId } from "@/data/officialDocs";
import { classifyDocKind, weightOf } from "@/lib/officialDocs/classify";

export type DocCandidate = {
  issuerId: IssuerId;
  title: string;
  url: string;
  /** YYYY-MM-DD, 읽지 못하면 null */
  publishedAt: string | null;
  kind: DocKind;
  weight: DocWeight;
  summary: string;
  /** 문서를 낸 기관(예: "Bureau of Industry and Security"). 모르면 없음. */
  agency?: string;
};

function tag(block: string, name: string): string {
  const m =
    block.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>`, "i")) ||
    block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decodeHtmlEntities(m[1]).trim() : "";
}

function linkOf(block: string): string {
  const alt = block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if (alt) return alt;
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
  return href ?? tag(block, "link");
}

function isoDay(value: string): string | null {
  if (!value) return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : null;
}

/**
 * RSS·Atom을 후보로 바꾼다. 뉴스용 파서와 달리 제목을 자르지 않는다
 * ("Joint Statement - US and Japan" 같은 제목의 " - " 뒤를 매체명으로 오해하지 않는다).
 */
export function parseOfficialFeed(xml: string, issuerId: IssuerId): DocCandidate[] {
  if (/^\s*<(!doctype\s+html|html)/i.test(xml)) return [];
  const blocks = Array.from(xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)).map((m) => m[1]);
  const entries = blocks.length > 0 ? blocks : Array.from(xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)).map((m) => m[1]);
  const out: DocCandidate[] = [];
  for (const block of entries) {
    const title = tag(block, "title");
    const url = linkOf(block);
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const kind = classifyDocKind(title);
    out.push({
      issuerId,
      title,
      url,
      publishedAt: isoDay(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated")),
      kind,
      weight: weightOf(kind),
      summary: decodeHtmlEntities(
        (tag(block, "description") || tag(block, "summary")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
      ).trim().slice(0, 280),
    });
  }
  return out;
}

/** 합의문·팩트시트·회담 요약·성명·조약만 남긴다. 연설·기자회견과 일반 보도자료는 --all일 때만. */
export function worthKeeping(row: DocCandidate): boolean {
  return row.kind !== "remarks" && row.kind !== "press-release";
}
