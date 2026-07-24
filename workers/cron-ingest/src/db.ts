import type {
  AdsbAircraftRow,
  AisVesselRow,
  FirmsFireRow,
  GdeltPointRow,
  IngestEnv,
  TelegramAlertRow,
} from "./env";

const INSERT_CHUNK = 40;

function nowIso() {
  return new Date().toISOString();
}

export async function upsertFirmsFires(db: D1Database, fires: FirmsFireRow[]) {
  if (fires.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < fires.length; i += INSERT_CHUNK) {
    const chunk = fires.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((fire) =>
      db
        .prepare(
          `INSERT INTO firms_fires (
            id, lat, lng, frp, brightness, confidence,
            acq_date, acq_time, satellite, daynight, source, theater, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            frp = excluded.frp,
            brightness = excluded.brightness,
            confidence = excluded.confidence,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          fire.id,
          fire.lat,
          fire.lng,
          fire.frp,
          fire.brightness,
          fire.confidence,
          fire.acq_date,
          fire.acq_time,
          fire.satellite,
          fire.daynight,
          fire.source,
          fire.theater,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function upsertGdeltPoints(db: D1Database, points: GdeltPointRow[]) {
  if (points.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < points.length; i += INSERT_CHUNK) {
    const chunk = points.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((point) =>
      db
        .prepare(
          `INSERT INTO gdelt_points (
            id, lat, lng, name, url, mention_count, share_image, query_tag, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            url = excluded.url,
            mention_count = excluded.mention_count,
            share_image = excluded.share_image,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          point.id,
          point.lat,
          point.lng,
          point.name,
          point.url,
          point.mention_count,
          point.share_image,
          point.query_tag,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function upsertTelegramAlerts(db: D1Database, alerts: TelegramAlertRow[]) {
  if (alerts.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < alerts.length; i += INSERT_CHUNK) {
    const chunk = alerts.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((alert) =>
      db
        .prepare(
          `INSERT INTO telegram_alerts (
            id, channel_username, channel_title, region, text, message_url, received_at, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            text = excluded.text,
            channel_title = excluded.channel_title,
            region = excluded.region,
            received_at = excluded.received_at,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          alert.id,
          alert.channel_username,
          alert.channel_title,
          alert.region,
          alert.text,
          alert.message_url,
          alert.received_at,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function upsertAisVessels(db: D1Database, vessels: AisVesselRow[]) {
  if (vessels.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < vessels.length; i += INSERT_CHUNK) {
    const chunk = vessels.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((v) =>
      db
        .prepare(
          `INSERT INTO ais_vessels (
            id, mmsi, ship_name, lat, lng, sog, cog, true_heading,
            ship_type, ship_type_label, category, provider, timestamp, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            ship_name = excluded.ship_name,
            lat = excluded.lat,
            lng = excluded.lng,
            sog = excluded.sog,
            cog = excluded.cog,
            true_heading = excluded.true_heading,
            ship_type = excluded.ship_type,
            ship_type_label = excluded.ship_type_label,
            category = excluded.category,
            provider = excluded.provider,
            timestamp = excluded.timestamp,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          v.id,
          v.mmsi,
          v.ship_name,
          v.lat,
          v.lng,
          v.sog,
          v.cog,
          v.true_heading,
          v.ship_type,
          v.ship_type_label,
          v.category,
          v.provider,
          v.timestamp,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function upsertAdsbAircraft(db: D1Database, aircraft: AdsbAircraftRow[]) {
  if (aircraft.length === 0) return 0;
  const ingestedAt = nowIso();
  let written = 0;

  for (let i = 0; i < aircraft.length; i += INSERT_CHUNK) {
    const chunk = aircraft.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((ac) =>
      db
        .prepare(
          `INSERT INTO adsb_aircraft (
            id, hex, mode, callsign, registration, lat, lng, altitude, altitude_geom,
            ground_speed, track, type, category, db_flags, squawk, emergency,
            payload_json, hub, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            callsign = excluded.callsign,
            registration = excluded.registration,
            lat = excluded.lat,
            lng = excluded.lng,
            altitude = excluded.altitude,
            altitude_geom = excluded.altitude_geom,
            ground_speed = excluded.ground_speed,
            track = excluded.track,
            type = excluded.type,
            category = excluded.category,
            db_flags = excluded.db_flags,
            squawk = excluded.squawk,
            emergency = excluded.emergency,
            payload_json = excluded.payload_json,
            hub = excluded.hub,
            ingested_at = excluded.ingested_at`,
        )
        .bind(
          ac.id,
          ac.hex,
          ac.mode,
          ac.callsign,
          ac.registration,
          ac.lat,
          ac.lng,
          ac.altitude,
          ac.altitude_geom,
          ac.ground_speed,
          ac.track,
          ac.type,
          ac.category,
          ac.db_flags,
          ac.squawk,
          ac.emergency,
          ac.payload_json,
          ac.hub,
          ingestedAt,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

export async function readAisVessels(
  db: D1Database,
  opts: { category?: string; limit: number; maxAgeMinutes?: number },
) {
  const cutoff = new Date(
    Date.now() - (opts.maxAgeMinutes ?? 20) * 60 * 1000,
  ).toISOString();
  const category = opts.category && opts.category !== "all" ? opts.category : null;
  const rows = category
    ? await db
        .prepare(
          `SELECT id, mmsi, ship_name, lat, lng, sog, cog, true_heading,
                  ship_type, ship_type_label, category, provider, timestamp, ingested_at
           FROM ais_vessels
           WHERE ingested_at >= ? AND category = ?
           ORDER BY ingested_at DESC LIMIT ?`,
        )
        .bind(cutoff, category, opts.limit)
        .all<Record<string, unknown>>()
    : await db
        .prepare(
          `SELECT id, mmsi, ship_name, lat, lng, sog, cog, true_heading,
                  ship_type, ship_type_label, category, provider, timestamp, ingested_at
           FROM ais_vessels
           WHERE ingested_at >= ?
           ORDER BY ingested_at DESC LIMIT ?`,
        )
        .bind(cutoff, opts.limit)
        .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function readAdsbAircraft(
  db: D1Database,
  opts: {
    mode: "mil" | "civ";
    limit: number;
    west?: number;
    south?: number;
    east?: number;
    north?: number;
    maxAgeMinutes?: number;
  },
) {
  const cutoff = new Date(
    Date.now() - (opts.maxAgeMinutes ?? 15) * 60 * 1000,
  ).toISOString();
  const hasBbox =
    opts.west != null &&
    opts.south != null &&
    opts.east != null &&
    opts.north != null;

  const rows = hasBbox
    ? await db
        .prepare(
          `SELECT id, hex, mode, callsign, registration, lat, lng, altitude, altitude_geom,
                  ground_speed, track, type, category, db_flags, squawk, emergency,
                  payload_json, hub, ingested_at
           FROM adsb_aircraft
           WHERE mode = ? AND ingested_at >= ?
             AND lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?
           ORDER BY ingested_at DESC LIMIT ?`,
        )
        .bind(opts.mode, cutoff, opts.south!, opts.north!, opts.west!, opts.east!, opts.limit)
        .all<Record<string, unknown>>()
    : await db
        .prepare(
          `SELECT id, hex, mode, callsign, registration, lat, lng, altitude, altitude_geom,
                  ground_speed, track, type, category, db_flags, squawk, emergency,
                  payload_json, hub, ingested_at
           FROM adsb_aircraft
           WHERE mode = ? AND ingested_at >= ?
           ORDER BY ingested_at DESC LIMIT ?`,
        )
        .bind(opts.mode, cutoff, opts.limit)
        .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function readFirmsFires(
  db: D1Database,
  opts: { west: number; south: number; east: number; north: number; limit: number },
) {
  const rows = await db
    .prepare(
      `SELECT id, lat, lng, frp, brightness, confidence, acq_date, acq_time, satellite, daynight, source, theater
       FROM firms_fires
       WHERE lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?
       ORDER BY ingested_at DESC LIMIT ?`,
    )
    .bind(opts.south, opts.north, opts.west, opts.east, opts.limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function readGdeltPoints(db: D1Database, limit = 1200) {
  const rows = await db
    .prepare(
      `SELECT id, lat, lng, name, url, mention_count, query_tag
       FROM gdelt_points ORDER BY ingested_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function readTelegramAlerts(db: D1Database, limit = 200) {
  const rows = await db
    .prepare(
      `SELECT id, channel_username, channel_title, region, text, message_url, received_at, ingested_at
       FROM telegram_alerts ORDER BY received_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<TelegramAlertRow & { ingested_at: string }>();
  return rows.results ?? [];
}

export async function pruneOldRows(db: D1Database, retentionHours: number) {
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();
  const firms = await db
    .prepare(`DELETE FROM firms_fires WHERE ingested_at < ?`)
    .bind(cutoff)
    .run();
  const gdelt = await db
    .prepare(`DELETE FROM gdelt_points WHERE ingested_at < ?`)
    .bind(cutoff)
    .run();

  let newsSnapshotsDeleted = 0;
  let newsItemsDeleted = 0;
  let aisDeleted = 0;
  let adsbDeleted = 0;
  try {
    const snaps = await db
      .prepare(`DELETE FROM news_stream_snapshots WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    const items = await db
      .prepare(`DELETE FROM news_stream_items WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    newsSnapshotsDeleted = snaps.meta.changes ?? 0;
    newsItemsDeleted = items.meta.changes ?? 0;
  } catch {
    // table may not exist until migration 0001
  }

  try {
    const ais = await db
      .prepare(`DELETE FROM ais_vessels WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    aisDeleted = ais.meta.changes ?? 0;
  } catch {
    // until migration 0002
  }
  try {
    const adsb = await db
      .prepare(`DELETE FROM adsb_aircraft WHERE ingested_at < ?`)
      .bind(cutoff)
      .run();
    adsbDeleted = adsb.meta.changes ?? 0;
  } catch {
    // until migration 0002
  }

  // 텔레그램은 저빈도 채널이 있어 보존창을 2배로 (최소 24h)
  let telegramDeleted = 0;
  try {
    const tgCutoff = new Date(
      Date.now() - Math.max(24, retentionHours * 2) * 60 * 60 * 1000,
    ).toISOString();
    const tg = await db
      .prepare(`DELETE FROM telegram_alerts WHERE received_at < ?`)
      .bind(tgCutoff)
      .run();
    telegramDeleted = tg.meta.changes ?? 0;
  } catch {
    // until migration 0005
  }

  let airRaidDeleted = 0;
  try {
    const airCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const air = await db
      .prepare(`DELETE FROM air_raid_alerts WHERE ingested_at < ?`)
      .bind(airCutoff)
      .run();
    airRaidDeleted = air.meta.changes ?? 0;
  } catch {
    // until migration 0014
  }

  let signalDailyDeleted = 0;
  try {
    const signalCutoff = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const sig = await db
      .prepare(`DELETE FROM theater_signal_daily WHERE signal_date < ?`)
      .bind(signalCutoff)
      .run();
    signalDailyDeleted = sig.meta.changes ?? 0;
  } catch {
    // until migration 0014
  }

  return {
    firmsDeleted: firms.meta.changes ?? 0,
    gdeltDeleted: gdelt.meta.changes ?? 0,
    newsSnapshotsDeleted,
    newsItemsDeleted,
    aisDeleted,
    adsbDeleted,
    telegramDeleted,
    airRaidDeleted,
    signalDailyDeleted,
    cutoff,
  };
}

export async function recordIngestRun(
  db: D1Database,
  run: {
    startedAt: string;
    finishedAt: string;
    firmsCount: number;
    gdeltCount: number;
    ok: boolean;
    error: string | null;
    detail: unknown;
  },
) {
  await db
    .prepare(
      `INSERT INTO ingest_runs (
        started_at, finished_at, firms_count, gdelt_count, ok, error, detail_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      run.startedAt,
      run.finishedAt,
      run.firmsCount,
      run.gdeltCount,
      run.ok ? 1 : 0,
      run.error,
      JSON.stringify(run.detail ?? null),
    )
    .run();
}

/**
 * 경량 UI 이벤트 로그 적재 — Vercel(D1 바인딩 없음)에서 /track 경유로 전달받아 여기서 씀.
 * 개인식별 정보 없음. 실패해도 호출 측에서 조용히 무시한다.
 */
export async function insertUiEvent(
  db: D1Database,
  row: {
    event: string;
    metaJson: string | null;
    viewerMode: string | null;
    lang: string | null;
  },
) {
  await db
    .prepare(
      `INSERT INTO ui_events (event, meta_json, viewer_mode, lang)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.event, row.metaJson, row.viewerMode, row.lang)
    .run();
}

export function readIntVar(env: IngestEnv, key: keyof IngestEnv, fallback: number) {
  const raw = env[key];
  if (typeof raw !== "string") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getFirmsMapKey(env: IngestEnv): string | null {
  const key = (env.NASA_FIRMS_API_KEY || env.FIRMS_MAP_KEY || "").trim();
  return key || null;
}

export function getMarineTrafficKey(env: IngestEnv): string | null {
  const key = (env.MARINETRAFFIC_API_KEY || env.MarineTraffic_API_KEY || "").trim();
  return key || null;
}

export function getAdsbApiKey(env: IngestEnv): string | null {
  const key = (env.ADSBEXCHANGE_API_KEY || env.ADSB_API_KEY || env.ADSBX_API_KEY || "").trim();
  return key || null;
}

export function getAisstreamKey(env: IngestEnv): string | null {
  const key = (env.AISSTREAM_API_KEY || "").trim();
  return key || null;
}
