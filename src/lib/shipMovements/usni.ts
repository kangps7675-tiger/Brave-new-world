import { createHash } from "node:crypto";
import { parseRssXml } from "@/lib/news/rssParser";
import type { ShipMovementReportDraft, ShipMovementSource } from "@/lib/shipMovements/types";

export const USNI_FLEET_TRACKER_FEED =
  "https://news.usni.org/category/fleet-tracker/feed";
export const USNI_FLEET_TRACKER_ARCHIVE =
  "https://news.usni.org/category/fleet-tracker";

const UA =
  "BraveNewWorld/1.0 (+https://github.com/kangps7675-tiger/Brave-new-world; contact kangps7675@gmail.com)";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function contentHash(url: string, title: string, body: string): string {
  return createHash("sha256").update(`${url}|${title}|${body.slice(0, 4000)}`).digest("hex").slice(0, 24);
}

function reportId(source: ShipMovementSource, url: string): string {
  const h = createHash("sha256").update(`${source}:${url}`).digest("hex").slice(0, 16);
  return `${source}:${h}`;
}

function weekStartFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday=0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function classifyUsniTitle(title: string): ShipMovementSource | null {
  const t = title.toLowerCase();
  if (t.includes("western pacific pulse")) return "usni-westpac-pulse";
  if (t.includes("fleet and marine tracker") || t.includes("fleet tracker")) {
    return "usni-fleet-tracker";
  }
  return null;
}

function toDraft(input: {
  source: ShipMovementSource;
  url: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  body: string;
}): ShipMovementReportDraft {
  const titleEn = input.title.trim();
  const titleKo =
    input.source === "usni-westpac-pulse"
      ? titleEn.replace(/USNI News Western Pacific Pulse/i, "USNI 서태평양 주간 함선 동향")
      : titleEn.replace(/USNI News Fleet and Marine Tracker/i, "USNI 함대·해병 트래커");

  return {
    id: reportId(input.source, input.url),
    source: input.source,
    sourceLabel: "USNI News",
    url: input.url,
    title: titleEn,
    titleKo,
    titleEn,
    summaryKo: input.summary,
    summaryEn: input.summary,
    publishedAt: input.publishedAt,
    weekStart: weekStartFromIso(input.publishedAt),
    contentHash: contentHash(input.url, titleEn, input.body),
    rawExcerpt: input.body.slice(0, 12000),
  };
}

function tagContent(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m?.[1]) return "";
  return stripHtml(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

function encodedBody(block: string): string {
  const m =
    block.match(/<content:encoded[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/i) ||
    block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
  if (m?.[1]) return stripHtml(m[1]);
  return tagContent(block, "description");
}

export function parseUsniFleetTrackerRss(xml: string): ShipMovementReportDraft[] {
  const items = parseRssXml(xml);
  // parseRssXml truncates summary — re-parse blocks for full body when present
  const blocks = Array.from(xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)).map((m) => m[1] ?? "");
  const out: ShipMovementReportDraft[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item?.link || !item.title) continue;
    const source = classifyUsniTitle(item.title);
    if (!source) continue;
    const block = blocks[i] ?? "";
    const body = encodedBody(block) || item.summary || item.title;
    const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : null;
    out.push(
      toDraft({
        source,
        url: item.link,
        title: item.title,
        summary: item.summary ?? null,
        publishedAt: publishedAt && Number.isFinite(Date.parse(publishedAt)) ? publishedAt : null,
        body,
      }),
    );
  }
  return out;
}

/** 아카이브 HTML 폴백 — 링크·제목만 확보 (본문은 후속 fetch) */
export function parseUsniFleetTrackerArchiveHtml(html: string): Array<{
  url: string;
  title: string;
}> {
  const out: Array<{ url: string; title: string }> = [];
  const re =
    /<a[^>]+href="(https:\/\/news\.usni\.org\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const url = m[1];
    const title = stripHtml(m[2] ?? "");
    if (!url || !title) continue;
    if (!classifyUsniTitle(title)) continue;
    if (out.some((x) => x.url === url)) continue;
    out.push({ url, title });
  }
  return out.slice(0, 20);
}

export async function fetchUsniFleetTrackerReports(opts?: {
  feedUrl?: string;
  archiveUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ reports: ShipMovementReportDraft[]; via: "rss" | "archive" | "empty" }> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const feedUrl = opts?.feedUrl ?? USNI_FLEET_TRACKER_FEED;

  try {
    const res = await fetchImpl(feedUrl, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      cache: "no-store",
    });
    if (res.ok) {
      const xml = await res.text();
      const reports = parseUsniFleetTrackerRss(xml);
      if (reports.length > 0) return { reports, via: "rss" };
    }
  } catch {
    /* fall through */
  }

  try {
    const archiveUrl = opts?.archiveUrl ?? USNI_FLEET_TRACKER_ARCHIVE;
    const res = await fetchImpl(archiveUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok) return { reports: [], via: "empty" };
    const html = await res.text();
    const links = parseUsniFleetTrackerArchiveHtml(html);
    const reports: ShipMovementReportDraft[] = [];
    for (const link of links.slice(0, 8)) {
      try {
        const page = await fetchImpl(link.url, {
          headers: { "User-Agent": UA, Accept: "text/html" },
          cache: "no-store",
        });
        if (!page.ok) continue;
        const pageHtml = await page.text();
        const source = classifyUsniTitle(link.title);
        if (!source) continue;
        const body = stripHtml(pageHtml).slice(0, 12000);
        reports.push(
          toDraft({
            source,
            url: link.url,
            title: link.title,
            summary: body.slice(0, 280),
            publishedAt: null,
            body,
          }),
        );
      } catch {
        /* skip article */
      }
    }
    return { reports, via: reports.length ? "archive" : "empty" };
  } catch {
    return { reports: [], via: "empty" };
  }
}
