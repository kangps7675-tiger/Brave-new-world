/**
 * 각국 정부·기구의 공식 문서 새 글 → D1 `official_doc_feed`.
 *
 *  - 소스: `src/data/officialFeeds.json`(등록한 피드) + ISSUERS에 내장된 피드(영국·EU)
 *    + `src/data/officialListPages.json`(RSS 없는 사이트의 목록 페이지: 나토·대만·프랑스·한국·일본 총리관저)
 *  - 합의문·팩트시트·회담 요약·성명·조약만 남긴다(`worthKeeping`). 연설·일반 보도자료는 버린다.
 *  - 목록에는 제목 + 링크 + 요약 280자 + 읽힌 지명 태그만 둔다. 문서에 붙은 원본 PDF는 별도로 받아 R2에 보관하고(capturePending),
 *    웹 아카이브(archive.org) 보관본 주소도 받아 둔다(archivePending). 우리 서버에서 직접 펼쳐 보여 주는 나라는 capture.ts의 FILE_DISPLAY_ISSUERS가 정한다.
 *  - 30분 최소 간격 자체 스로틀. 피드별 성공·실패를 `official_doc_poll`에 남긴다
 *    (정부 사이트가 Cloudflare Worker 주소를 막는지 이 표로 알 수 있다).
 *  - 실패해도 메인 인제스트는 안 깨지게 호출부에서 try/catch
 */

import type { IngestEnv } from "./env";
import { candidatesOfBody, rowsFromOfficialFeed, officialFeedSources, type OfficialDocFeedWriteRow } from "../../../src/lib/officialDocs/ingestRows";
import { japanMofaDetailDate } from "../../../src/lib/officialDocs/listPages";
import { translateDoc, type Translator } from "../../../src/lib/officialDocs/translate";
import { translateWithProviders } from "../../../src/lib/translateProviders";
import { rareTagsOf } from "../../../src/lib/news/eventScenarios";
import { FILE_MAX_BYTES, archiveSaveUrl, archiveUrlOf, fileKeyOf, isPdfBytes, isPdfUrl, pdfLinksOf, sha256Hex } from "../../../src/lib/officialDocs/capture";

const UA = "Mozilla/5.0 (compatible; StraitDesk-Ingest/1.0; official-docs monitor)";
const RETENTION_DAYS = 180;
/** 상세 페이지로 연도를 확정하는 일본 외무성 항목: 새로 보는 것만, 한 번에 이 개수까지 */
const DETAIL_DATE_MAX_PER_RUN = 20;
/** 한 번 실행에서 번역할 문서 수(문서당 호출 2~4번) — 워커의 하위 요청 한도 안에서 */
const TRANSLATE_MAX_PER_RUN = 20;
/** 번역을 이만큼 시도해도 안 되면 포기한다(막힌 문장 때문에 대기열이 멈추지 않게) */
const TRANSLATE_MAX_TRIES = 3;
const TRANSLATE_UA = "ConflictViewBot/1.0 (official-docs title translation)";
/** 원본 파일·보관본은 이 일수 안에 나온 문서만 받는다(옛 문서를 한꺼번에 긁지 않는다) */
const CAPTURE_WINDOW_DAYS = 21;
/** 한 번 실행에서 원본 파일을 받을 문서 수 / 아카이브 요청 수 — 워커의 하위 요청 한도 안에서 */
const CAPTURE_MAX_PER_RUN = 6;
const ARCHIVE_MAX_PER_RUN = 4;
const CAPTURE_MAX_TRIES = 3;
const ARCHIVE_MAX_TRIES = 2;
/** file_tries 가 이 값이면 이 문서에는 받을 PDF가 없다는 뜻 — 다시 시도하지 않는다 */
const NO_FILE = 99;
const CAPTURE_UA = "ConflictViewBot/1.0 (+https://github.com/kangps7675-tiger/Brave-new-world; official-docs archive)";

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

/**
 * 일본 외무성 목록은 날짜에 연도가 없어 추정값이 들어 있다. DB에 아직 없는 새 항목만 상세 페이지를 열어 연도까지 확정한다
 * (이미 저장한 항목은 다시 받지 않는다). 실패하면 추정값을 그대로 쓴다.
 */
async function refineJapanDates(db: D1Database, rows: OfficialDocFeedWriteRow[]): Promise<void> {
  const jp = rows.filter((r) => /(^|\.)mofa\.go\.jp$/i.test(new URL(r.url).hostname));
  if (jp.length === 0) return;
  const known = new Set<string>();
  try {
    for (let i = 0; i < jp.length; i += 50) {
      const ids = jp.slice(i, i + 50).map((r) => r.id);
      const res = await db
        .prepare(`SELECT id FROM official_doc_feed WHERE id IN (${ids.map((_, k) => `?${k + 1}`).join(",")})`)
        .bind(...ids)
        .all<{ id: string }>();
      for (const r of res.results ?? []) known.add(r.id);
    }
  } catch {
    return;
  }
  for (const row of jp.filter((r) => !known.has(r.id)).slice(0, DETAIL_DATE_MAX_PER_RUN)) {
    try {
      const res = await fetch(row.url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) continue;
      const date = japanMofaDetailDate(await res.text());
      if (date) row.published_at = date;
    } catch {
      /* 추정 날짜 유지 */
    }
  }
}

