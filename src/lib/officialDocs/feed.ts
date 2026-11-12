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
  /** 안보화된 주제 id(semiconductor·defense-industry…). 연방관보 읽기 함수가 붙인다. */
  topics?: string[];
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

/**
 * 합의문·팩트시트·회담 요약·성명·조약만 남긴다. 연설·기자회견과 일반 보도자료는 --all일 때만.
 * 예외: 러시아 외무부는 사건이 생기면 보도자료("Press release on summoning the Ambassador of …")·대변인 브리핑·
 * 장관 발언으로 입장을 내므로, 러시아 문서는 종류와 상관없이 모두 남긴다.
 * 한국도 같다: 정책브리핑 RSS가 중단돼(2026-07-01) 외교부·국방부 보도자료 목록이 유일한 한국 수집원이고, 국문 제목은 분류기가 종류를 못 가른다.
 */
export function worthKeeping(row: DocCandidate): boolean {
  if (row.issuerId === "ru" || row.issuerId === "kr") return true;
  // 일본 방위성은 방위·북한 미사일 발표가 곧 정부 입장이라 모두 남긴다
  if (row.issuerId === "jp" && /(^|\.)mod\.go\.jp\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  // 중국 국방부 대변인 담화·답변과 외교부 정례 브리핑은 공식 입장이라 모두 남긴다(외교부 Top Stories는 기존 규칙 그대로 쓰이므로 같은 호스트의 다른 문서도 함께 남는다)
  if (row.issuerId === "cn" && /(^|\.)(mod|mfa|fmprc)\.gov\.cn\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  // 인도 외교부 보도자료는 회담·방문·성명이 대부분이라 모두 남긴다
  if (row.issuerId === "in" && /(^|\.)mea\.gov\.in\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  // 호주 외교장관·국방부 보도자료는 성명·회담·제재 발표가 대부분이라 모두 남긴다
  if (row.issuerId === "au" && /(^|\.)(foreignminister|defence)\.gov\.au\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  // 이란 대통령실 소식은 대통령의 회담·성명이고, 국영통신 IRNA는 이란 정부 입장을 전하는 당사자 매체라 모두 남긴다(라벨에 국영 매체임을 표시)
  if (row.issuerId === "ir" && /(^|\.)(president\.ir|en\.irna\.ir)\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  // 사우디 외교부 성명·소식은 장관 면담·공동선언·성명이 대부분이라 모두 남긴다
  if (row.issuerId === "sa" && /(^|\.)mofa\.gov\.sa\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  // 대만: 국방부(중국 군 활동 일일 발표·보도자료)와 총통부는 속보 근거로 직접적이라 모두 남긴다(외교부는 기존 규칙)
  if (row.issuerId === "tw" && /(^|\.)(mnd\.gov\.tw|president\.gov\.tw)\//i.test(row.url.replace(/^https?:\/\//, ""))) return true;
  return row.kind !== "remarks" && row.kind !== "press-release";
}
