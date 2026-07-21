/**
 * UKMTO(Royal Navy) 상선 피습·나포·의심활동 경보 → D1 스냅샷.
 *
 * 공식 문서화된 API 없음 — 클라이언트 JS 번들 리버싱으로 확인한 엔드포인트.
 * README「비공식(문서화되지 않은) 엔드포인트 사용 원칙」을 그대로 적용:
 *  - User-Agent에 식별 정보 명시(익명 위장 안 함)
 *  - 폴링 주기 여유 있게 — 기본 30분 최소 간격 (D1 ingested_at 기준 자체 스로틀, 별도 KV 불필요)
 *  - 실패해도 메인 인제스트 파이프라인은 절대 안 깨지게 try/catch
 */

import type { IngestEnv } from "./env";
import { readIntVar } from "./db";

const UKMTO_URL_DEFAULT = "https://sccd.royalnavy.mod.uk/api/ukmto/all";

export type UkmtoIncidentRow = {
  id: string;
  incident_number: number | null;
  incident_type_name: string;
  incident_type_level: number | null;
  pin_colour: string | null;
  lat: number;
  lng: number;
  region: string | null;
  place: string | null;
  vessel_name: string | null;
  vessel_type: string | null;
  vessel_under_pirate_control: number;
  crew_held: number | null;
  detail: string | null;
  utc_date_of_incident: string | null;
  utc_date_created: string | null;
};

type UkmtoApiIncident = {
  incidentIssuer?: string;
  incidentNumber?: number;
  sitecoreId?: string;
  utcDateCreated?: string;
  utcDateOfIncident?: string;
  pinColour?: string;
  incidentTypeName?: string;
  incidentTypeLevel?: number;
  locationLatitude?: number;
  locationLongitude?: number;
  region?: string;
  place?: string;
  vesselName?: string;
  vesselType?: string;
  vesselUnderPirateControl?: boolean;
  crewHeld?: number;
  otherDetails?: string;
};

function parseRows(items: UkmtoApiIncident[]): UkmtoIncidentRow[] {
  const out: UkmtoIncidentRow[] = [];
  for (const item of items) {
    const id = item.sitecoreId;
    const lat = item.locationLatitude;
    const lng = item.locationLongitude;
    if (!id || typeof lat !== "number" || typeof lng !== "number") continue;
    out.push({
      id,
      incident_number: typeof item.incidentNumber === "number" ? item.incidentNumber : null,
      incident_type_name: item.incidentTypeName || "Unknown",
      incident_type_level:
        typeof item.incidentTypeLevel === "number" ? item.incidentTypeLevel : null,
      pin_colour: item.pinColour ?? null,
      lat,
      lng,
      region: item.region ?? null,
      place: item.place ?? null,
      vessel_name: item.vesselName ?? null,
      vessel_type: item.vesselType ?? null,
      vessel_under_pirate_control: item.vesselUnderPirateControl ? 1 : 0,
      crew_held: typeof item.crewHeld === "number" ? item.crewHeld : null,
      detail: item.otherDetails ?? null,
      utc_date_of_incident: item.utcDateOfIncident ?? null,
      utc_date_created: item.utcDateCreated ?? null,
    });
  }
  return out;
}

async function fetchUkmtoRows(
  env: IngestEnv,
): Promise<{ rows: UkmtoIncidentRow[]; error?: string }> {
  const url = (env.UKMTO_API_URL || "").trim() || UKMTO_URL_DEFAULT;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "ConflictView-Ingest/1.0 (+contact: kangps7675@gmail.com; non-commercial situational dashboard)",
      },
    });
    if (!res.ok) return { rows: [], error: `UKMTO HTTP ${res.status}` };
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return { rows: [], error: "UKMTO unexpected payload shape" };
    return { rows: parseRows(data as UkmtoApiIncident[]) };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : "UKMTO fetch failed" };
  }
}

/** 마지막 ingested_at으로부터 최소 간격이 지났는지 확인 — 없으면(첫 실행) 통과 */
async function shouldPoll(db: D1Database, minIntervalMinutes: number): Promise<boolean> {
  try {
    const row = await db
      .prepare(`SELECT MAX(ingested_at) AS last FROM ukmto_incidents`)
      .first<{ last: string | null }>();
    const last = row?.last;
    if (!last) return true;
    const lastMs = new Date(last).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return Date.now() - lastMs >= minIntervalMinutes * 60 * 1000;
  } catch {
    // 테이블 없으면(마이그레이션 전) 통과 — upsert 단계에서 다시 잡힘
    return true;
  }
}

export async function upsertUkmtoIncidents(
  db: D1Database,
  rows: UkmtoIncidentRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const ingestedAt = new Date().toISOString();
  const stmts = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO ukmto_incidents (
           id, incident_number, incident_type_name, incident_type_level, pin_colour,
           lat, lng, region, place, vessel_name, vessel_type, vessel_under_pirate_control,
           crew_held, detail, utc_date_of_incident, utc_date_created, ingested_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
         ON CONFLICT(id) DO UPDATE SET
           incident_number = excluded.incident_number,
           incident_type_name = excluded.incident_type_name,
           incident_type_level = excluded.incident_type_level,
           pin_colour = excluded.pin_colour,
           lat = excluded.lat,
           lng = excluded.lng,
           region = excluded.region,
           place = excluded.place,
           vessel_name = excluded.vessel_name,
           vessel_type = excluded.vessel_type,
           vessel_under_pirate_control = excluded.vessel_under_pirate_control,
           crew_held = excluded.crew_held,
           detail = excluded.detail,
           utc_date_of_incident = excluded.utc_date_of_incident,
           utc_date_created = excluded.utc_date_created,
           ingested_at = excluded.ingested_at`,
      )
      .bind(
        row.id,
        row.incident_number,
        row.incident_type_name,
        row.incident_type_level,
        row.pin_colour,
        row.lat,
        row.lng,
        row.region,
        row.place,
        row.vessel_name,
        row.vessel_type,
        row.vessel_under_pirate_control,
        row.crew_held,
        row.detail,
        row.utc_date_of_incident,
        row.utc_date_created,
        ingestedAt,
      ),
  );
  // D1 batch limit ~100
  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
  return rows.length;
}

export async function fetchAndUpsertUkmto(env: IngestEnv): Promise<{
  count: number;
  fetched: number;
  errors: string[];
  skipped: boolean;
}> {
  const enabled =
    (env.UKMTO_INGEST_ENABLED ?? "true").toLowerCase() !== "false" &&
    env.UKMTO_INGEST_ENABLED !== "0";
  if (!enabled) {
    return { count: 0, fetched: 0, errors: [], skipped: true };
  }

  const minInterval = Math.max(5, readIntVar(env, "UKMTO_POLL_MIN_INTERVAL_MINUTES", 30));
  const poll = await shouldPoll(env.DB, minInterval);
  if (!poll) {
    return { count: 0, fetched: 0, errors: [], skipped: true };
  }

  const errors: string[] = [];
  const { rows, error } = await fetchUkmtoRows(env);
  if (error) errors.push(error);

  let count = 0;
  try {
    count = await upsertUkmtoIncidents(env.DB, rows);
  } catch (e) {
    errors.push(
      e instanceof Error ? `ukmto upsert: ${e.message}` : "ukmto upsert failed (run migration?)",
    );
  }

  return { count, fetched: rows.length, errors, skipped: false };
}
