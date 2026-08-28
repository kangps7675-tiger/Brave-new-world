/**
 * 레퍼런스 감시 인제스트 — CSIS Beyond Parallel · NTI · CRINK 허브 전문 → D1.
 *
 * 파싱·태깅은 src/lib (테스트 가능). 여기는 fetch·스로틀·upsert만.
 */

import {
  CSIS_BEYOND_PARALLEL_FEED,
  NTI_REST_BASE,
  NTI_REST_CHANNELS,
  NTI_SITEMAP_INDEX,
  ntiRestUrl,
  parseCsisBeyondParallelFeed,
  parseNtiRestPosts,
  parseNtiSitemapUrls,
  parseSitemapIndex,
  type ReferenceMonitorRow,
  type WpRestPost,
} from "../../../src/lib/referenceMonitor";
import {
  attachHubGeoToRow,
  hubMonitorFeedTargets,
  parseHubMonitorFeedXml,
  type HubMonitorRow,
} from "../../../src/lib/crinkHubIngest";
import { resolveHubThumbSync } from "../../../src/lib/news/hubThumbResolver";
import type { IngestEnv } from "./env";
import { readIntVar } from "./db";

const UA =
  "BraveNewWorld-Ingest/1.0 (+contact: kangps7675@gmail.com; non-commercial situational dashboard)";

async function fetchText(url: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
        "User-Agent": UA,
      },
    });
    if (!res.ok) return { text: "", error: `${url} HTTP ${res.status}` };
    return { text: await res.text() };
  } catch (error) {
    return { text: "", error: error instanceof Error ? error.message : `${url} fetch failed` };
  }
}

async function fetchJson<T>(url: string): Promise<{ data: T | null; error?: string }> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
    if (!res.ok) return { data: null, error: `${url} HTTP ${res.status}` };
    const body = await res.text();
    if (!body.trimStart().startsWith("[") && !body.trimStart().startsWith("{")) {
      return { data: null, error: `${url} non-JSON response (bot challenge?)` };
    }
    return { data: JSON.parse(body) as T };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : `${url} fetch failed` };
  }
}

async function fetchNtiViaRest(
  base: string,
  perChannel: number,
  errors: string[],
): Promise<ReferenceMonitorRow[]> {
  let rows: ReferenceMonitorRow[] = [];
  for (const channel of NTI_REST_CHANNELS) {
    const { data, error } = await fetchJson<WpRestPost[]>(ntiRestUrl(base, channel, perChannel));
    if (error) {
      errors.push(error);
      continue;
    }
    if (Array.isArray(data)) rows = rows.concat(parseNtiRestPosts(channel, data));
  }
  return rows;
}

async function fetchNtiViaSitemap(
  indexUrl: string,
  perChannel: number,
  errors: string[],
): Promise<ReferenceMonitorRow[]> {
  const { text, error } = await fetchText(indexUrl);
  if (error) {
    errors.push(error);
    return [];
  }
  let rows: ReferenceMonitorRow[] = [];
  for (const child of parseSitemapIndex(text)) {
    const { text: childXml, error: childError } = await fetchText(child.url);
    if (childError) {
      errors.push(childError);
      continue;
    }
    rows = rows.concat(parseNtiSitemapUrls(child.channel, childXml, perChannel));
  }
  return rows;
}

