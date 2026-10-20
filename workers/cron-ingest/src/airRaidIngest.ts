/**
 * Tzeva Adom (OREF) + NEPTUN 공습경보 → D1.
 * - air_raid_alerts: soft-rank용 현재 스냅샷 (덮어쓰기 OK)
 * - neptun_threat_samples / air_raid_alert_intervals: 조사 도구용 이력 (추가·구간)
 */

import type { IngestEnv } from "./env";

const OREF_HISTORY_DEFAULT =
  "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json";
const OREF_ACTIVE_DEFAULT =
  "https://www.oref.org.il/WarningMessages/alert/alerts.json";
const NEPTUN_DEFAULT = "https://neptun.in.ua";

const OREF_HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
} as const;

export type AirRaidAlertRow = {
  id: string;
  source: "tzeva-adom" | "neptun";
  theater_id: "middle-east" | "ukraine";
  region: string | null;
  title: string | null;
  severity: number;
  alert_at: string;
  active: number;
  detail_json: string | null;
};

type NeptunThreatSampleRow = {
  id: string;
  threat_id: string;
  threat_type: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  speed_kmh: number | null;
  confidence: string | null;
  source_count: number | null;
  uncertainty_km: number | null;
  sampled_at: string;
  trail_json: string | null;
  detail_json: string | null;
};

type AirRaidIntervalTouch = {
  source: "tzeva-adom" | "neptun";
  theater_id: "middle-east" | "ukraine";
  region_key: string;
  region_name: string | null;
  title: string | null;
  category: number | null;
  seen_at: string;
  detail_json: string | null;
};

function tzevaSeverity(category: number | undefined, active: boolean): number {
  if (active) {
    if (category != null && category >= 10) return 5;
    return 3;
  }
  return 1;
}

function toIsoAlertAt(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();
  const d = trimmed.includes("T")
    ? new Date(trimmed)
    : new Date(trimmed.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function neptunThreatSeverity(type: string | undefined): number {
  const t = (type || "").toLowerCase();
  if (t === "ballistic" || t === "missile" || t === "mig31k") return 5;
  if (t === "kab" || t === "uav") return 3;
  return 2;
}

function parseOrefHistory(text: string): AirRaidAlertRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: AirRaidAlertRow[] = [];
  for (const item of parsed as Array<{
    data?: string;
    title?: string;
    alertDate?: string;
    cat?: number | string;
  }>) {
    const region = typeof item.data === "string" ? item.data.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const alertDate = typeof item.alertDate === "string" ? item.alertDate.trim() : "";
    if (!region || !alertDate) continue;
    const cat =
      typeof item.cat === "number"
        ? item.cat
        : typeof item.cat === "string"
          ? Number.parseInt(item.cat, 10)
          : undefined;
    const id = `tzeva|${alertDate}|${region}|${title}`.replace(/\s+/g, " ").trim();
    out.push({
      id,
      source: "tzeva-adom",
      theater_id: "middle-east",
      region,
      title: title || "צבע אדום",
      severity: tzevaSeverity(Number.isFinite(cat) ? cat : undefined, false),
      alert_at: toIsoAlertAt(alertDate),
      active: 0,
      detail_json: JSON.stringify({ category: cat ?? null }),
    });
  }
  // 대규모 공습 밤에는 120건을 넘기므로 상한을 두지 않는다.
  return out;
}

function parseOrefActive(text: string): AirRaidAlertRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const now = new Date().toISOString();
  const out: AirRaidAlertRow[] = [];
  for (const item of parsed as Array<{
    id?: string;
    cat?: number | string;
    title?: string;
    data?: string | string[];
  }>) {
    const title = typeof item.title === "string" ? item.title.trim() : "ירי רקטות וטילים";
    const cat =
      typeof item.cat === "number"
        ? item.cat
        : typeof item.cat === "string"
          ? Number.parseInt(item.cat, 10)
          : undefined;
    const regions = Array.isArray(item.data)
      ? item.data.filter((r): r is string => typeof r === "string")
      : typeof item.data === "string"
        ? [item.data]
        : [];
    for (const regionRaw of regions) {
      const region = regionRaw.trim();
      if (!region) continue;
      const id = `tzeva-active|${now.slice(0, 16)}|${region}|${title}`.replace(/\s+/g, " ");
      out.push({
        id,
        source: "tzeva-adom",
        theater_id: "middle-east",
        region,
        title,
        severity: tzevaSeverity(Number.isFinite(cat) ? cat : undefined, true),
        alert_at: now,
        active: 1,
        detail_json: JSON.stringify({ category: cat ?? null }),
      });
    }
  }
  return out;
}