/**
 * 번역이 아직 없는 최근 문서를 골라 제목·요약을 한국어·영어로 번역해 채운다. 0044 마이그레이션 전이면 조용히 건너뛴다.
 * 번역이 연속 3번 실패하면(공급자가 막히거나 한도) 이번 실행은 멈춘다.
 */
async function translatePending(db: D1Database, vars: Record<string, string | undefined>): Promise<number> {
  let rows: Array<{ id: string; title: string; summary: string; tags: string }>;
  try {
    const res = await db
      .prepare(
        `SELECT id, title, summary, tags FROM official_doc_feed
         WHERE translate_tries < ?1 AND (title_ko = '' OR title_en = '')
         ORDER BY published_at DESC LIMIT ?2`,
      )
      .bind(TRANSLATE_MAX_TRIES, TRANSLATE_MAX_PER_RUN)
      .all<{ id: string; title: string; summary: string; tags: string }>();
    rows = res.results ?? [];
  } catch {
    return 0; // 0044가 아직 적용되지 않음
  }
  const tr: Translator = async (text, target) => (await translateWithProviders(text, target, { env: vars, userAgent: TRANSLATE_UA }))?.text ?? null;
  let done = 0;
  let consecutiveFails = 0;
  for (const row of rows) {
    if (consecutiveFails >= 3) break;
    const out = await translateDoc({ title: row.title, summary: row.summary }, tr).catch(() => null);
    if (out) {
      consecutiveFails = 0;
      done += 1;
      // 원문이 영어가 아니라 지명이 안 읽혔던 문서는 영어 번역으로 다시 읽어 지명 태그를 보탠다(속보 매칭이 지명으로 붙는다)
      const kept = row.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const tags = [...new Set([...kept, ...rareTagsOf(`${out.titleEn}. ${out.summaryEn}`)])].join(",");
      await db
        .prepare(`UPDATE official_doc_feed SET title_ko = ?2, title_en = ?3, summary_ko = ?4, summary_en = ?5, tags = ?6 WHERE id = ?1`)
        .bind(row.id, out.titleKo, out.titleEn, out.summaryKo, out.summaryEn, tags)
        .run()
        .catch(() => undefined);
    } else {
      consecutiveFails += 1;
      await db.prepare(`UPDATE official_doc_feed SET translate_tries = translate_tries + 1 WHERE id = ?1`).bind(row.id).run().catch(() => undefined);
    }
  }
  return done;
}

/**
 * 문서에 붙은 원본 파일(PDF)을 받아 R2에 보관하고 받은 시각·SHA-256을 남긴다. 어느 나라 문서든 같은 규칙.
 *  - 문서 주소가 PDF이면 그 파일, HTML 페이지이면 같은 사이트의 첫 PDF 링크. PDF가 없는 문서는 한 번만 보고 포기(NO_FILE).
 *  - 파일이 %PDF- 로 시작하지 않으면(차단·로그인 화면) 저장하지 않고 시도 횟수만 올린다.
 *  - 0045 마이그레이션 전이거나 R2 바인딩이 없으면 조용히 건너뛴다.
 */
