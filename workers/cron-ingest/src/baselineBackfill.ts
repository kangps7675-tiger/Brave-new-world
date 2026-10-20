/**
 * 90일 기준선 백필 — theater_signal_daily 채우기.
 * - GDELT DOC TimelineVol: mentions (전장 키워드)
 * - FIRMS area CSV (최대 ~10일 NRT / SP date 청크): fire_count
 * 매 cron은 당일 스냅샷만 쌓고, 이 모듈은 /backfill-baseline 또는 희소 cron 호출.
 */

import type { IngestEnv } from "./env";
import { getFirmsMapKey } from "./db";
import { FIRMS_THEATERS, buildFirmsAreaUrl, parseFirmsCsv } from "./firms";

const GDELT_QUERIES: Array<{ theaterId: string; query: string }> = [
  { theaterId: "ukraine", query: "(Ukraine OR Donbas OR Zaporizhzhia) sourcelang:eng" },
  { theaterId: "middle-east", query: "(Israel OR Gaza OR Iran OR Hezbollah) sourcelang:eng" },
  { theaterId: "taiwan", query: '(Taiwan OR "Taiwan Strait" OR PLA) sourcelang:eng' },
  { theaterId: "korea", query: '("North Korea" OR DPRK OR Pyongyang) sourcelang:eng' },
  {
    theaterId: "pacific",
    query: '("South China Sea" OR "Philippine Sea" OR AUKUS) sourcelang:eng',
  },
  {
    theaterId: "atlantic",
    query: '(NATO OR "GIUK gap" OR "North Atlantic") sourcelang:eng',
  },
  {
    theaterId: "arctic",
    query: '(Arctic OR "Northern Sea Route" OR Svalbard) sourcelang:eng',
  },
];

/** FIRMS theater id → rank theater ids that include it */
const FIRMS_TO_RANK: Record<string, string[]> = {
  ukraine: ["ukraine"],
  "black-sea": ["ukraine"],
  "middle-east": ["middle-east"],
  "red-sea": ["middle-east"],
  taiwan: ["taiwan"],
  "south-china-sea": ["taiwan", "pacific"],
  korea: ["korea"],
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function gdeltDateTime(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}`
  );
}

type SignalPatch = {
  mentions?: number;
  points?: number;
  fire_count?: number;
  telegram_count?: number;
  air_raid_score?: number;
};

async function upsertSignalPatches(
  db: D1Database,
  patches: Map<string, Map<string, SignalPatch>>,
): Promise<number> {
  const updatedAt = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];
  for (const [signalDate, byTheater] of patches) {
    for (const [theaterId, patch] of byTheater) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO theater_signal_daily (
               signal_date, theater_id, mentions, points, fire_count,
               telegram_count, air_raid_score, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(signal_date, theater_id) DO UPDATE SET
               mentions = CASE WHEN ?3 > 0 THEN ?3 ELSE theater_signal_daily.mentions END,
               points = CASE WHEN ?4 > 0 THEN ?4 ELSE theater_signal_daily.points END,
               fire_count = CASE WHEN ?5 > 0 THEN ?5 ELSE theater_signal_daily.fire_count END,
               telegram_count = CASE
                 WHEN ?6 > 0 THEN ?6 ELSE theater_signal_daily.telegram_count END,
               air_raid_score = CASE
                 WHEN ?7 > 0 THEN ?7 ELSE theater_signal_daily.air_raid_score END,
               updated_at = excluded.updated_at`,
          )
          .bind(
            signalDate,
            theaterId,
            patch.mentions ?? 0,
            patch.points ?? 0,
            patch.fire_count ?? 0,
            patch.telegram_count ?? 0,
            patch.air_raid_score ?? 0,
            updatedAt,
          ),
      );
    }
  }
  let written = 0;
  for (let i = 0; i < stmts.length; i += 40) {
    await db.batch(stmts.slice(i, i + 40));
    written += Math.min(40, stmts.length - i);
  }
  return written;
}

