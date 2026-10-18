/**
 * 보도 기준 전쟁위험(war risk) 보험료 → D1 `war_risk_quotes`.
 *
 * 공개 시세가 없으므로 "언론이 보도한 수치"를 기사 단위로 쌓는다.
 *  - 소스: Google News RSS 검색(해역별) + 해운 전문지 RSS(gCaptain, Splash247)
 *  - 기사 제목·요약에서 `extractWarRiskQuote` 가 수치를 못 뽑으면 저장하지 않는다
 *  - 원문은 저장하지 않는다 — 근거 구절(240자 이내) + 링크만 (저작권 체크리스트 기준)
 *  - 60분 최소 간격 자체 스로틀, 실패해도 메인 인제스트는 안 깨지게 호출부에서 try/catch
 */

import type { IngestEnv } from "./env";
import { extractWarRiskQuote } from "../../../src/lib/warRisk/extractPremium";
import { parseRssItems, splitGoogleNewsTitle } from "../../../src/lib/warRisk/rss";

const G_EN = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const G_KO = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;

export const WAR_RISK_FEEDS: Array<{ url: string; name: string }> = [
  { url: G_EN('"war risk" (premium OR premiums OR insurance) when:30d'), name: "Google · war risk" },
  {
    url: G_EN('"war risk" ("Red Sea" OR Houthi OR "Bab el-Mandeb" OR "Gulf of Aden") when:30d'),
    name: "Google · war risk Red Sea",
  },
  {
    url: G_EN('"war risk" (Hormuz OR Gulf OR Iran) (tanker OR shipping OR insurers) when:30d'),
    name: "Google · war risk Hormuz",
  },
  {
    url: G_EN('"war risk" ("Black Sea" OR Ukraine OR Odesa) (insurance OR premium) when:30d'),
    name: "Google · war risk Black Sea",
  },
  { url: G_EN('("hull value" OR "ship\'s value") (insurance OR premium) when:30d'), name: "Google · hull value" },
  { url: G_KO("전쟁위험 보험료 OR 전쟁보험료 OR 전쟁 할증 보험 when:30d"), name: "Google · 전쟁위험 보험료" },
  { url: "https://gcaptain.com/feed/", name: "gCaptain" },
  { url: "https://splash247.com/feed/", name: "Splash247" },
];

export type WarRiskQuoteRow = {
  id: string;
  region: string;
  rate_pct: number | null;
  rate_high_pct: number | null;
  rate_prev_pct: number | null;
  usd_per_voyage: number | null;
  direction: string | null;
  confidence: string;
  quote: string;
  headline: string;
  url: string;
  outlet: string | null;
  feed: string;
  published_at: string | null;
};

const UA =
  "BraveNewWorld-Ingest/1.0 (+contact: kangps7675@gmail.com; war-risk premium news monitor)";

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

function toIso(pubDate: string | null): string | null {
  if (!pubDate) return null;
  const t = Date.parse(pubDate);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** RSS 텍스트 → 저장할 행 (순수 함수, 테스트용으로 export) */
export async function rowsFromFeed(xml: string, feedName: string): Promise<WarRiskQuoteRow[]> {
  const rows: WarRiskQuoteRow[] = [];
  for (const item of parseRssItems(xml)) {
    const { headline, outlet } = splitGoogleNewsTitle(item.title);
    // 제목을 먼저, 요약을 뒤에 — 해역 판정이 제목 첫 지명을 따르도록
    const desc = item.description && !item.description.startsWith(headline) ? item.description : "";
    const q = extractWarRiskQuote(desc ? `${headline}. ${desc}` : headline);
    if (!q) continue;
    rows.push({
      id: await sha1Hex(item.link),
      region: q.region,
      rate_pct: q.ratePct,
      rate_high_pct: q.rateHighPct,
      rate_prev_pct: q.ratePrevPct,
      usd_per_voyage: q.usdPerVoyage,
      direction: q.direction,
      confidence: q.confidence,
      quote: q.quote,
      headline: headline.slice(0, 300),
      url: item.link,
      outlet: item.source ?? outlet,
      feed: feedName,
      published_at: toIso(item.pubDate),
    });
  }
  return rows;
}

async function shouldPoll(db: D1Database, minIntervalMinutes: number): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT MAX(checked_at) AS last FROM war_risk_poll`)
      .first<{ last: string | null }>();
    const last = row?.last;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return Date.now() - lastMs >= minIntervalMinutes * 60 * 1000 - 60_000;
  } catch {
    return true;
  }
}

async function upsertRows(db: D1Database, rows: WarRiskQuoteRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((r) =>
    db
      .prepare(
        `INSERT INTO war_risk_quotes (
           id, region, rate_pct, rate_high_pct, rate_prev_pct, usd_per_voyage, direction, confidence,
           quote, headline, url, outlet, feed, published_at, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        r.id,
        r.region,
        r.rate_pct,
        r.rate_high_pct,
        r.rate_prev_pct,
        r.usd_per_voyage,
        r.direction,
        r.confidence,
        r.quote,
        r.headline,
        r.url,
        r.outlet,
        r.feed,
        r.published_at,
        ingestedAt,
      ),
  );
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
  return rows.length;
}

export async function fetchAndUpsertWarRisk(env: IngestEnv): Promise<{
  count: number;
  scanned: number;
  errors: string[];
  skipped: boolean;
}> {
  const vars = env as unknown as Record<string, string | undefined>;
  const flag = (vars.WAR_RISK_INGEST_ENABLED ?? "true").toLowerCase();
  if (flag === "false" || flag === "0") return { count: 0, scanned: 0, errors: [], skipped: true };

  const minInterval = Math.max(15, Number(vars.WAR_RISK_POLL_MIN_INTERVAL_MINUTES) || 60);
  if (!(await shouldPoll(env.DB, minInterval))) {
    return { count: 0, scanned: 0, errors: [], skipped: true };
  }

  const errors: string[] = [];
  const all: WarRiskQuoteRow[] = [];
  let scanned = 0;

  const results = await Promise.allSettled(
    WAR_RISK_FEEDS.map(async (f) => {
      const res = await fetch(f.url, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": UA },
      });
      if (!res.ok) throw new Error(`${f.name} HTTP ${res.status}`);
      const xml = await res.text();
      scanned += (xml.match(/<item[\s>]/gi) ?? []).length;
      return rowsFromFeed(xml, f.name);
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }

  // 같은 링크가 여러 피드에 걸리면 하나만
  const unique = [...new Map(all.map((r) => [r.id, r])).values()];

  let count = 0;
  try {
    count = await upsertRows(env.DB, unique);
    await env.DB.prepare(
      `INSERT INTO war_risk_poll (id, checked_at, scanned, matched) VALUES (1, ?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET checked_at = excluded.checked_at,
         scanned = excluded.scanned, matched = excluded.matched`,
    )
      .bind(new Date().toISOString(), scanned, unique.length)
      .run();
  } catch (e) {
    errors.push(e instanceof Error ? `war_risk upsert: ${e.message}` : "war_risk upsert failed (run migration 0032?)");
  }

  return { count, scanned, errors: errors.slice(0, 6), skipped: false };
}
