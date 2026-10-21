/**
 * 피격 사건 트리거 Datalastic 스냅샷 — 상시 폴링 대신 "사건이 터진 그 지점"만 본다.
 * 순수 로직은 src/lib/strikeSnapshot.ts. 설계·한계는 그 파일 머리말.
 *
 *  1단계 (새 사건 즉시): vessel_inradius(사건 지점, 30NM — 늦은 보고는 50NM) → ais_position_history 적재,
 *                        이력을 받을 후보 10척을 strike_snapshot 에 기록. 근처에서 90분 안에 찍은 스냅샷이 있으면 재사용(0크레딧).
 *  2단계 (사건 3시간 뒤): 후보 10척 vessel_history(사건 ±6시간) → ais_position_history 적재.
 *
 * 비용 가드: datalastic_usage(월 집계, migration 0037)·strike_snapshot(0038)이 없거나 D1 이 실패하면 호출하지 않는다 (fail-closed).
 * 키가 없으면 아무것도 안 한다. 실패해도 메인 파이프라인은 안 깨진다 (호출부 try/catch).
 */

import { DEFAULT_MONTHLY_CREDITS, categoryFromType, monthKey, parseInradius } from "../../../src/lib/datalasticAis";
import { isStrikeType } from "../../../src/lib/strikeMatch/strikeType";
import { exclusiveEndDate, parseVesselHistory } from "../../../src/lib/strikeMatch/datalastic";
import {
  HISTORY_MAX_TRIES,
  INCIDENT_LOOKBACK_HOURS,
  MAX_HISTORIES_PER_TICK,
  MAX_SNAPSHOTS_PER_TICK,
  SNAPSHOT_MAX_AGE_HOURS,
  aisTypeCodeFromDatalastic,
  canShareSnapshot,
  canSpendOnEvent,
  historyDays,
  historyDue,
  historyRange,
  incidentMs,
  pickCandidates,
  snapshotRadiusNm,
  type SnapshotCandidate,
} from "../../../src/lib/strikeSnapshot";
import { datalasticToAisRow } from "./datalastic";
import type { AisVesselRow, IngestEnv } from "./env";
import { appendAisHistory } from "./trackHistory";
import { flushVesselIdentities, recordStaticIdentity } from "./vesselIdentity";

const BASE = "https://api.datalastic.com/api/v0";

type Row = {
  id: string;
  type_name: string;
  lat: number;
  lng: number;
  vessel_type: string | null;
  occurred: string | null;
  created: string | null;
  stage: number | null;
  snapshot_at: string | null;
  candidates: string | null;
  history_tries: number | null;
};

export type StrikeSnapshotResult = {
  snapshots: number;
  shared: number;
  histories: number;
  credits: number;
  errors: string[];
};

export function readPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseCandidates(raw: string | null): SnapshotCandidate[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as SnapshotCandidate[]).filter((c) => c && typeof c.mmsi === "string") : [];
  } catch {
    return [];
  }
}

export async function addUsage(env: IngestEnv, month: string, credits: number, stamp: string): Promise<void> {
  await env.DB
    .prepare(
      `INSERT INTO datalastic_usage (month, credits, calls, updated_at) VALUES (?, ?, 1, ?)
       ON CONFLICT(month) DO UPDATE SET credits = credits + excluded.credits, calls = calls + 1, updated_at = excluded.updated_at`,
    )
    .bind(month, credits, stamp)
    .run();
}