function touchPatch(
  patches: Map<string, Map<string, SignalPatch>>,
  date: string,
  theaterId: string,
  field: keyof SignalPatch,
  add: number,
  mode: "add" | "max" = "add",
) {
  if (!date || !theaterId || !Number.isFinite(add)) return;
  let byT = patches.get(date);
  if (!byT) {
    byT = new Map();
    patches.set(date, byT);
  }
  const cur = byT.get(theaterId) ?? {};
  const prev = Number(cur[field]) || 0;
  cur[field] = mode === "max" ? Math.max(prev, add) : prev + add;
  byT.set(theaterId, cur);
}

async function backfillGdeltTimelines(
  days: number,
): Promise<{ patches: Map<string, Map<string, SignalPatch>>; errors: string[] }> {
  const patches = new Map<string, Map<string, SignalPatch>>();
  const errors: string[] = [];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  for (const { theaterId, query } of GDELT_QUERIES) {
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}` +
      `&mode=TimelineVol&startdatetime=${gdeltDateTime(start)}` +
      `&enddatetime=${gdeltDateTime(end)}&format=json&timelinesmooth=0`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        errors.push(`gdelt/${theaterId}: HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as {
        timeline?: Array<{ series?: Array<{ date?: string; value?: number }> }>;
      };
      const series = body.timeline?.[0]?.series ?? [];
      for (const point of series) {
        const rawDate = String(point.date || "");
        // GDELT often returns YYYYMMDDHHMMSS or ISO
        let signalDate = "";
        if (/^\d{8}/.test(rawDate)) {
          signalDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        } else if (rawDate.includes("-")) {
          signalDate = rawDate.slice(0, 10);
        }
        const value = Number(point.value) || 0;
        if (signalDate && value > 0) {
          touchPatch(patches, signalDate, theaterId, "mentions", value);
          touchPatch(patches, signalDate, theaterId, "points", Math.max(1, Math.round(value / 50)));
        }
      }
    } catch (error) {
      errors.push(
        `gdelt/${theaterId}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }
  return { patches, errors };
}

async function backfillFirmsRecent(
  mapKey: string,
  dayRange: number,
): Promise<{ patches: Map<string, Map<string, SignalPatch>>; errors: string[] }> {
  const patches = new Map<string, Map<string, SignalPatch>>();
  const errors: string[] = [];
  const source = "VIIRS_NOAA20_NRT";
  const days = Math.min(10, Math.max(1, dayRange));

  for (const theater of FIRMS_THEATERS) {
    try {
      const url = buildFirmsAreaUrl({
        mapKey,
        ...theater,
        dayRange: days,
        source,
      });
      const res = await fetch(url, { headers: { Accept: "text/csv" } });
      const csv = await res.text();
      if (!res.ok) {
        errors.push(`firms/${theater.id}: HTTP ${res.status}`);
        continue;
      }
      if (!csv.toLowerCase().includes("latitude")) continue;
      const fires = parseFirmsCsv(csv, theater.id, source, 5000);
      const byDate = new Map<string, number>();
      for (const fire of fires) {
        const d = fire.acq_date || formatUtcDate(new Date());
        byDate.set(d, (byDate.get(d) || 0) + 1);
      }
      const rankIds = FIRMS_TO_RANK[theater.id] ?? [];
      for (const [date, count] of byDate) {
        for (const rankId of rankIds) {
          touchPatch(patches, date, rankId, "fire_count", count);
        }
      }
    } catch (error) {
      errors.push(
        `firms/${theater.id}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }
  return { patches, errors };
}

/**
 * SP 소스 + end-date 로 더 오래된 청크 시도 (실패해도 무시).
 * 한 호출당 maxChunks * theaters 요청 — Worker 시간 한도 주의.
 */
