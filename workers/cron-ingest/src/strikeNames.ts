/**
 * 뉴스에서 피격선 이름을 찾고, 그 이름의 배가 사건 시각에 사건 지점 근처였는지 AIS 로 검증한다.
 * 순수 로직: src/lib/strikeMatch/{newsNames,vesselFind}.ts. 설계 배경은 newsNames.ts 머리말.
 *
 *  A. 검색 (Bing 뉴스 RSS + 해운 전문지 RSS, 비용 0): 사건 1시간 뒤부터 2시간 간격(24h까지), 이후 12시간 간격(72h까지).
 *     기사 제목·요약에서 선명 후보를 뽑아 strike_named(status=new)에 쌓는다. 원문은 저장하지 않는다 — 링크·제목·매체만.
 *  B. 검증 (Datalastic): vessel_find 로 이름 → MMSI, vessel_history 로 사건 ±6h 항적 → 사건 시각 100km 안이면 verified.
 *     항적은 ais_position_history 에도 넣어 화면의 매칭이 같은 근거를 쓰게 한다.
 *     자료가 없으면 unresolved(나중에 다시, 최대 3회), 멀리 있었으면 rejected.
 *
 * ⚠️ vessel_find 응답 모양·크레딧은 실제 호출로 확인 전이다 (vesselFind.ts 머리말). 크레딧은 호출 1회 = 1 로 보수 추정해 기록한다.
 * 비용 가드: datalastic_usage·strike_named(migration 0039)가 없거나 D1 실패 시 Datalastic 호출 안 함. 키 없으면 검색만 한다.
 */

import { DEFAULT_MONTHLY_CREDITS, monthKey } from "../../../src/lib/datalasticAis";
import { isStrikeType } from "../../../src/lib/strikeMatch/strikeType";
import { exclusiveEndDate, parseVesselHistory } from "../../../src/lib/strikeMatch/datalastic";
import {
  extractNamedClaims,
  newsSearchDue,
  outletsByName,
  type NewsItem,
} from "../../../src/lib/strikeMatch/newsNames";
import type { TrackPoint } from "../../../src/lib/strikeMatch/scoreCandidates";
import { parseVesselFind, pickByName, verifyNamedPosition } from "../../../src/lib/strikeMatch/vesselFind";
import { parseRssItems, splitGoogleNewsTitle } from "../../../src/lib/warRisk/rss";
import {
  INCIDENT_LOOKBACK_HOURS,
  canSpendOnEvent,
  historyDays,
  historyRange,
  incidentMs,
} from "../../../src/lib/strikeSnapshot";
import type { AisVesselRow, IngestEnv } from "./env";
import { addUsage, readPositiveInt } from "./strikeSnapshot";
import { appendAisHistory } from "./trackHistory";
import { flushVesselIdentities, recordStaticIdentity } from "./vesselIdentity";
import { unwrapBingLink } from "./warRisk";

const BASE = "https://api.datalastic.com/api/v0";
const UA = "StraitDesk-Ingest/1.0 (+contact: kangps7675@gmail.com; vessel-name news monitor)";
const MAX_SEARCHES_PER_TICK = 2;
const MAX_VERIFY_PER_TICK = 2;
const MAX_VERIFY_TRIES = 3;
const MAX_HISTORY_VESSELS = 3;

const TRADE_FEEDS = [
  "https://gcaptain.com/feed/",
  "https://splash247.com/feed/",
  "https://www.hellenicshippingnews.com/feed/",
];

const bingEn = (q: string) =>
  `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setmkt=en-US&setlang=en-US&cc=US`;

type IncidentRow = {
  id: string;
  type_name: string;
  lat: number;
  lng: number;
  place: string | null;
  region: string | null;
  occurred: string | null;
  created: string | null;
  tries: number | null;
  last_try: string | null;
  verified_n: number;
};

type NamedRow = {
  incident_id: string;
  name_key: string;
  name: string;
  imo: string | null;
  tries: number;
  lat: number;
  lng: number;
  occurred: string | null;
  created: string | null;
};