async function shouldPoll(db: D1Database, minIntervalMinutes: number): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT MAX(ingested_at) AS last FROM reference_monitor_items`)
      .first<{ last: string | null }>();
    const last = row?.last;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return Date.now() - lastMs >= minIntervalMinutes * 60 * 1000;
  } catch {
    return true;
  }
}

function withThumb(row: HubMonitorRow): HubMonitorRow {
  const thumb = resolveHubThumbSync({
    title: row.title,
    summary: row.summary,
    placeId: row.place_id,
    lat: row.lat,
    lng: row.lng,
  });
  return {
    ...row,
    image_url: thumb.imageUrl,
    thumb_credit: thumb.thumbCredit,
  };
}

export async function upsertReferenceMonitorItems(
  db: D1Database,
  rows: Array<ReferenceMonitorRow | HubMonitorRow>,
): Promise<number> {
  if (rows.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((row) => {
    const hub = "hub" in row ? (row.hub ?? null) : null;
    const placeId = "place_id" in row ? (row.place_id ?? null) : null;
    const lat = "lat" in row ? (row.lat ?? null) : null;
    const lng = "lng" in row ? (row.lng ?? null) : null;
    const imageUrl = "image_url" in row ? (row.image_url ?? null) : null;
    const thumbCredit = "thumb_credit" in row ? (row.thumb_credit ?? null) : null;
    return db
      .prepare(
        `INSERT INTO reference_monitor_items (
           id, source, source_label, channel, url, title, summary, author,
           categories_json, topics_json, relevance, published_at, updated_at,
           first_seen_at, ingested_at,
           hub, place_id, lat, lng, image_url, thumb_credit
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
                   ?16, ?17, ?18, ?19, ?20, ?21)
         ON CONFLICT(id) DO UPDATE SET
           source_label = excluded.source_label,
           channel = excluded.channel,
           url = excluded.url,
           title = excluded.title,
           summary = excluded.summary,
           author = excluded.author,
           categories_json = excluded.categories_json,
           topics_json = excluded.topics_json,
           relevance = excluded.relevance,
           published_at = excluded.published_at,
           updated_at = excluded.updated_at,
           ingested_at = excluded.ingested_at,
           hub = COALESCE(excluded.hub, reference_monitor_items.hub),
           place_id = COALESCE(excluded.place_id, reference_monitor_items.place_id),
           lat = COALESCE(excluded.lat, reference_monitor_items.lat),
           lng = COALESCE(excluded.lng, reference_monitor_items.lng),
           image_url = COALESCE(excluded.image_url, reference_monitor_items.image_url),
           thumb_credit = COALESCE(excluded.thumb_credit, reference_monitor_items.thumb_credit)`,
      )
      .bind(
        row.id,
        row.source,
        row.source_label,
        row.channel,
        row.url,
        row.title,
        row.summary,
        row.author,
        row.categories_json,
        row.topics_json,
        row.relevance,
        row.published_at,
        row.updated_at,
        ingestedAt,
        ingestedAt,
        hub,
        placeId,
        lat,
        lng,
        imageUrl,
        thumbCredit,
      );
  });
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
  return rows.length;
}

export async function fetchAndUpsertReferenceMonitor(env: IngestEnv): Promise<{
  count: number;
  fetched: number;
  csis: number;
  nti: number;
  crink: number;
  ntiPath: string;
  errors: string[];
  skipped: boolean;
}> {
  const enabled =
    (env.REFERENCE_MONITOR_ENABLED ?? "true").toLowerCase() !== "false" &&
    env.REFERENCE_MONITOR_ENABLED !== "0";
  if (!enabled) {
    return {
      count: 0,
      fetched: 0,
      csis: 0,
      nti: 0,
      crink: 0,
      ntiPath: "off",
      errors: [],
      skipped: true,
    };
  }

  const minInterval = Math.max(
    30,
    readIntVar(env, "REFERENCE_MONITOR_POLL_MIN_INTERVAL_MINUTES", 360),
  );
  if (!(await shouldPoll(env.DB, minInterval))) {
    return {
      count: 0,
      fetched: 0,
      csis: 0,
      nti: 0,
      crink: 0,
      ntiPath: "off",
      errors: [],
      skipped: true,
    };
  }

  const errors: string[] = [];
  const perChannel = Math.min(
    50,
    Math.max(5, readIntVar(env, "REFERENCE_MONITOR_MAX_PER_CHANNEL", 20)),
  );
  let csisRows: HubMonitorRow[] = [];
  let ntiRows: ReferenceMonitorRow[] = [];
  let crinkRows: HubMonitorRow[] = [];

  const csisUrl = (env.CSIS_BEYOND_PARALLEL_FEED_URL || "").trim() || CSIS_BEYOND_PARALLEL_FEED;
  if (csisUrl.toLowerCase() !== "off") {
    const { text, error } = await fetchText(csisUrl);
    if (error) errors.push(error);
    else {
      csisRows = parseCsisBeyondParallelFeed(text)
        .slice(0, perChannel)
        .map((row) => withThumb(attachHubGeoToRow(row, "PRK")));
    }
  }

  const ntiBase = (env.NTI_REST_BASE_URL || "").trim() || NTI_REST_BASE;
  let ntiPath = "off";
  if (ntiBase.toLowerCase() !== "off") {
    ntiRows = await fetchNtiViaRest(ntiBase, perChannel, errors);
    ntiPath = "rest";
    if (ntiRows.length === 0) {
      const sitemapIndex = (env.NTI_SITEMAP_INDEX_URL || "").trim() || NTI_SITEMAP_INDEX;
      if (sitemapIndex.toLowerCase() !== "off") {
        ntiRows = await fetchNtiViaSitemap(sitemapIndex, perChannel, errors);
        ntiPath = "sitemap";
      }
    }
  }

  // CRINK hub-monitor feeds (skip Beyond Parallel — already fetched as csis)
  for (const source of hubMonitorFeedTargets()) {
    if (source.id === "csis-beyond-parallel") continue;
    const url = source.feedUrl;
    if (!url) continue;
    const { text, error } = await fetchText(url);
    if (error) {
      errors.push(error);
      continue;
    }
    crinkRows = crinkRows.concat(
      parseHubMonitorFeedXml(source, text, perChannel).map(withThumb),
    );
  }

  const minRelevance = Math.max(0, readIntVar(env, "REFERENCE_MONITOR_MIN_RELEVANCE", 2));
  const fetched = csisRows.length + ntiRows.length + crinkRows.length;
  const rows = [...csisRows, ...ntiRows, ...crinkRows].filter(
    (row) => row.relevance >= minRelevance,
  );

  let count = 0;
  try {
    count = await upsertReferenceMonitorItems(env.DB, rows);
  } catch (e) {
    errors.push(
      e instanceof Error
        ? `reference monitor upsert: ${e.message}`
        : "reference monitor upsert failed (run migration?)",
    );
  }

  return {
    count,
    fetched,
    csis: csisRows.length,
    nti: ntiRows.length,
    crink: crinkRows.length,
    ntiPath,
    errors,
    skipped: false,
  };
}
