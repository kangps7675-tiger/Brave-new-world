/// <reference types="@cloudflare/workers-types" />
import type {
  AdsbAircraftRow,
  AisVesselRow,
  FirmsFireRow,
  GdeltPointRow,
  IngestEnv,
  TelegramAlertRow,
} from "./env";
import type { AisZoneCrossingRow } from "./aisZones";

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
            ship_type, ship_type_label, category, provider, timestamp, ingested_at,
            draught, destination, length_m, beam_m
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            ship_name = COALESCE(NULLIF(excluded.ship_name, ''), ais_vessels.ship_name),
            lat = excluded.lat,
            lng = excluded.lng,
            sog = excluded.sog,
            cog = excluded.cog,
            true_heading = excluded.true_heading,
            ship_type = COALESCE(excluded.ship_type, ais_vessels.ship_type),
            ship_type_label = COALESCE(excluded.ship_type_label, ais_vessels.ship_type_label),
            category = CASE
              WHEN excluded.category = 'other'
                AND excluded.ship_type IS NULL
                AND ais_vessels.category IN ('military', 'commercial')
              THEN ais_vessels.category
              ELSE excluded.category
            END,
            provider = excluded.provider,
            timestamp = excluded.timestamp,
            ingested_at = excluded.ingested_at,
            draught = COALESCE(excluded.draught, ais_vessels.draught),
            destination = COALESCE(excluded.destination, ais_vessels.destination),
            length_m = COALESCE(excluded.length_m, ais_vessels.length_m),
            beam_m = COALESCE(excluded.beam_m, ais_vessels.beam_m)`,
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
          v.draught,
          v.destination,
          v.length_m,
          v.beam_m,
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
  // 한 cron(~12s×배치)만으로는 수십 척뿐이라, 최근 수시간 스냅샷을 합쳐 전 지구 밀도를 유지한다.
  const cutoff = new Date(
    Date.now() - (opts.maxAgeMinutes ?? 180) * 60 * 1000,
  ).toISOString();
  const category = opts.category && opts.category !== "all" ? opts.category : null;
  // commercial 필터는 type 미수신 other도 민간 후보로 포함 (프론트 matchesAisClassFilter와 동일)
  const rows = category === "commercial"
    ? await db
        .prepare(
          `SELECT id, mmsi, ship_name, lat, lng, sog, cog, true_heading,
                  ship_type, ship_type_label, category, provider, timestamp, ingested_at
           FROM ais_vessels
           WHERE ingested_at >= ? AND category IN ('commercial', 'other')
           ORDER BY ingested_at DESC LIMIT ?`,
        )
        .bind(cutoff, opts.limit)
        .all<Record<string, unknown>>()
    : category
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

/**
 * ì´ë² ë°°ì¹ì í¬í¨ë MMSIë¤ì "ì§ì " ìì¹ë¥¼ D1ìì ì½ì´ì¨ë¤ â upsertë¡ ë®ì´ì°ê¸° ì ì
 * ë°ëì ë¨¼ì  í¸ì¶í´ì¼ íë¤ (ìëë©´ ì´ì  ìì¹ë¥¼ ìì ìëë¤).
 * ais_vesselsë MMSIë¹ 1íë§ ì ì§íë¯ë¡ ì´ê² ì ì¼í "ì´ì  ìí" ìì¤ë¤.
 */
export async function getAisVesselPositions(
  db: D1Database,
  ids: string[],
): Promise<Map<string, { lat: number; lng: number }>> {
  const map = new Map<string, { lat: number; lng: number }>();
  if (ids.length === 0) return map;

  for (let i = 0; i < ids.length; i += INSERT_CHUNK) {
    const chunk = ids.slice(i, i + INSERT_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    const { results } = await db
      .prepare(`SELECT id, lat, lng FROM ais_vessels WHERE id IN (${placeholders})`)
      .bind(...chunk)
      .all<{ id: string; lat: number; lng: number }>();
    for (const row of results ?? []) {
      map.set(row.id, { lat: row.lat, lng: row.lng });
    }
  }

  return map;
}

export async function insertAisZoneCrossings(
  db: D1Database,
  crossings: AisZoneCrossingRow[],
) {
  if (crossings.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < crossings.length; i += INSERT_CHUNK) {
    const chunk = crossings.slice(i, i + INSERT_CHUNK);
    const statements = chunk.map((c) =>
      db
        .prepare(
          `INSERT INTO ais_zone_crossings (
            id, zone_id, direction, mmsi, ship_name, category, ship_type_label,
            lat, lng, sog, cog, detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          c.id,
          c.zone_id,
          c.direction,
          c.mmsi,
          c.ship_name,
          c.category,
          c.ship_type_label,
          c.lat,
          c.lng,
          c.sog,
          c.cog,
          c.detected_at,
        ),
    );
    await db.batch(statements);
    written += chunk.length;
  }

  return written;
}

