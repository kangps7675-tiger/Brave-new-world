import { createHash } from "node:crypto";
import type { ShipMovementReportDraft } from "@/lib/shipMovements/types";

export const JSO_PRESS_INDEX_URL = "https://www.mod.go.jp/js/press/index.html";
export const JSO_PRESS_BASE = "https://www.mod.go.jp/js/";

const UA =
  "BraveNewWorld/1.0 (+https://github.com/kangps7675-tiger/Brave-new-world; contact kangps7675@gmail.com)";

const NAVAL_TITLE_RE =
  /海軍艦艇|艦艇の動向|共同航行|中国海軍|ロシア海軍|Chinese Navy|Russian Navy|naval vessel/i;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absUrl(href: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `https://www.mod.go.jp${href}`;
  return `${JSO_PRESS_BASE}${href.replace(/^\.\//, "")}`;
}

export type JsoPressLink = {
  url: string;
  title: string;
  isPdf: boolean;
};

/** 통합막료감부 보도 인덱스에서 해군 함정 관련 PDF/HTML 링크만 추출 */
export function parseJsoPressIndex(html: string): JsoPressLink[] {
  const out: JsoPressLink[] = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const href = m[1] ?? "";
    const title = stripHtml(m[2] ?? "");
    if (!href || !title) continue;
    if (!NAVAL_TITLE_RE.test(title) && !/pdf\/20\d{2}\//i.test(href)) continue;
    if (!NAVAL_TITLE_RE.test(title) && !/\.pdf/i.test(href)) continue;
    if (!NAVAL_TITLE_RE.test(title)) continue;
    const url = absUrl(href);
    if (out.some((x) => x.url === url)) continue;
    out.push({ url, title, isPdf: /\.pdf($|\?)/i.test(url) });
  }
  return out.slice(0, 40);
}

function reportId(url: string): string {
  const h = createHash("sha256").update(`jso:${url}`).digest("hex").slice(0, 16);
  return `jso:${h}`;
}

function contentHash(url: string, title: string, body: string): string {
  return createHash("sha256").update(`${url}|${title}|${body.slice(0, 4000)}`).digest("hex").slice(0, 24);
}

function weekStartFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** PDF 바이너리에서 대략적 텍스트 추출 (간단 스트림 스캔). 실패 시 빈 문자열. */
export function extractTextFromPdfBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let raw = "";
  // Latin1 decode keeps binary searchable for (...)Tj streams
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]!);

  const chunks: string[] = [];
  // PDF text show ops: (....)Tj — RegExp ctor avoids /.../ escape edge cases in oxc
  const tjRe = new RegExp(String.raw`\((?:\\.|[^\\)]){2,200}\)Tj`, "g");
  const tj = raw.matchAll(tjRe);
  for (const m of tj) {
    const inner = m[0].slice(1, -3);
    const text = inner
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    if (/[\u3040-\u30ff\u4e00-\u9fffA-Za-z0-9]/.test(text)) chunks.push(text);
  }

  // UTF-16BE hex strings <3042...> often appear in JP PDFs
  const hex = raw.matchAll(/<([0-9A-Fa-f]{8,})>/g);
  for (const m of hex) {
    const h = m[1]!;
    if (h.length % 4 !== 0) continue;
    let s = "";
    for (let i = 0; i < h.length; i += 4) {
      const code = Number.parseInt(h.slice(i, i + 4), 16);
      if (code > 0 && code < 0xfffe) s += String.fromCharCode(code);
    }
    if (/[\u3040-\u30ff\u4e00-\u9fff]{2,}/.test(s)) chunks.push(s);
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 12000);
}

export function jsoDraftFromText(input: {
  url: string;
  title: string;
  body: string;
  publishedAt?: string | null;
}): ShipMovementReportDraft {
  const titleJa = input.title.trim();
  const titleEn = titleJa;
  const titleKo = titleJa
    .replace(/中国海軍艦艇の動向について/g, "중국 해군 함정 동향")
    .replace(/ロシア海軍艦艇の動向について/g, "러시아 해군 함정 동향")
    .replace(/中露共同航行/g, "중·러 공동 항행");

  return {
    id: reportId(input.url),
    source: "jso",
    sourceLabel: "Japan Joint Staff Office",
    url: input.url,
    title: titleJa,
    titleKo,
    titleEn,
    summaryKo: input.body.slice(0, 280) || null,
    summaryEn: input.body.slice(0, 280) || null,
    publishedAt: input.publishedAt ?? null,
    weekStart: weekStartFromIso(input.publishedAt ?? null),
    contentHash: contentHash(input.url, titleJa, input.body),
    rawExcerpt: input.body.slice(0, 12000),
  };
}

export async function fetchJsoNavalReports(opts?: {
  indexUrl?: string;
  fetchImpl?: typeof fetch;
  maxReports?: number;
}): Promise<{ reports: ShipMovementReportDraft[]; linkCount: number }> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const maxReports = opts?.maxReports ?? 6;
  const indexUrl = opts?.indexUrl ?? JSO_PRESS_INDEX_URL;

  const res = await fetchImpl(indexUrl, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    cache: "no-store",
  });
  if (!res.ok) return { reports: [], linkCount: 0 };
  const html = await res.text();
  const links = parseJsoPressIndex(html);
  const reports: ShipMovementReportDraft[] = [];

  for (const link of links.slice(0, maxReports)) {
    try {
      const page = await fetchImpl(link.url, {
        headers: { "User-Agent": UA, Accept: link.isPdf ? "application/pdf,*/*" : "text/html" },
        cache: "no-store",
      });
      if (!page.ok) continue;
      let body = "";
      if (link.isPdf) {
        const buf = await page.arrayBuffer();
        body = extractTextFromPdfBuffer(buf);
      } else {
        body = stripHtml(await page.text());
      }
      if (body.length < 40 && link.isPdf) {
        // PDF 텍스트 추출 실패 시에도 메타만 남김
        body = link.title;
      }
      reports.push(
        jsoDraftFromText({
          url: link.url,
          title: link.title,
          body,
        }),
      );
    } catch {
      /* skip */
    }
  }

  return { reports, linkCount: links.length };
}
