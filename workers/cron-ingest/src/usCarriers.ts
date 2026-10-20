/**
 * 미 항모 위치 — USNI Fleet Tracker를 cron에서 직접 읽어 us_carrier_snapshots 갱신.
 * Next 앱 warm URL 없이도 돌아가게 Worker 안에서 계산한다 (계산은 src/lib 공용).
 */
import type { UsCarrier } from "../../../src/data/usCarriers";
import { fetchUsniFleetTrackerReports } from "../../../src/lib/shipMovements/usni";
import { buildCarrierSnapshot } from "../../../src/lib/usCarriers/buildSnapshot";
import type { IngestEnv } from "./env";
import { readIntVar } from "./db";

const SNAPSHOT_KEY = "latest";
/** USNI 트래커는 주 1~2회 발행 — 3시간마다 확인이면 발행 당일 반영 */
const DEFAULT_MIN_INTERVAL_MINUTES = 180;

export type CarrierRefreshResult = {
  ok: boolean;
  status: number;
  detail: string;
};

export async function refreshUsCarriers(env: IngestEnv): Promise<CarrierRefreshResult> {
  const db = env.DB;
  const minInterval = Math.max(
    30,
    readIntVar(env, "US_CARRIERS_POLL_MIN_INTERVAL_MINUTES" as keyof IngestEnv, DEFAULT_MIN_INTERVAL_MINUTES),
  );

  const row = await db
    .prepare("SELECT payload_json, ingested_at FROM us_carrier_snapshots WHERE cache_key = ?")
    .bind(SNAPSHOT_KEY)
    .first<{ payload_json: string; ingested_at: string }>();
  const lastMs = row?.ingested_at ? Date.parse(row.ingested_at) : NaN;
  if (Number.isFinite(lastMs) && Date.now() - lastMs < minInterval * 60_000) {
    return { ok: true, status: 204, detail: "skipped (throttle)" };
  }

  let previous: UsCarrier[] | null = null;
  try {
    const parsed = row?.payload_json ? (JSON.parse(row.payload_json) as { carriers?: UsCarrier[] }) : null;
    previous = Array.isArray(parsed?.carriers) ? parsed.carriers : null;
  } catch {
    previous = null;
  }

  const { reports, via } = await fetchUsniFleetTrackerReports();
  const payload = buildCarrierSnapshot(previous, reports, via);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO us_carrier_snapshots
         (cache_key, payload_json, carrier_count, updated_count, fetched_at, source, report_url, ingested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         carrier_count = excluded.carrier_count,
         updated_count = excluded.updated_count,
         fetched_at = excluded.fetched_at,
         source = excluded.source,
         report_url = excluded.report_url,
         ingested_at = excluded.ingested_at`,
    )
    .bind(
      SNAPSHOT_KEY,
      JSON.stringify(payload),
      payload.carriers.length,
      payload.updatedIds?.length ?? 0,
      payload.updatedAt,
      payload.source,
      payload.reportUrl ?? null,
      now,
    )
    .run();

  return {
    ok: true,
    status: 200,
    detail: `${via} · reports ${reports.length} · updated ${(payload.updatedIds ?? []).join(",") || "none"}`,
  };
}
