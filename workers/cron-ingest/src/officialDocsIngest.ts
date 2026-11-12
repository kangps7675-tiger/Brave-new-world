/**
 * 각국 정부·기구의 공식 문서 새 글 → D1 `official_doc_feed`.
 *
 *  - 소스: `src/data/officialFeeds.json`(등록한 피드) + ISSUERS에 내장된 피드(영국·EU)
 *    + `src/data/officialListPages.json`(RSS 없는 사이트의 목록 페이지: 나토·대만·프랑스·한국·일본 총리관저)
 *  - 합의문·팩트시트·회담 요약·성명·조약만 남긴다(`worthKeeping`). 연설·일반 보도자료는 버린다.
 *  - 원문은 저장하지 않는다. 제목 + 링크 + 요약 280자 + 읽힌 지명 태그만(이용 조건이 사이트마다 다르다).
 *  - 30분 최소 간격 자체 스로틀. 피드별 성공·실패를 `official_doc_poll`에 남긴다
 *    (정부 사이트가 Cloudflare Worker 주소를 막는지 이 표로 알 수 있다).
 *  - 실패해도 메인 인제스트는 안 깨지게 호출부에서 try/catch
 */

import type { IngestEnv } from "./env";
import { rowsFromOfficialFeed, officialFeedSources, type OfficialDocFeedWriteRow } from "../../../src/lib/officialDocs/ingestRows";
import { parseListPage } from "../../../src/lib/officialDocs/listPages";

const UA = "Mozilla/5.0 (compatible; StraitDesk-Ingest/1.0; official-docs monitor)";
const RETENTION_DAYS = 180;

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
  const build = (withAgency: boolean) =>
    rows.map((r) =>
      withAgency
        ? db
            .prepare(
              `INSERT INTO official_doc_feed (id, issuer_id, kind, weight, title, url, published_at, summary, tags, feed, agency, ingested_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
               ON CONFLICT(id) DO NOTHING`,
            )
            .bind(r.id, r.issuer_id, r.kind, r.weight, r.title, r.url, r.published_at, r.summary, r.tags, r.feed, r.agency, ingestedAt)
        : db
            .prepare(
              `INSERT INTO official_doc_feed (id, issuer_id, kind, weight, title, url, published_at, summary, tags, feed, ingested_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
               ON CONFLICT(id) DO NOTHING`,
            )
            .bind(r.id, r.issuer_id, r.kind, r.weight, r.title, r.url, r.published_at, r.summary, r.tags, r.feed, ingestedAt),
    );
  const run = async (stmts: D1PreparedStatement[]) => {
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  };
  try {
    await run(build(true));
  } catch (e) {
    // 0043(agency 칸)이 아직 적용되지 않은 D1이면 칸 없이 저장한다 — 수집이 멈추지 않게
    if (e instanceof Error && /agency/i.test(e.message)) await run(build(false));
    else throw e;
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
        const body = await res.text();
        const rows = await rowsFromOfficialFeed(body, source);
        // 목록 페이지는 구조가 바뀌면 0건이 되므로, 읽는 함수가 아무것도 못 읽었을 때를 실패로 남긴다
        if (source.page && parseListPage(body, source.url, source.issuerId).length === 0) {
          throw new Error("목록 페이지에서 0건 — 구조가 바뀌었거나 막힌 응답");
        }
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