async function fetchTzevaRows(env: IngestEnv): Promise<{
  rows: AirRaidAlertRow[];
  geoRestricted: boolean;
  error?: string;
}> {
  const historyUrl = (env.OREF_HISTORY_URL || "").trim() || OREF_HISTORY_DEFAULT;
  const activeUrl = (env.OREF_ACTIVE_URL || "").trim() || OREF_ACTIVE_DEFAULT;
  try {
    const [historyRes, activeRes] = await Promise.all([
      fetch(historyUrl, { headers: OREF_HEADERS }),
      fetch(activeUrl, { headers: OREF_HEADERS }),
    ]);
    const historyText = historyRes.ok ? await historyRes.text() : "";
    const activeText = activeRes.ok ? await activeRes.text() : "";
    const geoRestricted =
      historyRes.status === 403 ||
      activeRes.status === 403 ||
      (historyText.length === 0 &&
        activeText.length === 0 &&
        (!historyRes.ok || !activeRes.ok));
    const history = parseOrefHistory(historyText);
    const active = parseOrefActive(activeText);
    const activeRegions = new Set(active.map((a) => a.region).filter(Boolean));
    const merged = history.map((h) =>
      h.region && activeRegions.has(h.region) ? { ...h, active: 1, severity: Math.max(h.severity, 3) } : h,
    );
    const rows = [...active, ...merged];
    return {
      rows,
      geoRestricted,
      error:
        rows.length === 0 && geoRestricted
          ? "OREF geoRestricted — set OREF_HISTORY_URL / OREF_ACTIVE_URL proxy"
          : undefined,
    };
  } catch (error) {
    return {
      rows: [],
      geoRestricted: false,
      error: error instanceof Error ? error.message : "OREF fetch failed",
    };
  }
}

type NeptunThreatRaw = {
  id?: string;
  type?: string;
  lat?: number;
  lon?: number;
  heading?: number | null;
  confidenceLevel?: string;
  sourceCount?: number;
  uncertaintyKm?: number;
  updatedAt?: string;
  confirmedAt?: string;
  velocity?: { bearingDeg?: number; speedKmh?: number };
  trail?: Array<{ lat?: number; lon?: number; t?: string }>;
  region?: string;
  district?: string;
  locality?: string;
  status?: string;
};

type NeptunAlertRaw = {
  key?: string;
  name?: string;
  oblast?: string;
  since?: string;
};

