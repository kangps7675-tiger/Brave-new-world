/**
 * 각국 정부·기구의 공식 문서 새 글 → D1 `official_doc_feed`.
 *
 *  - 소스: `src/data/officialFeeds.json`(등록한 피드) + ISSUERS에 내장된 피드(영국·EU)
 *  - 합의문·팩트시트·회담 요약·성명·조약만 남긴다(`worthKeeping`). 연설·일반 보도자료는 버린다.
 *  - 원문은 저장하지 않는다. 제목 + 링크 + 요약 280자 + 읽힌 지명 태그만(이용 조건이 사이트마다 다르다).
 *  - 30분 최소 간격 자체 스로틀. 피드별 성공·실패를 `official_doc_poll`에 남긴다
 *    (정부 사이트가 Cloudflare Worker 주소를 막는지 이 표로 알 수 있다).
 *  - 실패해도 메인 인제스트는 안 깨지게 호출부에서 try/catch
 */

import type { IngestEnv } from "./env";
import feedsJson from "../../../src/data/officialFeeds.json";
import { ISSUERS } from "../../../src/data/officialDocs";
import { parseOfficialFeed, worthKeeping, type DocCandidate } from "../../../src/lib/officialDocs/feed";
import { rareTagsOf } from "../../../src/lib/news/eventScenarios";

const UA = "Mozilla/5.0 (compatible; StraitDesk-Ingest/1.0; official-docs monitor)";
const RETENTION_DAYS = 180;
const MAX_NEW_PER_FEED = 60;

export type OfficialDocFeedSource = { issuerId: string; url: string; label: string };

export function officialFeedSources(): OfficialDocFeedSource[] {
  const out: OfficialDocFeedSource[] = [];
  const seen = new Set<string>();
  const add = (s: OfficialDocFeedSource) => {
    if (seen.has(s.url)) return;
    seen.add(s.url);
    out.push(s);
  };
  for (const f of feedsJson as OfficialDocFeedSource[]) add(f);
  for (const issuer of ISSUERS) {
    for (const f of issuer.feeds) if (f.url) add({ issuerId: issuer.id, url: f.url, label: f.label });
  }
  return out;
}

export type OfficialDocFeedWriteRow = {
  id: string;
  issuer_id: string;
  kind: string;
  weight: string;
  title: string;
  url: string;
  published_at: string | null;
  summary: string;
  tags: string;
  feed: string;
};

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

/** 피드 XML → 저장할 행 (테스트용으로 export) */
export async function rowsFromOfficialFeed(xml: string, source: OfficialDocFeedSource): Promise<OfficialDocFeedWriteRow[]> {
  const rows: OfficialDocFeedWriteRow[] = [];
  const candidates: DocCandidate[] = parseOfficialFeed(xml, source.issuerId).filter(worthKeeping);
  for (const c of candidates.slice(0, MAX_NEW_PER_FEED)) {
    rows.push({
      id: await sha1Hex(c.url),
      issuer_id: c.issuerId,
      kind: c.kind,
      weight: c.weight,
      title: c.title.slice(0, 300),
      url: c.url,
      published_at: c.publishedAt,
      summary: c.summary,
      tags: rareTagsOf(`${c.title}. ${c.summary}`).join(","),
      feed: source.label,
    });
  }
  return rows;
}

async function shouldPoll(db: D1Database, minIntervalMinutes: number): Promise<boolean> {
  try {
    const row = await db.prepare(`SELECT MAX(checked_at) AS last FROM official_doc_poll`).first<{ last: string | null }>();
    const last = row?.last;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return Date.now() - lastMs >= minIntervalMinutes * 60 * 1000 - 60_000;
  } catch {
    return true;
  }
}

async function upsertRows(db: D1Database, rows: OfficialDocFeedWriteRow[]): Promise<void> {
  if (rows.length === 0) return;
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((r) =>
    db
      .prepare(
        `INSERT INTO official_doc_feed (id, issuer_id, kind, weight, title, url, published_at, summary, tags, feed, ingested_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(r.id, r.issuer_id, r.kind, r.weight, r.title, r.url, r.published_at, r.summary, r.tags, r.feed, ingestedAt),
  );
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
}

async function recordPoll(db: D1Database, feed: string, ok: boolean, items: number, error: string | null): Promise<void> {
  await db
    .prepare(
      `INSERT INTO official_doc_poll (feed, checked_at, ok, items, error) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(feed) DO UPDATE SET checked_at = excluded.checked_at, ok = excluded.ok,
         items = excluded.items, error = excluded.error`,
    )
    .bind(feed, new Date().toISOString(), ok ? 1 : 0, items, error)
    .run();
}

export async function fetchAndUpsertOfficialDocs(env: IngestEnv): Promise<{
  stored: number;
  feedsOk: number;
  feedsFailed: number;
  errors: string[];
  skipped: boolean;
}> {
  const vars = env as unknown as Record<string, string | undefined>;
  const flag = (vars.OFFICIAL_DOCS_INGEST_ENABLED ?? "true").toLowerCase();
  if (flag === "false" || flag === "0") return { stored: 0, feedsOk: 0, feedsFailed: 0, errors: [], skipped: true };

  const minInterval = Math.max(10, Number(vars.OFFICIAL_DOCS_POLL_MIN_INTERVAL_MINUTES) || 30);
  if (!(await shouldPoll(env.DB, minInterval))) return { stored: 0, feedsOk: 0, feedsFailed: 0, errors: [], skipped: true };

  const errors: string[] = [];
  const all: OfficialDocFeedWriteRow[] = [];
  let feedsOk = 0;
  let feedsFailed = 0;

  const results = await Promise.allSettled(
    officialFeedSources().map(async (source) => {
      try {
        const res = await fetch(source.url, {
          headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*", "User-Agent": UA },
          redirect: "follow",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await rowsFromOfficialFeed(await res.text(), source);
        await recordPoll(env.DB, source.label, true, rows.length, null).catch(() => undefined);
        return rows;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordPoll(env.DB, source.label, false, 0, msg.slice(0, 200)).catch(() => undefined);
        throw new Error(`${source.label}: ${msg}`);
      }
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled") {
      feedsOk += 1;
      all.push(...r.value);
    } else {
      feedsFailed += 1;
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
  }

  const unique = [...new Map(all.map((r) => [r.id, r])).values()];
  try {
    await upsertRows(env.DB, unique);
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
    await env.DB.prepare(`DELETE FROM official_doc_feed WHERE ingested_at < ?1`).bind(cutoff).run();
  } catch (e) {
    errors.push(e instanceof Error ? `official_doc_feed upsert: ${e.message}` : "official_doc_feed upsert failed (run migration 0042?)");
  }
  return { stored: unique.length, feedsOk, feedsFailed, errors: errors.slice(0, 8), skipped: false };
}
