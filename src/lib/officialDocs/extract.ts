import { createHash } from "node:crypto";
import { decodeHtmlEntities } from "@/lib/htmlEntities";

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function stripBlocks(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|iframe|select|button|textarea)\b[\s\S]*?<\/\1>/gi, " ");
}

function innerOf(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : null;
}

/** 페이지에서 본문 텍스트만 뽑는다. <main>, 없으면 <article>, 없으면 <body> 순. 문단 경계는 줄바꿈으로 남긴다. */
/** 공유 버튼·메뉴 글자처럼 문서 내용이 아닌 한 줄. 줄 전체가 이것일 때만 버린다. */
const CHROME_LINE =
  /^(share( on [a-z ]+)?|print|tweet|facebook|twitter|whatsapp|e-?mail|linkedin|skip to (main )?content|menu|search|back to top|read more|download( pdf)?)$/i;

function blockToText(scope: string): string {
  const text = scope
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter((line) => line && !CHROME_LINE.test(line))
    .join("\n");
}

/**
 * 페이지에서 본문 텍스트만 뽑는다. <main>, 없으면 <article>, 없으면 <body> 순. 문단 경계는 줄바꿈으로 남긴다.
 * 어떤 사이트(ASP.NET 등)는 본문 전체를 <form> 하나로 감싸거나 <main>에 제목만 두므로,
 * 좁은 범위에서 뽑은 글이 200자 미만이면 <body> 전체로 다시 뽑는다.
 */
export function htmlToText(html: string): string {
  const cleaned = stripBlocks(html);
  const narrow = innerOf(cleaned, "main") ?? innerOf(cleaned, "article");
  if (narrow != null) {
    const text = blockToText(narrow);
    if (text.length >= 200) return text;
  }
  return blockToText(innerOf(cleaned, "body") ?? cleaned);
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta\\b[^>]*(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeHtmlEntities(content).trim() : null;
}

export function pickTitle(html: string): string | null {
  const og = metaContent(html, "og:title");
  if (og) return og;
  const h1 = innerOf(html, "h1");
  if (h1) {
    const t = decodeHtmlEntities(h1.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (t) return t;
  }
  const title = innerOf(html, "title");
  return title ? decodeHtmlEntities(title).replace(/\s+/g, " ").trim() || null : null;
}

/** 발행일(YYYY-MM-DD). 못 찾으면 null — 날짜를 지어내지 않는다. */
export function pickDate(html: string): string | null {
  const candidates = [
    metaContent(html, "article:published_time"),
    metaContent(html, "datePublished"),
    metaContent(html, "date"),
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] ?? null,
    html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1] ?? null,
  ];
  for (const value of candidates) {
    const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return null;
}

/** 페이지의 대표 이미지 주소(og:image). https만 받는다. */
export function pickImage(html: string): string | null {
  const url = metaContent(html, "og:image");
  return url && /^https:\/\//i.test(url) ? url : null;
}