async function fetchNeptunRows(env: IngestEnv): Promise<{
  rows: AirRaidAlertRow[];
  samples: NeptunThreatSampleRow[];
  intervals: AirRaidIntervalTouch[];
  error?: string;
}> {
  const base = ((env.NEPTUN_API_BASE || "").trim() || NEPTUN_DEFAULT).replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    "User-Agent": "BraveNewWorld-Ingest/1.0 (+air-raid)",
  };
  try {
    const [threatsRes, alertsRes] = await Promise.all([
      fetch(`${base}/api/v1/threats`, { headers }),
      fetch(`${base}/api/v1/alerts`, { headers }),
    ]);
    if (!threatsRes.ok && !alertsRes.ok) {
      return {
        rows: [],
        samples: [],
        intervals: [],
        error: `NEPTUN HTTP ${threatsRes.status}/${alertsRes.status}`,
      };
    }
    const now = new Date().toISOString();
    const rows: AirRaidAlertRow[] = [];
    const samples: NeptunThreatSampleRow[] = [];
    const intervals: AirRaidIntervalTouch[] = [];

    if (threatsRes.ok) {
      const data = (await threatsRes.json()) as { threats?: NeptunThreatRaw[] };
      for (const t of data.threats ?? []) {
        if (!Number.isFinite(t.lat) || !Number.isFinite(t.lon)) continue;
        const tid = String(t.id || `${t.type}-${t.lat}-${t.lon}`);
        const sampledAt = toIsoAlertAt(t.updatedAt || t.confirmedAt || now);
        const trail =
          Array.isArray(t.trail) && t.trail.length > 0
            ? t.trail
                .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
                .map((p) => ({ lat: p.lat, lon: p.lon, t: p.t ?? null }))
            : null;
        rows.push({
          id: `neptun-threat|${tid}`,
          source: "neptun",
          theater_id: "ukraine",
          region: [t.locality, t.district, t.region].filter(Boolean).join(" · ") || null,
          title: t.type || "threat",
          severity: neptunThreatSeverity(t.type),
          alert_at: sampledAt,
          active: 1,
          detail_json: JSON.stringify({
            type: t.type ?? null,
            lat: t.lat,
            lon: t.lon,
            confidenceLevel: t.confidenceLevel ?? null,
            sourceCount: t.sourceCount ?? null,
            uncertaintyKm: t.uncertaintyKm ?? null,
          }),
        });
        samples.push({
          id: `neptun-sample|${tid}|${sampledAt}`,
          threat_id: tid,
          threat_type: t.type ?? null,
          lat: t.lat as number,
          lon: t.lon as number,
          heading:
            typeof t.heading === "number"
              ? t.heading
              : typeof t.velocity?.bearingDeg === "number"
                ? t.velocity.bearingDeg
                : null,
          speed_kmh:
            typeof t.velocity?.speedKmh === "number" ? t.velocity.speedKmh : null,
          confidence: t.confidenceLevel ?? null,
          source_count: typeof t.sourceCount === "number" ? t.sourceCount : null,
          uncertainty_km: typeof t.uncertaintyKm === "number" ? t.uncertaintyKm : null,
          sampled_at: sampledAt,
          trail_json: trail ? JSON.stringify(trail) : null,
          detail_json: JSON.stringify({
            status: t.status ?? null,
            region: t.region ?? null,
            district: t.district ?? null,
            locality: t.locality ?? null,
            confirmedAt: t.confirmedAt ?? null,
          }),
        });
      }
    }

    if (alertsRes.ok) {
      const alerts = (await alertsRes.json()) as {
        raions?: NeptunAlertRaw[];
        oblasts?: NeptunAlertRaw[];
      };
      for (const o of alerts.oblasts ?? []) {
        const key = String(o.key || o.name || "oblast");
        const since = o.since ? toIsoAlertAt(o.since) : now;
        rows.push({
          id: `neptun-oblast|${key}`,
          source: "neptun",
          theater_id: "ukraine",
          region: o.name || o.oblast || key,
          title: "oblast air alert",
          severity: 3,
          alert_at: since,
          active: 1,
          detail_json: JSON.stringify(o),
        });
        intervals.push({
          source: "neptun",
          theater_id: "ukraine",
          region_key: `oblast:${key}`,
          region_name: o.name || o.oblast || key,
          title: "oblast air alert",
          category: null,
          seen_at: now,
          detail_json: JSON.stringify({ ...o, since }),
        });
      }
      for (const r of alerts.raions ?? []) {
        const key = String(r.key || r.name || "raion");
        const since = r.since ? toIsoAlertAt(r.since) : now;
        rows.push({
          id: `neptun-raion|${key}`,
          source: "neptun",
          theater_id: "ukraine",
          region: r.name || r.oblast || key,
          title: "raion air alert",
          severity: 2,
          alert_at: since,
          active: 1,
          detail_json: JSON.stringify(r),
        });
        intervals.push({
          source: "neptun",
          theater_id: "ukraine",
          region_key: `raion:${key}`,
          region_name: r.name || r.oblast || key,
          title: "raion air alert",
          category: null,
          seen_at: now,
          detail_json: JSON.stringify({ ...r, since }),
        });
      }
    }

    return { rows, samples, intervals };
  } catch (error) {
    return {
      rows: [],
      samples: [],
      intervals: [],
      error: error instanceof Error ? error.message : "NEPTUN fetch failed",
    };
  }
}

function parseCategory(detailJson: string | null): number | null {
  if (!detailJson) return null;
  try {
    const detail = JSON.parse(detailJson) as { category?: number | null };
    return typeof detail.category === "number" ? detail.category : null;
  } catch {
    return null;
  }
}

