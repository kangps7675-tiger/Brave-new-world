/**
 * Tzeva Adom (OREF) + NEPTUN 공습경보 → D1 스냅샷.
 * soft rank 신호(middle-east / ukraine)용. geoRestricted면 건너뜀.
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
  return out.slice(0, 120);
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

async function fetchNeptunRows(env: IngestEnv): Promise<{
  rows: AirRaidAlertRow[];
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
      return { rows: [], error: `NEPTUN HTTP ${threatsRes.status}/${alertsRes.status}` };
    }
    const now = new Date().toISOString();
    const rows: AirRaidAlertRow[] = [];

    if (threatsRes.ok) {
      const data = (await threatsRes.json()) as {
        threats?: Array<{ id?: string; type?: string; lat?: number; lon?: number }>;
      };
      for (const t of data.threats ?? []) {
        const tid = String(t.id || `${t.type}-${t.lat}-${t.lon}`);
        rows.push({
          id: `neptun-threat|${tid}`,
          source: "neptun",
          theater_id: "ukraine",
          region: null,
          title: t.type || "threat",
          severity: neptunThreatSeverity(t.type),
          alert_at: now,
          active: 1,
          detail_json: JSON.stringify({ type: t.type ?? null, lat: t.lat, lon: t.lon }),
        });
      }
    }

    if (alertsRes.ok) {
      const alerts = (await alertsRes.json()) as {
        raions?: Array<{ key?: string; name?: string; oblast?: string; since?: string }>;
        oblasts?: Array<{ key?: string; name?: string; oblast?: string; since?: string }>;
      };
      for (const o of alerts.oblasts ?? []) {
        const key = o.key || o.name || "oblast";
        rows.push({
          id: `neptun-oblast|${key}`,
          source: "neptun",
          theater_id: "ukraine",
          region: o.name || o.oblast || key,
          title: "oblast air alert",
          severity: 3,
          alert_at: o.since ? new Date(o.since).toISOString() : now,
          active: 1,
          detail_json: JSON.stringify(o),
        });
      }
      for (const r of alerts.raions ?? []) {
        const key = r.key || r.name || "raion";
        rows.push({
          id: `neptun-raion|${key}`,
          source: "neptun",
          theater_id: "ukraine",
          region: r.name || r.oblast || key,
          title: "raion air alert",
          severity: 2,
          alert_at: r.since ? new Date(r.since).toISOString() : now,
          active: 1,
          detail_json: JSON.stringify(r),
        });
      }
    }

    return { rows };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "NEPTUN fetch failed",
    };
  }
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
  errors: string[];
  geoRestricted: boolean;
}> {
  const enabled =
    (env.AIR_RAID_INGEST_ENABLED ?? "true").toLowerCase() !== "false" &&
    env.AIR_RAID_INGEST_ENABLED !== "0";
  if (!enabled) {
    return { count: 0, tzevaCount: 0, neptunCount: 0, errors: [], geoRestricted: false };
  }

  const errors: string[] = [];
  const tzeva = await fetchTzevaRows(env);
  if (tzeva.error) errors.push(tzeva.error);
  const neptun = await fetchNeptunRows(env);
  if (neptun.error) errors.push(neptun.error);

  const rows = [...tzeva.rows, ...neptun.rows];
  let count = 0;
  try {
    count = await upsertAirRaidAlerts(env.DB, rows);
  } catch (error) {
    errors.push(
      error instanceof Error
        ? `air_raid upsert: ${error.message}`
        : "air_raid upsert failed (run migration 0014?)",
    );
  }

  return {
    count,
    tzevaCount: tzeva.rows.length,
    neptunCount: neptun.rows.length,
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
