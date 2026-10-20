/**
 * CRINK 허브 모니터 인제스트 순수 로직 — RSS/Google News → ReferenceMonitorRow + 좌표.
 * fetch·D1 은 workers/cron-ingest 가 담당.
 */

import {
  crinkHubMonitorSources,
  type CrinkSourceDef,
} from "@/data/crinkSourceRegistry";
import { resolveCrinkPlace } from "@/data/crinkPlaceGazetteer";
import {
  referenceItemId,
  scoreRelevance,
  type ReferenceMonitorRow,
} from "@/lib/referenceMonitor";

const TAG_RE = /<[^>]*>/g;

function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8216;|&lsquo;/gi, "'")
    .replace(/&#8220;|&ldquo;/gi, '"')
    .replace(/&#8221;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, "-")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&amp;/g, "&");
}

function plainText(raw: string | null | undefined, max = 400): string {
  if (!raw) return "";
  const text = decodeEntities(raw).replace(TAG_RE, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function firstTag(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return m ? m[1] : null;
}

function allTags(block: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  let m = re.exec(block);
  while (m) {
    out.push(m[1]!);
    m = re.exec(block);
  }
  return out;
}

function toIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = decodeEntities(raw).trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export type HubMonitorRow = ReferenceMonitorRow & {
  hub: string;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  thumb_credit: string | null;
};

function enrichGeo(title: string, summary: string, hub: CrinkSourceDef["hub"]): {
  place_id: string | null;
  lat: number | null;
  lng: number | null;
} {
  const hit = resolveCrinkPlace(`${title} ${summary}`, hub);
  if (!hit) return { place_id: null, lat: null, lng: null };
  return { place_id: hit.placeId, lat: hit.lat, lng: hit.lng };
}

/** 범용 RSS/Atom item → hub monitor 행 */
export function parseHubMonitorFeedXml(
  source: CrinkSourceDef,
  xml: string,
  maxItems = 20,
): HubMonitorRow[] {
  const rows: HubMonitorRow[] = [];
  const blocks = [...allTags(xml, "item"), ...allTags(xml, "entry")];
  for (const item of blocks) {
    if (rows.length >= maxItems) break;
    const linkRaw =
      plainText(firstTag(item, "link"), 500) ||
      (() => {
        const href = /<link[^>]+href=["']([^"']+)["']/i.exec(item);
        return href?.[1] ? decodeEntities(href[1]).trim() : "";
      })();
    const title = plainText(firstTag(item, "title"), 300);
    if (!linkRaw || !title) continue;

    const summary =
      plainText(firstTag(item, "description"), 400) ||
      plainText(firstTag(item, "summary"), 400) ||
      plainText(firstTag(item, "content:encoded"), 400) ||
      plainText(firstTag(item, "content"), 400);
    const author =
      plainText(firstTag(item, "dc:creator"), 120) ||
      plainText(firstTag(item, "author"), 120) ||
      plainText(firstTag(item, "name"), 120);
    const categories = allTags(item, "category")
      .map((c) => plainText(c, 80))
      .filter(Boolean)
      .slice(0, 12);
    const published =
      toIso(firstTag(item, "pubDate")) ||
      toIso(firstTag(item, "published")) ||
      toIso(firstTag(item, "updated"));

    const { topics, relevance } = scoreRelevance(`${title} ${summary} ${categories.join(" ")}`);
    const hubTopic = `hub:${source.hub}` as const;
    const topicsWithHub = topics.includes(hubTopic as never)
      ? topics
      : [...topics, hubTopic as (typeof topics)[number]];
    const geo = enrichGeo(title, summary, source.hub);

    // 허브 모니터는 전량이 해당국 분석이라 최소 관련도 보장
    const minRel = source.role === "primary" ? 3 : 2;

    rows.push({
      id: referenceItemId(source.id, linkRaw),
      source: source.id,
      source_label: source.label,
      channel: source.ingest === "google-site" ? "google-rss" : "rss",
      url: linkRaw,
      title,
      summary: summary || null,
      author: author || null,
      categories_json: JSON.stringify(categories),
      topics_json: JSON.stringify(topicsWithHub),
      relevance: Math.max(relevance, minRel),
      published_at: published,
      updated_at: published,
      hub: source.hub,
      place_id: geo.place_id,
      lat: geo.lat,
      lng: geo.lng,
      image_url: null,
      thumb_credit: null,
    });
  }
  return rows;
}

export function hubMonitorFeedTargets(): CrinkSourceDef[] {
  return crinkHubMonitorSources().filter((s) => Boolean(s.feedUrl));
}

/** Beyond Parallel 기존 행에도 hub/geo를 채울 때 사용 */
export function attachHubGeoToRow(
  row: ReferenceMonitorRow,
  hub: CrinkSourceDef["hub"],
): HubMonitorRow {
  const geo = enrichGeo(row.title, row.summary ?? "", hub);
  let topics: string[] = [];
  try {
    topics = JSON.parse(row.topics_json) as string[];
  } catch {
    topics = [];
  }
  const hubTag = `hub:${hub}`;
  if (!topics.includes(hubTag)) topics = [...topics, hubTag];
  return {
    ...row,
    topics_json: JSON.stringify(topics),
    hub,
    place_id: geo.place_id,
    lat: geo.lat,
    lng: geo.lng,
    image_url: null,
    thumb_credit: null,
  };
}
