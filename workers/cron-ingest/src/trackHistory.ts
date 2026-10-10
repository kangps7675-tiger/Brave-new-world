import type { AdsbAircraftRow, AisVesselRow, IngestEnv } from "./env";

/** 이력 버킷 폭 — 대상당 이 간격마다 최대 1행 */
export const TRACK_HISTORY_BUCKET_MINUTES = 30;
const DEFAULT_RETENTION_DAYS = 60;
const INSERT_CHUNK = 50;

function bucketKey(iso: string): string {
  const ms = Date.parse(iso);
  const bucketMs = TRACK_HISTORY_BUCKET_MINUTES * 60_000;
  const start = Number.isFinite(ms) ? Math.floor(ms / bucketMs) * bucketMs : 0;
  return new Date(start).toISOString().slice(0, 16);
}

function validIso(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

export function trackHistoryRetentionDays(env: IngestEnv): number {
  const raw = (env as unknown as Record<string, unknown>).TRACK_HISTORY_RETENTION_DAYS;
  const n = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_RETENTION_DAYS;
  return Math.min(365, Math.max(7, Math.round(n)));
}

export async function appendAisHistory(db: D1Database, vessels: AisVesselRow[]): Promise<number> {
  if (!vessels.length) return 0;
  const ingestedAt = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < vessels.length; i += INSERT_CHUNK) {
    const chunk = vessels.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((v) => {
      const sampledAt = validIso(v.timestamp, ingestedAt);
      return db
        .prepare(
          `INSERT OR IGNORE INTO ais_position_history (
            id, mmsi, ship_name, lat, lng, sog, cog, category, sampled_at, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `${v.mmsi}:${bucketKey(sampledAt)}`,
          v.mmsi,
          v.ship_name,
          v.lat,
          v.lng,
          v.sog,
          v.cog,
          v.category,
          sampledAt,
          ingestedAt,
        );
    });
    const res = await db.batch(statements);
    written += res.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
  }
  return written;
}

export async function appendMilAdsbHistory(
  db: D1Database,
  aircraft: AdsbAircraftRow[],
): Promise<number> {
  const mil = aircraft.filter((a) => a.mode === "mil");
  if (!mil.length) return 0;
  const sampledAt = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < mil.length; i += INSERT_CHUNK) {
    const chunk = mil.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((a) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO adsb_track_history (
            id, hex, callsign, registration, type, lat, lng, altitude,
            ground_speed, track, squawk, sampled_at, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `${a.hex}:${bucketKey(sampledAt)}`,
          a.hex,
          a.callsign,
          a.registration,
          a.type,
          a.lat,
          a.lng,
          a.altitude,
          a.ground_speed,
          a.track,
          a.squawk,
          sampledAt,
          sampledAt,
        ),
    );
    const res = await db.batch(statements);
    written += res.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
  }
  return written;
}

export async function pruneTrackHistory(db: D1Database, retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  let deleted = 0;
  for (const table of ["ais_position_history", "adsb_track_history"]) {
    try {
      const res = await db
        .prepare(`DELETE FROM ${table} WHERE ingested_at < ?`)
        .bind(cutoff)
        .run();
      deleted += res.meta.changes ?? 0;
    } catch {
      // migration 0031 전
    }
  }
  return deleted;
}