export type StrikeNamesResult = {
  searched: number;
  claims: number;
  verified: number;
  rejected: number;
  credits: number;
  errors: string[];
};

async function fetchItems(url: string): Promise<NewsItem[]> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseRssItems(xml).map((it) => {
    const { headline, outlet } = splitGoogleNewsTitle(it.title);
    const t = it.pubDate ? Date.parse(it.pubDate) : NaN;
    return {
      title: headline,
      description: it.description || null,
      url: unwrapBingLink(it.link),
      outlet: it.source ?? outlet,
      publishedAt: Number.isFinite(t) ? new Date(t).toISOString() : null,
    };
  });
}

export async function runStrikeNames(env: IngestEnv): Promise<StrikeNamesResult> {
  const out: StrikeNamesResult = { searched: 0, claims: 0, verified: 0, rejected: 0, credits: 0, errors: [] };
  const now = new Date();
  const nowMs = now.getTime();
  const since = new Date(nowMs - INCIDENT_LOOKBACK_HOURS * 3_600_000).toISOString();

  let incidents: IncidentRow[] = [];
  try {
    const q = await env.DB
      .prepare(
        `SELECT i.id AS id, i.incident_type_name AS type_name, i.lat AS lat, i.lng AS lng, i.place AS place, i.region AS region,
                i.utc_date_of_incident AS occurred, i.utc_date_created AS created,
                p.tries AS tries, p.last_try AS last_try,
                (SELECT COUNT(*) FROM strike_named n WHERE n.incident_id = i.id AND n.status = 'verified') AS verified_n
           FROM ukmto_incidents i LEFT JOIN strike_news_poll p ON p.incident_id = i.id
          WHERE COALESCE(i.utc_date_of_incident, i.utc_date_created) >= ?1
          ORDER BY COALESCE(i.utc_date_of_incident, i.utc_date_created) DESC LIMIT 60`,
      )
      .bind(since)
      .all<IncidentRow>();
    incidents = (q.results ?? []).filter((r) => isStrikeType(r.type_name));
  } catch (error) {
    out.errors.push(`strike-names: 테이블 읽기 실패 — 건너뜀 (migration 0039?) ${error instanceof Error ? error.message : ""}`.trim());
    return out;
  }

  // ── A. 뉴스 검색
  const due = incidents.filter((r) => {
    if (r.verified_n > 0) return false;
    const atMs = incidentMs(r.occurred, r.created);
    if (atMs === null) return false;
    const last = r.last_try ? Date.parse(r.last_try) : NaN;
    return newsSearchDue((nowMs - atMs) / 3_600_000, r.tries ?? 0, Number.isFinite(last) ? last : null, nowMs);
  });
  let tradeItems: NewsItem[] | null = null;
  for (const r of due.slice(0, MAX_SEARCHES_PER_TICK)) {
    const atMs = incidentMs(r.occurred, r.created)!;
    try {
      const where = (r.place || r.region || "Strait of Hormuz").trim();
      const items: NewsItem[] = [];
      for (const q of [`${where} vessel struck UKMTO`, `tanker OR vessel struck ${where} drone projectile`]) {
        try {
          items.push(...(await fetchItems(bingEn(q))));
        } catch (e) {
          out.errors.push(`strike-news bing: ${e instanceof Error ? e.message : "failed"}`);
        }
      }
      if (tradeItems === null) {
        tradeItems = [];
        for (const f of TRADE_FEEDS) {
          try {
            tradeItems.push(...(await fetchItems(f)));
          } catch {
            // 개별 피드 실패는 무시 — Bing 결과로 계속
          }
        }
      }
      const claims = extractNamedClaims([...items, ...tradeItems], { atMs, place: r.place });
      out.claims += claims.length;
      const stamp = new Date().toISOString();
      const stmts = [...outletsByName(claims).entries()].map(([key, v]) =>
        env.DB
          .prepare(
            `INSERT INTO strike_named (incident_id, name_key, name, imo, outlets, sources)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(incident_id, name_key) DO UPDATE SET
               outlets = excluded.outlets, sources = excluded.sources, imo = COALESCE(strike_named.imo, excluded.imo)`,
          )
          .bind(
            r.id,
            key,
            v.name,
            v.imo,
            v.outlets.size,
            JSON.stringify(
              v.claims.slice(0, 3).map((c) => ({ url: c.url, outlet: c.outlet, headline: c.headline, publishedAt: c.publishedAt })),
            ),
          ),
      );
      if (stmts.length) await env.DB.batch(stmts);
      await env.DB
        .prepare(
          `INSERT INTO strike_news_poll (incident_id, tries, last_try) VALUES (?1, 1, ?2)
           ON CONFLICT(incident_id) DO UPDATE SET tries = tries + 1, last_try = excluded.last_try`,
        )
        .bind(r.id, stamp)
        .run();
      out.searched += 1;
    } catch (error) {
      out.errors.push(`strike-news ${r.id.slice(0, 8)}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  // ── B. 검증 (Datalastic 키가 있을 때만)
  const key = (env.DATALASTIC_API_KEY ?? "").trim();
  if (!key) {
    out.errors = out.errors.slice(0, 4);
    return out;
  }
  const budget = readPositiveInt(env.DATALASTIC_MONTHLY_CREDITS, DEFAULT_MONTHLY_CREDITS);
  const month = monthKey(now);
  let used = 0;
  let todo: NamedRow[] = [];
  try {
    const u = await env.DB.prepare("SELECT credits FROM datalastic_usage WHERE month = ?").bind(month).first<{ credits: number }>();
    used = u?.credits ?? 0;
    const q = await env.DB
      .prepare(
        `SELECT n.incident_id AS incident_id, n.name_key AS name_key, n.name AS name, n.imo AS imo, n.tries AS tries,
                i.lat AS lat, i.lng AS lng, i.utc_date_of_incident AS occurred, i.utc_date_created AS created
           FROM strike_named n JOIN ukmto_incidents i ON i.id = n.incident_id
          WHERE n.status IN ('new', 'unresolved') AND n.tries < ?1
          ORDER BY n.outlets DESC, n.tries ASC LIMIT 20`,
      )
      .bind(MAX_VERIFY_TRIES)
      .all<NamedRow>();
    todo = q.results ?? [];
  } catch (error) {
    out.errors.push(`strike-names: 예산·후보 읽기 실패 — 검증 안 함 ${error instanceof Error ? error.message : ""}`.trim());
    return out;
  }

  let verifiedThisTick = 0;
  for (const n of todo) {
    if (verifiedThisTick >= MAX_VERIFY_PER_TICK) break;
    const atMs = incidentMs(n.occurred, n.created);
    // 사건 3시간 뒤부터 — 그 전엔 Datalastic 에 사건 직후 표본이 아직 없다
    if (atMs === null || nowMs - atMs < 3 * 3_600_000) continue;
    if (!canSpendOnEvent(used, budget)) {
      out.errors.push(`strike-names: 월 크레딧 예산 소진(${used}/${budget}) — 검증 중단`);
      break;
    }
    verifiedThisTick += 1;
    const stamp = new Date().toISOString();
    const finish = async (status: string, extra: { mmsi?: string | null; dist?: number | null; off?: number | null; note?: string }) => {
      await env.DB
        .prepare(
          `UPDATE strike_named SET status = ?1, mmsi = ?2, dist_km = ?3, offset_min = ?4, tries = tries + 1, checked_at = ?5, note = ?6
            WHERE incident_id = ?7 AND name_key = ?8`,
        )
        .bind(status, extra.mmsi ?? null, extra.dist ?? null, extra.off ?? null, stamp, extra.note ?? null, n.incident_id, n.name_key)
        .run();
    };
    try {
      const fu = new URL(`${BASE}/vessel_find`);
      fu.searchParams.set("api-key", key);
      fu.searchParams.set("name", n.name);
      fu.searchParams.set("fuzzy", "0");
      const fr = await fetch(fu.toString(), { headers: { Accept: "application/json" } });
      if (!fr.ok) {
        out.errors.push(`strike-find ${n.name}: HTTP ${fr.status}`);
        await finish("unresolved", { note: `find-http-${fr.status}` }); // 시도 횟수를 올려 매 틱 재호출을 막는다
        continue;
      }
      const spentFind = 1; // 크레딧 미확인 — 보수 추정
      out.credits += spentFind;
      used += spentFind;
      await addUsage(env, month, spentFind, stamp);
      const found = parseVesselFind(await fr.json());
      const picks = pickByName(found.vessels, { name: n.name, imo: n.imo }, MAX_HISTORY_VESSELS);
      if (!found.ok || picks.length === 0) {
        const last = n.tries + 1 >= MAX_VERIFY_TRIES;
        await finish(last ? "rejected" : "unresolved", { note: found.ok ? "not-found" : "find-failed" });
        continue;
      }

      const range = historyRange(atMs);
      const days = historyDays(range.fromIso, range.toIso);
      const fromMs = Date.parse(range.fromIso);
      const toMs = Date.parse(range.toIso);
      let best: { mmsi: string; dist: number; off: number } | null = null;
      let anyData = false;
      const rowsOut: AisVesselRow[] = [];
      for (const v of picks) {
        if (!canSpendOnEvent(used, budget)) break;
        const hu = new URL(`${BASE}/vessel_history`);
        hu.searchParams.set("api-key", key);
        hu.searchParams.set("mmsi", v.mmsi);
        hu.searchParams.set("from", range.fromIso.slice(0, 10));
        hu.searchParams.set("to", exclusiveEndDate(range.toIso));
        const hr = await fetch(hu.toString(), { headers: { Accept: "application/json" } });
        if (!hr.ok) {
          out.errors.push(`strike-find-history ${v.mmsi}: HTTP ${hr.status}`);
          continue;
        }
        out.credits += days;
        used += days;
        await addUsage(env, month, days, new Date().toISOString());
        const h = parseVesselHistory(await hr.json());
        const pts: TrackPoint[] = h.points.filter((p) => {
          const t = Date.parse(p.sampledAt);
          return t >= fromMs && t <= toMs;
        });
        if (pts.length) anyData = true;
        if (h.imo || v.imo) recordStaticIdentity(v.mmsi, { ImoNumber: h.imo ?? v.imo, Name: h.name ?? v.name ?? n.name });
        const verdict = verifyNamedPosition(pts, { lat: n.lat, lng: n.lng, atMs });
        if (verdict.status === "verified" && (!best || (verdict.distKm ?? 1e9) < best.dist)) {
          best = { mmsi: v.mmsi, dist: verdict.distKm ?? 0, off: verdict.offsetMin ?? 0 };
          for (const p of pts) {
            rowsOut.push({
              id: v.mmsi,
              mmsi: v.mmsi,
              ship_name: h.name ?? v.name ?? n.name,
              lat: p.lat,
              lng: p.lng,
              sog: p.sog,
              cog: p.cog,
              true_heading: null,
              ship_type: null,
              ship_type_label: v.type,
              category: "commercial",
              provider: "datalastic",
              timestamp: p.sampledAt,
              draught: null,
              destination: null,
              length_m: null,
              beam_m: null,
            });
          }
        }
      }
      if (rowsOut.length) {
        await appendAisHistory(env.DB, rowsOut);
        await flushVesselIdentities(env.DB);
      }
      if (best) {
        await finish("verified", { mmsi: best.mmsi, dist: best.dist, off: best.off });
        out.verified += 1;
      } else if (!anyData && n.tries + 1 < MAX_VERIFY_TRIES) {
        await finish("unresolved", { note: "no-history-yet" });
      } else if (!anyData) {
        await finish("unresolved", { note: "no-history" }); // 끝까지 자료가 없음 — 아니라는 뜻이 아니다
      } else {
        await finish("rejected", { note: "far-from-incident" });
        out.rejected += 1;
      }
    } catch (error) {
      out.errors.push(`strike-names ${n.name}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  out.errors = out.errors.slice(0, 4);
  return out;
}