/**
 * ìµê·¼ Nìê° ê²ì´í¸ë³ ë°©í¥ë³ íµê³¼ ì²ì â "ë°©í¥ë³ ê²ì´í¸ íµê³¼ ì ë° ì" ì§íì
 * ê°ì¥ ê¸°ë³¸ ííë¤. category(ë¯¼ê°/êµ°ì©)ê¹ì§ ìª½ê°ì ë°ííë¤.
 * DWT ê°ì¤ì¹Â·ìë ê¸ê°Â·íì ëë¹ z-score ê°ì ê³ ê¸ ì§íë ìì§ ìë¤ â
 * ì  ê°ë¤ì ì ë¢°ì± ìê² ë´ë ¤ë ¤ë©´ ì ì£¼ì¹ ëì  ë°ì´í°ë¡ "íì" ê¸°ì¤ì ì ë¨¼ì 
 * ë§ë¤ì´ì¼ íëë°, ì´ íì´ë¸ì´ ì´ì  ë§ ìê²¨ì ê¸°ì¤ì ì´ ìë¤.
 */
export async function getAisZoneFlowCounts(
  db: D1Database,
  hours: number,
): Promise<Array<{ zone_id: string; direction: string; category: string | null; count: number }>> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { results } = await db
    .prepare(
      `SELECT zone_id, direction, category, COUNT(*) as count
       FROM ais_zone_crossings
       WHERE detected_at >= ?
       GROUP BY zone_id, direction, category
       ORDER BY zone_id, direction`,
    )
    .bind(cutoff)
    .all<{ zone_id: string; direction: string; category: string | null; count: number }>();
  return results ?? [];
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

  // ?ë ê·¸ë¨? ?ë¹ë ì±ë???ì´ ë³´ì¡´ì°½ì 2ë°°ë¡ (ìµì 24h)
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

  // ????????????????????????????????????????????????????????????????
  // ?ë ì§ê³Â·?´ë²¤???ì´ë¸ì? **?í ?ì°**?´ë¤ (?ìë£??ë).
  //
  // ?ìë£?FIRMS/GDELT/AIS/ADS-B/?´ì¤)??ë¬´ê²ê³??¬ì·¨??ê°?¥íë¯ë¡?ê³ì prune ?ë¤.
  // ë°ë©´ ?¼ë³ ì§ê³? ?´ë²¤??ë¡ê·¸??
  //   - ?ì´ ê·¹í ?ë¤ (?ì¥ 20ê°?Ã 365??= ??7,300??
  //   - ??ë²?ì§?°ë©´ **?ì??ë³µêµ¬ ë¶ê?**?ë¤ (?ì² APIê° ê³¼ê±°ë¥???ì¤??
  //   - ì»¨ë²?ì¤ ?ì¤ë¥ Â·ë² ?´ì¤?¼ì¸Â·ë°±í?¤í¸??? ì¼??ê·¼ê±°??  //
  // 2026-08-07: ?ê³?´ì´ ?í???ë©´??"???= ë¹ì©"?ì "???= ?ì°"?¼ë¡
  // ?ì ê° ë°ëì?? 90/120??ë¡¤ë§ ?? ë¥?ì¤ë¨?ë¤.
  // ?ëë¦¬ë ¤ë©?ë°ë??ë³ë ?ì¹´?´ë¸(R2 ??ë¥?ë¨¼ì? ë¶ì¼ ê²?
  // ????????????????????????????????????????????????????????????????

  // soft-rank 스냅샷은 길게, 조사 이력(샘플·구간)은 90일.
  const AIR_RAID_RETENTION_DAYS = 1200;
  const AIR_RAID_HISTORY_RETENTION_DAYS = 90;
  let airRaidDeleted = 0;
  try {
    const airCutoff = new Date(
      Date.now() - AIR_RAID_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const air = await db
      .prepare(`DELETE FROM air_raid_alerts WHERE ingested_at < ?`)
      .bind(airCutoff)
      .run();
    airRaidDeleted = air.meta.changes ?? 0;
  } catch {
    // until migration 0014
  }
  try {
    const historyCutoff = new Date(
      Date.now() - AIR_RAID_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const samples = await db
      .prepare(`DELETE FROM neptun_threat_samples WHERE ingested_at < ?`)
      .bind(historyCutoff)
      .run();
    const intervals = await db
      .prepare(`DELETE FROM air_raid_alert_intervals WHERE ingested_at < ?`)
      .bind(historyCutoff)
      .run();
    airRaidDeleted += (samples.meta.changes ?? 0) + (intervals.meta.changes ?? 0);
  } catch {
    // until migration 0029
  }

  // ?ì¥ë³??¼ë³ ? í¸ ì§ê³ ??**?? ?ì? ?ë??**
  // (?´ì : 120??ë¡¤ë§ ?? . ë² ì´?¤ë¼??ê³ì°ë§?ëª©ì ?´ë ?ì ???¤ê³.)
  const signalDailyDeleted = 0;

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
 * ê²½ë UI ?´ë²¤??ë¡ê·¸ ?ì¬ ??Vercel(D1 ë°ì¸???ì)?ì /track ê²½ì ë¡??ë¬ë°ì ?¬ê¸°???.
 * ê°ì¸?ë³ ?ë³´ ?ì. ?¤í¨?´ë ?¸ì¶ ì¸¡ì??ì¡°ì©??ë¬´ì?ë¤.
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
