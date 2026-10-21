/**
 * UKMTO(Royal Navy) 상선 피습·나포·의심활동 경보 → D1 스냅샷.
 *
 * 공식 문서화된 API 없음 — 클라이언트 JS 번들 리버싱으로 확인한 엔드포인트.
 * README「비공식(문서화되지 않은) 엔드포인트 사용 원칙」을 그대로 적용:
 *  - User-Agent에 식별 정보 명시(익명 위장 안 함)
 *  - 폴링 주기 여유 있게 — 기본 5분 최소 간격 (D1 ingested_at 기준 자체 스로틀, 별도 KV 불필요).
 *    크론이 15분마다 돌아 최소 간격과 같다(적재 시각과 틱 시각의 어긋남은 스로틀의 1분 여유로 흡수).
 *  - 실패해도 메인 인제스트 파이프라인은 절대 안 깨지게 try/catch
 */

import type { IngestEnv } from "./env";
import { readIntVar } from "./db";
import { broadcastPush } from "./push";
import { provenanceLines, parseTime } from "../../../src/lib/provenance";

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
          "StraitDesk-Ingest/1.0 (+contact: kangps7675@gmail.com; non-commercial situational dashboard)",
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
    // 틱 시각과 적재 시각이 수 초 어긋나므로 1분 여유를 둔다 — 안 그러면 15분 크론에서 한 틱씩 건너뛴다
    return Date.now() - lastMs >= minIntervalMinutes * 60 * 1000 - 60_000;
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
           crew_held, detail, utc_date_of_incident, utc_date_created, ingested_at, first_seen_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?17)
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

/** 푸시를 보낼 만한 유형 — 실제 피습·승선·납치·나포. Advisory·의심활동은 경고라 제외 */
function isPushWorthy(typeName: string): boolean {
  return /attack|board|hijack|seiz|piracy|detain/i.test(typeName);
}

const TYPE_KO: Record<string, string> = {
  attack: "공격",
  boarding: "승선",
  hijack: "납치",
  seizure: "나포",
  piracy: "해적 행위",
};

function pushText(row: UkmtoIncidentRow, seenAt: string, lang: "ko" | "en"): { title: string; body: string } {
  const type = (row.incident_type_name || "").trim();
  const typeLabel = lang === "ko" ? (TYPE_KO[type.toLowerCase()] ?? type) : type;
  const vessel = (row.vessel_type || "").trim();
  const place = (row.place || row.region || "").trim();
  const title = lang === "ko" ? `UKMTO 신규 · ${typeLabel}${vessel ? ` · ${vessel}` : ""}` : `UKMTO new · ${typeLabel}${vessel ? ` · ${vessel}` : ""}`;
  const lines = provenanceLines(
    {
      occurredAt: parseTime(row.utc_date_of_incident),
      publishedAt: parseTime(row.utc_date_created),
      firstSeenAt: parseTime(seenAt),
    },
    "UKMTO",
    lang,
  ).map((l) => `${l.label} ${l.value}`);
  return { title, body: [place, ...lines].filter(Boolean).join("\n") };
}

/**
 * 새로 올라온 피습·납치 건을 푸시로 알린다.
 *  - 표가 비어 있던 첫 적재는 건너뛴다(과거 건 폭주 방지), 사건 후 72시간이 지난 건도 건너뛴다.
 *  - 사건 id를 먼저 선점(ukmto_push_sent)해 동시 크론의 이중 발송을 막는다.
 *  - 한 번에 3건을 넘으면 개별 알림 대신 요약 한 건.
 */
async function pushNewIncidents(
  env: IngestEnv,
  fresh: UkmtoIncidentRow[],
  seenAt: string,
): Promise<void> {
  const flag = (env.UKMTO_PUSH_ENABLED ?? "true").toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return;
  const cutoff = Date.now() - 72 * 3_600_000;
  const worthy = fresh.filter((r) => {
    if (!isPushWorthy(r.incident_type_name)) return false;
    const t = parseTime(r.utc_date_of_incident);
    return t == null || t >= cutoff;
  });
  const claimed: UkmtoIncidentRow[] = [];
  for (const row of worthy) {
    const res = await env.DB.prepare(
      `INSERT OR IGNORE INTO ukmto_push_sent (id, sent_at) VALUES (?1, ?2)`,
    )
      .bind(row.id, seenAt)
      .run();
    if (((res.meta as { changes?: number } | undefined)?.changes ?? 0) > 0) claimed.push(row);
  }
  if (claimed.length === 0) return;
  const tag = `ukmto-${claimed[0]!.id}`;
  if (claimed.length <= 3) {
    for (const row of claimed) {
      for (const lang of ["ko", "en"] as const) {
        const msg = pushText(row, seenAt, lang);
        await broadcastPush(env, { ...msg, url: "/", tag: `ukmto-${row.id}` }, { lang });
      }
    }
    return;
  }
  await broadcastPush(
    env,
    { title: `UKMTO 신규 ${claimed.length}건`, body: "선박 사건 목록을 확인하세요.", url: "/", tag },
    { lang: "ko" },
  );
  await broadcastPush(
    env,
    { title: `UKMTO ${claimed.length} new incidents`, body: "Open the ship incident list.", url: "/", tag },
    { lang: "en" },
  );
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

  const minInterval = Math.max(5, readIntVar(env, "UKMTO_POLL_MIN_INTERVAL_MINUTES", 5));
  const poll = await shouldPoll(env.DB, minInterval);
  if (!poll) {
    return { count: 0, fetched: 0, errors: [], skipped: true };
  }

  const errors: string[] = [];
  const { rows, error } = await fetchUkmtoRows(env);
  if (error) errors.push(error);

  // 새 사건 판별은 적재 전에 — 적재 후에는 모두 '기존'이 된다
  let fresh: UkmtoIncidentRow[] = [];
  let hadRows = false;
  try {
    const known = new Set<string>();
    const ids = rows.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const q = await env.DB.prepare(
        `SELECT id FROM ukmto_incidents WHERE id IN (${chunk.map(() => "?").join(",")})`,
      )
        .bind(...chunk)
        .all<{ id: string }>();
      for (const r of q.results ?? []) known.add(r.id);
    }
    const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ukmto_incidents`).first<{ n: number }>();
    hadRows = (total?.n ?? 0) > 0;
    fresh = rows.filter((r) => !known.has(r.id));
  } catch {
    fresh = [];
  }

  let count = 0;
  const seenAt = new Date().toISOString();
  try {
    count = await upsertUkmtoIncidents(env.DB, rows);
    if (hadRows && fresh.length > 0) {
      try {
        await pushNewIncidents(env, fresh, seenAt);
      } catch (e) {
        errors.push(e instanceof Error ? `ukmto push: ${e.message}` : "ukmto push failed");
      }
    }
  } catch (e) {
    errors.push(
      e instanceof Error ? `ukmto upsert: ${e.message}` : "ukmto upsert failed (run migration?)",
    );
  }

  return { count, fetched: rows.length, errors, skipped: false };
}