export async function runStrikeSnapshots(env: IngestEnv): Promise<StrikeSnapshotResult> {
  const out: StrikeSnapshotResult = { snapshots: 0, shared: 0, histories: 0, credits: 0, errors: [] };
  const key = (env.DATALASTIC_API_KEY ?? "").trim();
  if (!key) return out;

  const budget = readPositiveInt(env.DATALASTIC_MONTHLY_CREDITS, DEFAULT_MONTHLY_CREDITS);
  const now = new Date();
  const nowMs = now.getTime();
  const month = monthKey(now);

  let used = 0;
  let rows: Row[] = [];
  try {
    const u = await env.DB.prepare("SELECT credits FROM datalastic_usage WHERE month = ?").bind(month).first<{ credits: number }>();
    used = u?.credits ?? 0;
    const since = new Date(nowMs - INCIDENT_LOOKBACK_HOURS * 3_600_000).toISOString();
    const q = await env.DB
      .prepare(
        `SELECT i.id AS id, i.incident_type_name AS type_name, i.lat AS lat, i.lng AS lng, i.vessel_type AS vessel_type,
                i.utc_date_of_incident AS occurred, i.utc_date_created AS created,
                s.stage AS stage, s.snapshot_at AS snapshot_at, s.candidates AS candidates, s.history_tries AS history_tries
           FROM ukmto_incidents i LEFT JOIN strike_snapshot s ON s.incident_id = i.id
          WHERE COALESCE(i.utc_date_of_incident, i.utc_date_created) >= ?1
          ORDER BY COALESCE(i.utc_date_of_incident, i.utc_date_created) DESC LIMIT 60`,
      )
      .bind(since)
      .all<Row>();
    rows = (q.results ?? []).filter((r) => isStrikeType(r.type_name));
  } catch (error) {
    out.errors.push(`strike-snapshot: 테이블 읽기 실패 — 호출 안 함 (migration 0037/0038?) ${error instanceof Error ? error.message : ""}`.trim());
    return out;
  }

  const spend = async (credits: number) => {
    if (credits <= 0) return;
    out.credits += credits;
    used += credits;
    await addUsage(env, month, credits, new Date().toISOString());
  };

  // ── 1단계: 새 사건 스냅샷 (오래된 보고부터 말고 최신 사건부터)
  let snaps = 0;
  const donors = rows
    .filter((r) => r.stage != null && r.snapshot_at)
    .map((r) => ({ id: r.id, snapshotAtMs: Date.parse(r.snapshot_at!), lat: r.lat, lng: r.lng, candidates: r.candidates }));

  for (const r of rows) {
    if (r.stage != null || snaps >= MAX_SNAPSHOTS_PER_TICK) continue;
    const atMs = incidentMs(r.occurred, r.created);
    if (atMs === null || nowMs - atMs > SNAPSHOT_MAX_AGE_HOURS * 3_600_000) continue;
    snaps += 1;
    try {
      const donor = donors.find((d) => Number.isFinite(d.snapshotAtMs) && canShareSnapshot(d, r, nowMs));
      const stamp = new Date().toISOString();
      if (donor) {
        await env.DB
          .prepare(
            `INSERT OR IGNORE INTO strike_snapshot (incident_id, stage, snapshot_at, radius_nm, vessel_count, credits, candidates, note)
             VALUES (?, 1, ?, 0, 0, 0, ?, ?)`,
          )
          .bind(r.id, stamp, donor.candidates ?? "[]", `shared:${donor.id}`)
          .run();
        donors.push({ id: r.id, snapshotAtMs: donor.snapshotAtMs, lat: donor.lat, lng: donor.lng, candidates: donor.candidates });
        out.shared += 1;
        continue;
      }
      if (!canSpendOnEvent(used, budget)) {
        out.errors.push(`strike-snapshot: 월 크레딧 예산 소진(${used}/${budget}) — 사건 스냅샷 중단`);
        break;
      }
      const radius = snapshotRadiusNm((nowMs - atMs) / 3_600_000);
      const url = new URL(`${BASE}/vessel_inradius`);
      url.searchParams.set("api-key", key);
      url.searchParams.set("lat", String(r.lat));
      url.searchParams.set("lon", String(r.lng));
      url.searchParams.set("radius", String(radius));
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) {
        out.errors.push(`strike-snapshot ${r.id.slice(0, 8)}: HTTP ${res.status}`);
        continue;
      }
      const parsed = parseInradius(await res.json());
      if (!parsed.ok) {
        out.errors.push(`strike-snapshot ${r.id.slice(0, 8)}: success=false`);
        continue;
      }
      const spent = Math.min(500, parsed.total);
      await spend(spent);
      const aisRows: AisVesselRow[] = parsed.vessels.map(datalasticToAisRow);
      for (const v of parsed.vessels) {
        if (v.imo) recordStaticIdentity(v.mmsi, { ImoNumber: v.imo, Name: v.name, Type: aisTypeCodeFromDatalastic(v.type) ?? undefined });
      }
      await appendAisHistory(env.DB, aisRows);
      await flushVesselIdentities(env.DB);
      const cands = pickCandidates(parsed.vessels, { lat: r.lat, lng: r.lng, vesselType: r.vessel_type });
      await env.DB
        .prepare(
          `INSERT OR IGNORE INTO strike_snapshot (incident_id, stage, snapshot_at, radius_nm, vessel_count, credits, candidates)
           VALUES (?, 1, ?, ?, ?, ?, ?)`,
        )
        .bind(r.id, stamp, radius, parsed.vessels.length, spent, JSON.stringify(cands))
        .run();
      donors.push({ id: r.id, snapshotAtMs: Date.parse(stamp), lat: r.lat, lng: r.lng, candidates: JSON.stringify(cands) });
      out.snapshots += 1;
    } catch (error) {
      out.errors.push(`strike-snapshot ${r.id.slice(0, 8)}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  // ── 2단계: 후보 선박 이력 (사건 3시간 뒤)
  let hist = 0;
  for (const r of rows) {
    if (r.stage !== 1 || hist >= MAX_HISTORIES_PER_TICK) continue;
    if ((r.history_tries ?? 0) >= HISTORY_MAX_TRIES) continue;
    const atMs = incidentMs(r.occurred, r.created);
    if (atMs === null || !historyDue(atMs, nowMs)) continue;
    const cands = parseCandidates(r.candidates);
    hist += 1;
    if (cands.length === 0) {
      await env.DB.prepare("UPDATE strike_snapshot SET stage = 2, history_at = ?, note = COALESCE(note, '') || ' no-candidates' WHERE incident_id = ?")
        .bind(new Date().toISOString(), r.id)
        .run();
      continue;
    }
    const range = historyRange(atMs);
    const days = historyDays(range.fromIso, range.toIso);
    const fromMs = Date.parse(range.fromIso);
    const toMs = Date.parse(range.toIso);
    const rowsOut: AisVesselRow[] = [];
    let ok = 0;
    let spentHere = 0;
    for (const c of cands) {
      if (!canSpendOnEvent(used, budget)) {
        out.errors.push(`strike-snapshot: 월 크레딧 예산 소진(${used}/${budget}) — 이력 보강 중단`);
        break;
      }
      try {
        const url = new URL(`${BASE}/vessel_history`);
        url.searchParams.set("api-key", key);
        url.searchParams.set("mmsi", c.mmsi);
        url.searchParams.set("from", range.fromIso.slice(0, 10));
        url.searchParams.set("to", exclusiveEndDate(range.toIso));
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) {
          out.errors.push(`strike-history ${c.mmsi}: HTTP ${res.status}`);
          continue;
        }
        const h = parseVesselHistory(await res.json());
        await spend(days);
        spentHere += days;
        ok += 1;
        if (h.imo) recordStaticIdentity(c.mmsi, { ImoNumber: h.imo, Name: h.name ?? c.name });
        for (const p of h.points) {
          const t = Date.parse(p.sampledAt);
          if (t < fromMs || t > toMs) continue;
          rowsOut.push({
            id: c.mmsi,
            mmsi: c.mmsi,
            ship_name: h.name ?? c.name,
            lat: p.lat,
            lng: p.lng,
            sog: p.sog,
            cog: p.cog,
            true_heading: null,
            ship_type: null,
            ship_type_label: null,
            category: categoryFromType(null),
            provider: "datalastic",
            timestamp: p.sampledAt,
            draught: null,
            destination: null,
            length_m: null,
            beam_m: null,
          });
        }
      } catch (error) {
        out.errors.push(`strike-history ${c.mmsi}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    try {
      if (rowsOut.length) await appendAisHistory(env.DB, rowsOut);
      await flushVesselIdentities(env.DB);
      const done = ok >= Math.ceil(cands.length / 2);
      await env.DB
        .prepare(
          `UPDATE strike_snapshot SET history_tries = history_tries + 1, history_credits = history_credits + ?,
                  stage = CASE WHEN ? THEN 2 ELSE stage END, history_at = CASE WHEN ? THEN ? ELSE history_at END
            WHERE incident_id = ?`,
        )
        .bind(spentHere, done ? 1 : 0, done ? 1 : 0, new Date().toISOString(), r.id)
        .run();
      if (done) out.histories += 1;
    } catch (error) {
      out.errors.push(`strike-history ${r.id.slice(0, 8)}: ${error instanceof Error ? error.message : "write failed"}`);
    }
  }

  out.errors = out.errors.slice(0, 4);
  return out;
}