async function backfillFirmsArchiveChunks(
  mapKey: string,
  options: { chunkDays?: number; maxChunks?: number } = {},
): Promise<{ patches: Map<string, Map<string, SignalPatch>>; errors: string[] }> {
  const patches = new Map<string, Map<string, SignalPatch>>();
  const errors: string[] = [];
  const chunkDays = Math.min(7, Math.max(1, options.chunkDays ?? 5));
  const maxChunks = Math.min(12, Math.max(1, options.maxChunks ?? 6));
  const source = "VIIRS_SNPP_SP";

  for (let c = 0; c < maxChunks; c += 1) {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - c * chunkDays);
    const endDate = formatUtcDate(end);

    for (const theater of FIRMS_THEATERS) {
      try {
        const url = buildFirmsAreaUrl({
          mapKey,
          ...theater,
          dayRange: chunkDays,
          source,
          endDate,
        });
        const res = await fetch(url, { headers: { Accept: "text/csv" } });
        const csv = await res.text();
        if (!res.ok || !csv.toLowerCase().includes("latitude")) continue;
        const fires = parseFirmsCsv(csv, theater.id, source, 8000);
        const byDate = new Map<string, number>();
        for (const fire of fires) {
          const d = fire.acq_date || endDate;
          byDate.set(d, (byDate.get(d) || 0) + 1);
        }
        const rankIds = FIRMS_TO_RANK[theater.id] ?? [];
        for (const [date, count] of byDate) {
          for (const rankId of rankIds) {
            touchPatch(patches, date, rankId, "fire_count", count);
          }
        }
      } catch (error) {
        errors.push(
          `firms-sp/${theater.id}@${endDate}: ${
            error instanceof Error ? error.message : "fail"
          }`,
        );
      }
    }
  }
  return { patches, errors };
}

function mergePatches(
  into: Map<string, Map<string, SignalPatch>>,
  from: Map<string, Map<string, SignalPatch>>,
) {
  for (const [date, byT] of from) {
    for (const [theaterId, patch] of byT) {
      for (const key of Object.keys(patch) as (keyof SignalPatch)[]) {
        const v = patch[key];
        if (v == null) continue;
        // fire overlap(NRT vs SP)는 max, GDELT mentions는 덮어쓰기(max)
        const mode = key === "mentions" || key === "fire_count" ? "max" : "add";
        touchPatch(into, date, theaterId, key, v, mode);
      }
    }
  }
}

export async function runBaselineBackfill(
  env: IngestEnv,
  options: {
    days?: number;
    firmsDays?: number;
    includeArchive?: boolean;
    archiveChunks?: number;
  } = {},
): Promise<{
  ok: boolean;
  days: number;
  rowsUpserted: number;
  gdeltDates: number;
  firmsDates: number;
  errors: string[];
}> {
  const days = Math.min(90, Math.max(7, options.days ?? 90));
  const errors: string[] = [];
  const merged = new Map<string, Map<string, SignalPatch>>();

  const gdelt = await backfillGdeltTimelines(days);
  errors.push(...gdelt.errors);
  mergePatches(merged, gdelt.patches);

  const mapKey = getFirmsMapKey(env);
  if (mapKey) {
    const firms = await backfillFirmsRecent(mapKey, options.firmsDays ?? 5);
    errors.push(...firms.errors);
    mergePatches(merged, firms.patches);

    if (options.includeArchive !== false) {
      const archive = await backfillFirmsArchiveChunks(mapKey, {
        maxChunks: options.archiveChunks ?? 6,
        chunkDays: 5,
      });
      errors.push(...archive.errors.slice(0, 8));
      mergePatches(merged, archive.patches);
    }
  } else {
    errors.push("FIRMS map key missing — fire backfill skipped");
  }

  let rowsUpserted = 0;
  try {
    rowsUpserted = await upsertSignalPatches(env.DB, merged);
  } catch (error) {
    errors.push(
      error instanceof Error
        ? error.message
        : "theater_signal_daily upsert failed (migration 0014?)",
    );
  }

  return {
    ok: rowsUpserted > 0 || errors.length === 0,
    days,
    rowsUpserted,
    gdeltDates: gdelt.patches.size,
    firmsDates: merged.size,
    errors: errors.slice(0, 24),
  };
}

/** Cron용: 표본이 얇을 때만 가벼운 NRT+GDELT 백필 (하루 1회 권장) */
export async function maybeLightBaselineBackfill(env: IngestEnv): Promise<{
  ran: boolean;
  detail?: Awaited<ReturnType<typeof runBaselineBackfill>>;
}> {
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(DISTINCT signal_date) AS c FROM theater_signal_daily`,
    ).first<{ c: number }>();
    const coverage = Number(row?.c) || 0;
    if (coverage >= 21) return { ran: false };
  } catch {
    return { ran: false };
  }

  const detail = await runBaselineBackfill(env, {
    days: 30,
    firmsDays: 5,
    includeArchive: true,
    archiveChunks: 3,
  });
  return { ran: true, detail };
}