function tzevaActiveIntervalTouches(rows: AirRaidAlertRow[]): AirRaidIntervalTouch[] {
  const out: AirRaidIntervalTouch[] = [];
  for (const row of rows) {
    if (!row.active || !row.region) continue;
    out.push({
      source: "tzeva-adom",
      theater_id: "middle-east",
      region_key: row.region,
      region_name: row.region,
      title: row.title,
      category: parseCategory(row.detail_json),
      seen_at: row.alert_at,
      detail_json: row.detail_json,
    });
  }
  return out;
}

/** OREF 이력은 시점 이벤트 — 구간 테이블에 닫힌 행으로 쌓는다 (덮어쓰지 않음). */
async function insertClosedHistoryIntervals(
  db: D1Database,
  rows: AirRaidAlertRow[],
): Promise<number> {
  const history = rows.filter((r) => !r.active && r.region);
  if (history.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = history.map((row) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO air_raid_alert_intervals (
           id, source, theater_id, region_key, region_name, title, category,
           started_at, ended_at, last_seen_at, detail_json, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
      )
      .bind(
        row.id,
        row.source,
        row.theater_id,
        row.region,
        row.region,
        row.title,
        parseCategory(row.detail_json),
        row.alert_at,
        row.alert_at,
        row.alert_at,
        row.detail_json,
        ingestedAt,
      ),
  );
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
  return history.length;
}

async function upsertThreatSamples(
  db: D1Database,
  samples: NeptunThreatSampleRow[],
): Promise<number> {
  if (samples.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = samples.map((s) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO neptun_threat_samples (
           id, threat_id, threat_type, lat, lon, heading, speed_kmh,
           confidence, source_count, uncertainty_km, sampled_at,
           trail_json, detail_json, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
      )
      .bind(
        s.id,
        s.threat_id,
        s.threat_type,
        s.lat,
        s.lon,
        s.heading,
        s.speed_kmh,
        s.confidence,
        s.source_count,
        s.uncertainty_km,
        s.sampled_at,
        s.trail_json,
        s.detail_json,
        ingestedAt,
      ),
  );
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
  return samples.length;
}

/**
 * 활성 구역 집합을 보고 open 구간을 갱신하고, 사라진 구역은 ended_at을 채운다.
 */
async function syncOpenAlertIntervals(
  db: D1Database,
  source: "tzeva-adom" | "neptun",
  touches: AirRaidIntervalTouch[],
): Promise<{ openedOrTouched: number; closed: number }> {
  const now = new Date().toISOString();
  const activeKeys = new Set(touches.map((t) => t.region_key));

  let openedOrTouched = 0;
  for (const touch of touches) {
    const existing = await db
      .prepare(
        `SELECT id FROM air_raid_alert_intervals
         WHERE source = ?1 AND region_key = ?2 AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
      )
      .bind(source, touch.region_key)
      .first<{ id: string }>();

    if (existing?.id) {
      await db
        .prepare(
          `UPDATE air_raid_alert_intervals
           SET last_seen_at = ?1, title = COALESCE(?2, title),
               category = COALESCE(?3, category), detail_json = COALESCE(?4, detail_json),
               ingested_at = ?5
           WHERE id = ?6`,
        )
        .bind(
          touch.seen_at,
          touch.title,
          touch.category,
          touch.detail_json,
          now,
          existing.id,
        )
        .run();
    } else {
      const id = `${source}|${touch.region_key}|${touch.seen_at}`;
      await db
        .prepare(
          `INSERT INTO air_raid_alert_intervals (
             id, source, theater_id, region_key, region_name, title, category,
             started_at, ended_at, last_seen_at, detail_json, ingested_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, ?9, ?10, ?11)`,
        )
        .bind(
          id,
          touch.source,
          touch.theater_id,
          touch.region_key,
          touch.region_name,
          touch.title,
          touch.category,
          touch.seen_at,
          touch.seen_at,
          touch.detail_json,
          now,
        )
        .run();
    }
    openedOrTouched += 1;
  }

  const openRows = await db
    .prepare(
      `SELECT id, region_key FROM air_raid_alert_intervals
       WHERE source = ?1 AND ended_at IS NULL`,
    )
    .bind(source)
    .all<{ id: string; region_key: string }>();

  let closed = 0;
  const closeStmts = [];
  for (const row of openRows.results ?? []) {
    if (activeKeys.has(row.region_key)) continue;
    closeStmts.push(
      db
        .prepare(
          `UPDATE air_raid_alert_intervals
           SET ended_at = last_seen_at, ingested_at = ?1
           WHERE id = ?2`,
        )
        .bind(now, row.id),
    );
    closed += 1;
  }
  for (let i = 0; i < closeStmts.length; i += 50) {
    await db.batch(closeStmts.slice(i, i + 50));
  }

  return { openedOrTouched, closed };
}

export async function upsertAirRaidAlerts(
  db: D1Database,
  rows: AirRaidAlertRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO air_raid_alerts (
           id, source, theater_id, region, title, severity, alert_at, active, detail_json, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
           severity = excluded.severity,
           alert_at = excluded.alert_at,
           active = excluded.active,
           detail_json = excluded.detail_json,
           ingested_at = excluded.ingested_at`,
      )
      .bind(
        row.id,
        row.source,
        row.theater_id,
        row.region,
        row.title,
        row.severity,
        row.alert_at,
        row.active,
        row.detail_json,
        ingestedAt,
      ),
  );
  // D1 batch limit ~100
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
  return rows.length;
}

export async function fetchAndUpsertAirRaids(env: IngestEnv): Promise<{
  count: number;
  tzevaCount: number;
  neptunCount: number;
  sampleCount: number;
  intervalTouched: number;
  errors: string[];
  geoRestricted: boolean;
}> {
  const enabled =
    (env.AIR_RAID_INGEST_ENABLED ?? "true").toLowerCase() !== "false" &&
    env.AIR_RAID_INGEST_ENABLED !== "0";
  if (!enabled) {
    return {
      count: 0,
      tzevaCount: 0,
      neptunCount: 0,
      sampleCount: 0,
      intervalTouched: 0,
      errors: [],
      geoRestricted: false,
    };
  }

  const errors: string[] = [];
  const tzeva = await fetchTzevaRows(env);
  if (tzeva.error) errors.push(tzeva.error);
  const neptun = await fetchNeptunRows(env);
  if (neptun.error) errors.push(neptun.error);

  const rows = [...tzeva.rows, ...neptun.rows];
  let count = 0;
  let sampleCount = 0;
  let intervalTouched = 0;
  try {
    count = await upsertAirRaidAlerts(env.DB, rows);
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `air_raid upsert: ${error.message}`
        : "air_raid upsert failed (run migration 0014?)",
    );
  }

  try {
    sampleCount = await upsertThreatSamples(env.DB, neptun.samples);
    // geoRestricted면 빈 목록으로 open 구간을 닫지 않는다 (관측 실패 ≠ 해제).
    let tzevaHistory = 0;
    let tzevaTouched = 0;
    if (!tzeva.geoRestricted) {
      tzevaHistory = await insertClosedHistoryIntervals(env.DB, tzeva.rows);
      const tzevaActive = await syncOpenAlertIntervals(
        env.DB,
        "tzeva-adom",
        tzevaActiveIntervalTouches(tzeva.rows),
      );
      tzevaTouched = tzevaActive.openedOrTouched;
    }
    // NEPTUN fetch 실패 시에도 빈 intervals로 전부 닫지 않음
    let neptunTouched = 0;
    if (!neptun.error) {
      const neptunActive = await syncOpenAlertIntervals(
        env.DB,
        "neptun",
        neptun.intervals,
      );
      neptunTouched = neptunActive.openedOrTouched;
    }
    intervalTouched = tzevaHistory + tzevaTouched + neptunTouched;
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `air_raid history: ${error.message}`
        : "air_raid history failed (run migration 0029?)",
    );
  }

  return {
    count,
    tzevaCount: tzeva.rows.length,
    neptunCount: neptun.rows.length,
    sampleCount,
    intervalTouched,
    errors,
    geoRestricted: tzeva.geoRestricted,
  };
}

/** 최근 windowHours 내 theater별 severity 합 (soft 신호) */
export async function airRaidScoreByTheater(
  db: D1Database,
  windowHours = 24,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  try {
    const { results } = await db
      .prepare(
        `SELECT theater_id AS id, COALESCE(SUM(severity), 0) AS score
         FROM air_raid_alerts
         WHERE alert_at >= ?1
         GROUP BY theater_id`,
      )
      .bind(cutoff)
      .all<{ id: string; score: number }>();
    for (const row of results ?? []) {
      map.set(String(row.id), Number(row.score) || 0);
    }
  } catch {
    // table may not exist yet
  }
  return map;
}