async function capturePending(env: IngestEnv): Promise<number> {
  const bucket = env.DATA_BUCKET;
  if (!bucket) return 0;
  let rows: Array<{ id: string; url: string }>;
  try {
    const res = await env.DB
      .prepare(
        `SELECT id, url FROM official_doc_feed
         WHERE file_tries < ?1 AND file_fetched_at = '' AND published_at >= date('now', ?2)
         ORDER BY published_at DESC LIMIT ?3`,
      )
      .bind(CAPTURE_MAX_TRIES, `-${CAPTURE_WINDOW_DAYS} days`, CAPTURE_MAX_PER_RUN)
      .all<{ id: string; url: string }>();
    rows = res.results ?? [];
  } catch {
    return 0; // 0045가 아직 적용되지 않음
  }
  const fail = (id: string, finalTry = false) =>
    env.DB
      .prepare(`UPDATE official_doc_feed SET file_tries = ?2 WHERE id = ?1`)
      .bind(id, finalTry ? NO_FILE : 1)
      .run()
      .catch(() => undefined);
  const retry = (id: string) =>
    env.DB.prepare(`UPDATE official_doc_feed SET file_tries = file_tries + 1 WHERE id = ?1`).bind(id).run().catch(() => undefined);

  let done = 0;
  for (const row of rows) {
    try {
      const page = await fetch(row.url, { headers: { "User-Agent": CAPTURE_UA, Accept: "text/html,application/pdf,*/*" }, redirect: "follow", signal: AbortSignal.timeout(25_000) });
      if (!page.ok) {
        await retry(row.id);
        continue;
      }
      let fileUrl = page.url;
      let bytes: ArrayBuffer;
      if (isPdfUrl(page.url) || /application\/pdf/i.test(page.headers.get("content-type") ?? "")) {
        bytes = await page.arrayBuffer();
      } else {
        const links = pdfLinksOf(await page.text(), page.url);
        if (links.length === 0) {
          await fail(row.id, true);
          continue;
        }
        fileUrl = links[0];
        const f = await fetch(fileUrl, { headers: { "User-Agent": CAPTURE_UA, Accept: "application/pdf,*/*" }, redirect: "follow", signal: AbortSignal.timeout(30_000) });
        const len = Number(f.headers.get("content-length") ?? 0);
        if (!f.ok || len > FILE_MAX_BYTES) {
          await (len > FILE_MAX_BYTES ? fail(row.id, true) : retry(row.id));
          continue;
        }
        bytes = await f.arrayBuffer();
      }
      if (bytes.byteLength > FILE_MAX_BYTES) {
        await fail(row.id, true);
        continue;
      }
      if (!isPdfBytes(bytes)) {
        await retry(row.id);
        continue;
      }
      const sha = await sha256Hex(bytes);
      const key = fileKeyOf(row.id, sha);
      await bucket.put(key, bytes, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { docId: row.id, sourceUrl: fileUrl, sha256: sha } });
      await env.DB
        .prepare(
          `UPDATE official_doc_feed SET file_key = ?2, file_type = 'application/pdf', file_bytes = ?3, file_sha256 = ?4,
             file_fetched_at = ?5, file_source_url = ?6 WHERE id = ?1`,
        )
        .bind(row.id, key, bytes.byteLength, sha, new Date().toISOString(), fileUrl)
        .run();
      done += 1;
    } catch {
      await retry(row.id);
    }
  }
  return done;
}

/**
 * 웹 아카이브(archive.org)에 문서 페이지 저장을 요청하고 보관본 주소를 받아 둔다. 시각이 찍힌 제3자 사본이라
 * 정부가 나중에 글을 고치거나 지워도 "그때는 이랬다"의 증거가 된다. 아카이브가 거절하는 페이지·호출 한도가 있어 전부 보장되진 않는다.
 */
async function archivePending(env: IngestEnv): Promise<number> {
  let rows: Array<{ id: string; url: string }>;
  try {
    const res = await env.DB
      .prepare(
        `SELECT id, url FROM official_doc_feed
         WHERE archive_url = '' AND archive_tries < ?1 AND published_at >= date('now', ?2)
         ORDER BY published_at DESC LIMIT ?3`,
      )
      .bind(ARCHIVE_MAX_TRIES, `-${CAPTURE_WINDOW_DAYS} days`, ARCHIVE_MAX_PER_RUN)
      .all<{ id: string; url: string }>();
    rows = res.results ?? [];
  } catch {
    return 0;
  }
  let done = 0;
  for (const row of rows) {
    let archived: string | null = null;
    try {
      const res = await fetch(archiveSaveUrl(row.url), { headers: { "User-Agent": CAPTURE_UA }, redirect: "follow", signal: AbortSignal.timeout(40_000) });
      if (res.ok) archived = archiveUrlOf(res.headers, res.url);
    } catch {
      /* 시간 초과·거절은 아래에서 시도 횟수만 올린다 */
    }
    if (archived) {
      done += 1;
      await env.DB.prepare(`UPDATE official_doc_feed SET archive_url = ?2 WHERE id = ?1`).bind(row.id, archived).run().catch(() => undefined);
    } else {
      await env.DB.prepare(`UPDATE official_doc_feed SET archive_tries = archive_tries + 1 WHERE id = ?1`).bind(row.id).run().catch(() => undefined);
    }
  }
  return done;
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
        // 구조가 바뀌거나 막힌 응답(로그인·확인창 HTML)이면 읽는 함수가 한 건도 못 읽는다. 필터 전 0건을 실패로 남겨 조용히 죽지 않게 한다.
        // 연방관보 주제 검색은 새 문서가 정말 0건일 수 있어서 제외한다.
        if (source.format !== "federal-register" && candidatesOfBody(body, source).length === 0) {
          throw new Error("읽힌 항목 0건 — 구조가 바뀌었거나 막힌 응답");
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
    await refineJapanDates(env.DB, unique);
    await upsertRows(env.DB, unique);
    // 번역 실패가 수집을 깨면 안 된다
    await translatePending(env.DB, vars).catch(() => 0);
    // 원본 파일·보관본이 실패해도 수집은 계속된다
    await capturePending(env).catch(() => 0);
    await archivePending(env).catch(() => 0);
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
    await env.DB.prepare(`DELETE FROM official_doc_feed WHERE ingested_at < ?1`).bind(cutoff).run();
  } catch (e) {
    errors.push(e instanceof Error ? `official_doc_feed upsert: ${e.message}` : "official_doc_feed upsert failed (run migration 0042?)");
  }
  return { stored: unique.length, feedsOk, feedsFailed, errors: errors.slice(0, 8), skipped: false };
}
