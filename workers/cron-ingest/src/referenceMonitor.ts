/**
 * 레퍼런스 감시 인제스트 — CSIS Beyond Parallel · NTI 갱신 폴링 → D1.
 *
 * 파싱·태깅은 전부 src/lib/referenceMonitor.ts (테스트 가능). 여기는 fetch·스로틀·upsert만.
 *
 * 예의:
 *  - User-Agent 에 연락처 명시
 *  - D1 MAX(ingested_at) 기준 자체 스로틀 (기본 6시간 — 분석물은 시간 단위로 안 바뀐다)
 *  - 실패해도 메인 인제스트 파이프라인은 안 깨지게 상위에서 try/catch
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
import type { IngestEnv } from "./env";
import { readIntVar } from "./db";

const UA =
  "BraveNewWorld-Ingest/1.0 (+contact: kangps7675@gmail.com; non-commercial situational dashboard)";

async function fetchText(url: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": UA },
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
    // Cloudflare 봇 챌린지는 200/403 어느 쪽이든 HTML 을 준다 — JSON.parse 전에 걸러낸다
    const body = await res.text();
    if (!body.trimStart().startsWith("[") && !body.trimStart().startsWith("{")) {
      return { data: null, error: `${url} non-JSON response (bot challenge?)` };
    }
    return { data: JSON.parse(body) as T };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : `${url} fetch failed` };
  }
}

/**
 * NTI 1차 경로 — WordPress REST. 제목·요약·modified 를 다 준다.
 * 환경에 따라 Cloudflare 챌린지를 맞으므로 빈 결과면 sitemap 으로 내려간다.
 */
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

/** NTI 폴백 경로 — sitemap lastmod. 제목은 슬러그 복원이라 품질이 낮다. */
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

/** 마지막 ingested_at으로부터 최소 간격이 지났는지 — 없으면(첫 실행/미마이그레이션) 통과 */
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

export async function upsertReferenceMonitorItems(
  db: D1Database,
  rows: ReferenceMonitorRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO reference_monitor_items (
           id, source, source_label, channel, url, title, summary, author,
           categories_json, topics_json, relevance, published_at, updated_at,
           first_seen_at, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
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
           ingested_at = excluded.ingested_at`,
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
      ),
  );
  // D1 batch limit ~100
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
  /** off | rest | sitemap — NTI가 어느 경로로 들어왔는지 (ingest_runs 진단용) */
  ntiPath: string;
  errors: string[];
  skipped: boolean;
}> {
  const enabled =
    (env.REFERENCE_MONITOR_ENABLED ?? "true").toLowerCase() !== "false" &&
    env.REFERENCE_MONITOR_ENABLED !== "0";
  if (!enabled) {
    return { count: 0, fetched: 0, csis: 0, nti: 0, ntiPath: "off", errors: [], skipped: true };
  }

  const minInterval = Math.max(
    30,
    readIntVar(env, "REFERENCE_MONITOR_POLL_MIN_INTERVAL_MINUTES", 360),
  );
  if (!(await shouldPoll(env.DB, minInterval))) {
    return { count: 0, fetched: 0, csis: 0, nti: 0, ntiPath: "off", errors: [], skipped: true };
  }

  const errors: string[] = [];
  const perChannel = Math.min(
    50,
    Math.max(5, readIntVar(env, "REFERENCE_MONITOR_MAX_PER_CHANNEL", 20)),
  );
  let csisRows: ReferenceMonitorRow[] = [];
  let ntiRows: ReferenceMonitorRow[] = [];

  const csisUrl = (env.CSIS_BEYOND_PARALLEL_FEED_URL || "").trim() || CSIS_BEYOND_PARALLEL_FEED;
  if (csisUrl.toLowerCase() !== "off") {
    const { text, error } = await fetchText(csisUrl);
    if (error) errors.push(error);
    else csisRows = parseCsisBeyondParallelFeed(text).slice(0, perChannel);
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

  const minRelevance = Math.max(0, readIntVar(env, "REFERENCE_MONITOR_MIN_RELEVANCE", 2));
  const fetched = csisRows.length + ntiRows.length;
  const rows = [...csisRows, ...ntiRows].filter((row) => row.relevance >= minRelevance);

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
    ntiPath,
    errors,
    skipped: false,
  };
}
