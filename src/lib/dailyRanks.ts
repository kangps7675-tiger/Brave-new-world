import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyEntityRanks } from "@/db/schema";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";

export type DailyRankKind = "theater" | "chokepoint";

export type DailyRankEntry = {
  rankDate: string;
  kind: DailyRankKind;
  entityId: string;
  labelKo: string;
  labelEn: string;
  score: number;
  rank: number;
  prevRank: number | null;
  deltaRank: number | null;
  deltaScore: number | null;
  detail: Record<string, unknown> | null;
  updatedAt: string;
};

/** 간판 숫자 — 전장 z-score 점수의 평균·최고치 혼합 (0–100) */
export type WorldTensionSnapshot = {
  score: number;
  deltaScore: number | null;
  prevScore: number | null;
  method?: string | null;
};

export type DailyRanksPayload = {
  date: string;
  fetchedAt: string;
  source: "d1" | "ingest-worker" | "empty";
  theater: DailyRankEntry[];
  chokepoint: DailyRankEntry[];
  worldTension?: WorldTensionSnapshot | null;
  /** 어제 타깃 예측 맞춘 % — 없으면 null */
  yesterdayCorrectPct?: number | null;
};

/** detail_json.displayScore 또는 당일 max 대비 0–100 */
export function displayTensionScore(entry: DailyRankEntry): number {
  const fromDetail = entry.detail?.displayScore;
  if (typeof fromDetail === "number" && Number.isFinite(fromDetail)) {
    return Math.round(fromDetail * 10) / 10;
  }
  return Math.round(Math.max(0, entry.score) * 10) / 10;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function utcRankDate(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function prevUtcRankDate(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() - 1);
  return utcRankDate(d);
}

export function nextUtcRankDate(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return utcRankDate(d);
}

function parseDetail(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapDrizzleRow(
  row: typeof dailyEntityRanks.$inferSelect,
): DailyRankEntry | null {
  if (row.kind !== "theater" && row.kind !== "chokepoint") return null;
  return {
    rankDate: row.rankDate,
    kind: row.kind,
    entityId: row.entityId,
    labelKo: row.labelKo,
    labelEn: row.labelEn,
    score: Number(row.score) || 0,
    rank: Number(row.rank) || 0,
    prevRank: row.prevRank == null ? null : Number(row.prevRank),
    deltaRank: row.deltaRank == null ? null : Number(row.deltaRank),
    deltaScore: row.deltaScore == null ? null : Number(row.deltaScore),
    detail: parseDetail(row.detailJson),
    updatedAt: row.updatedAt,
  };
}

type WorkerRankRow = {
  rank_date?: string;
  kind?: string;
  entity_id?: string;
  label_ko?: string;
  label_en?: string;
  score?: number;
  rank?: number;
  prev_rank?: number | null;
  delta_rank?: number | null;
  delta_score?: number | null;
  detail_json?: string | null;
  updated_at?: string;
};

function mapWorkerRow(row: WorkerRankRow): DailyRankEntry | null {
  if (row.kind !== "theater" && row.kind !== "chokepoint") return null;
  if (!row.rank_date || !row.entity_id || !row.label_ko || !row.label_en || !row.updated_at) {
    return null;
  }
  return {
    rankDate: row.rank_date,
    kind: row.kind,
    entityId: row.entity_id,
    labelKo: row.label_ko,
    labelEn: row.label_en,
    score: Number(row.score) || 0,
    rank: Number(row.rank) || 0,
    prevRank: row.prev_rank == null ? null : Number(row.prev_rank),
    deltaRank: row.delta_rank == null ? null : Number(row.delta_rank),
    deltaScore: row.delta_score == null ? null : Number(row.delta_score),
    detail: parseDetail(row.detail_json),
    updatedAt: row.updated_at,
  };
}

function mapWorldTensionFromRow(row: {
  score?: number | null;
  delta_score?: number | null;
  deltaScore?: number | null;
  detail_json?: string | null;
  detailJson?: string | null;
}): WorldTensionSnapshot | null {
  const score = Number(row.score);
  if (!Number.isFinite(score)) return null;
  const detail = parseDetail(row.detail_json ?? row.detailJson);
  const deltaRaw = row.delta_score ?? row.deltaScore;
  return {
    score: Math.round(score * 10) / 10,
    deltaScore: deltaRaw == null ? null : Math.round(Number(deltaRaw) * 10) / 10,
    prevScore:
      detail && typeof detail.prevScore === "number"
        ? Math.round(detail.prevScore * 10) / 10
        : null,
    method:
      detail && typeof detail.components === "object"
        ? String((detail.components as Record<string, unknown>).methodology ?? "") || null
        : detail && typeof detail.methodology === "string"
          ? detail.methodology
          : "theater-avg-max-blend",
  };
}

async function readWorldTensionFromD1(date: string): Promise<WorldTensionSnapshot | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(dailyEntityRanks)
      .where(eq(dailyEntityRanks.rankDate, date));
    const world = rows.find((r) => r.kind === "world" && r.entityId === "global");
    if (!world) return null;
    return mapWorldTensionFromRow({
      score: world.score,
      deltaScore: world.deltaScore,
      detailJson: world.detailJson,
    });
  } catch {
    return null;
  }
}

export async function readDailyRanksFromD1(options: {
  date?: string;
  limit?: number;
}): Promise<DailyRanksPayload | null> {
  const date = options.date || utcRankDate();
  const limit = Math.min(10, Math.max(1, options.limit ?? 5));
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(dailyEntityRanks)
      .where(eq(dailyEntityRanks.rankDate, date))
      .orderBy(asc(dailyEntityRanks.kind), asc(dailyEntityRanks.rank));

    const theater: DailyRankEntry[] = [];
    const chokepoint: DailyRankEntry[] = [];
    let worldTension: WorldTensionSnapshot | null = null;
    for (const row of rows) {
      if (row.kind === "world" && row.entityId === "global") {
        worldTension = mapWorldTensionFromRow({
          score: row.score,
          deltaScore: row.deltaScore,
          detailJson: row.detailJson,
        });
        continue;
      }
      const mapped = mapDrizzleRow(row);
      if (!mapped) continue;
      if (mapped.kind === "theater" && theater.length < limit) theater.push(mapped);
      if (mapped.kind === "chokepoint" && chokepoint.length < limit) chokepoint.push(mapped);
    }
    if (theater.length === 0 && chokepoint.length === 0 && !worldTension) return null;
    return {
      date,
      fetchedAt: new Date().toISOString(),
      source: "d1",
      theater,
      chokepoint,
      worldTension,
    };
  } catch {
    return null;
  }
}

export async function readDailyRanksFromIngestWorker(options: {
  date?: string;
  limit?: number;
}): Promise<DailyRanksPayload | null> {
  const base = ingestWorkerBase();
  if (!base) return null;
  const date = options.date || utcRankDate();
  const limit = Math.min(10, Math.max(1, options.limit ?? 5));
  try {
    const qs = new URLSearchParams({ date, limit: String(Math.max(limit * 2, 10)) });
    const res = await fetch(`${base}/daily-ranks?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      ranks?: WorkerRankRow[];
      yesterdayCorrectPct?: number | null;
      worldTension?: {
        score?: number;
        deltaScore?: number | null;
        prevScore?: number | null;
        detail?: Record<string, unknown> | null;
      } | null;
    };
    const theater: DailyRankEntry[] = [];
    const chokepoint: DailyRankEntry[] = [];
    for (const row of payload.ranks ?? []) {
      const mapped = mapWorkerRow(row);
      if (!mapped) continue;
      if (mapped.kind === "theater" && theater.length < limit) theater.push(mapped);
      if (mapped.kind === "chokepoint" && chokepoint.length < limit) chokepoint.push(mapped);
    }
    const worldTension =
      payload.worldTension && typeof payload.worldTension.score === "number"
        ? {
            score: Math.round(payload.worldTension.score * 10) / 10,
            deltaScore:
              payload.worldTension.deltaScore == null
                ? null
                : Math.round(Number(payload.worldTension.deltaScore) * 10) / 10,
            prevScore:
              payload.worldTension.prevScore == null
                ? null
                : Math.round(Number(payload.worldTension.prevScore) * 10) / 10,
            method: "theater-avg-max-blend",
          }
        : await readWorldTensionFromD1(date).catch(() => null);
    if (theater.length === 0 && chokepoint.length === 0 && !worldTension) return null;
    return {
      date,
      fetchedAt: new Date().toISOString(),
      source: "ingest-worker",
      theater,
      chokepoint,
      worldTension,
      yesterdayCorrectPct:
        typeof payload.yesterdayCorrectPct === "number"
          ? payload.yesterdayCorrectPct
          : null,
    };
  } catch {
    return null;
  }
}

export async function loadDailyRanks(options: {
  date?: string;
  limit?: number;
} = {}): Promise<DailyRanksPayload> {
  const date = options.date || utcRankDate();
  const fromD1 = await readDailyRanksFromD1(options);
  if (fromD1) {
    return { ...fromD1, yesterdayCorrectPct: fromD1.yesterdayCorrectPct ?? null };
  }
  const fromWorker = await readDailyRanksFromIngestWorker(options);
  if (fromWorker) {
    return {
      ...fromWorker,
      yesterdayCorrectPct: fromWorker.yesterdayCorrectPct ?? null,
    };
  }
  return {
    date,
    fetchedAt: new Date().toISOString(),
    source: "empty",
    theater: [],
    chokepoint: [],
    worldTension: null,
    yesterdayCorrectPct: null,
  };
}

/** UI / 카드용 순위 변동 표기 — ▲2 = 순위 상승(숫자 감소) */
export function formatRankDelta(
  deltaRank: number | null | undefined,
  lang: "ko" | "en" = "ko",
): string {
  if (deltaRank == null || deltaRank === 0) {
    return lang === "en" ? "—" : "변동없음";
  }
  if (deltaRank > 0) return `▲${deltaRank}`;
  return `▼${Math.abs(deltaRank)}`;
}

export function formatWorldTensionDelta(
  deltaScore: number | null | undefined,
  lang: "ko" | "en" = "ko",
): string {
  if (deltaScore == null || !Number.isFinite(deltaScore) || Math.abs(deltaScore) < 0.05) {
    return lang === "en" ? "vs yesterday —" : "어제 대비 —";
  }
  const rounded = Math.round(deltaScore * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return lang === "en"
    ? `vs yesterday ${sign}${rounded}`
    : `어제보다 ${sign}${rounded}`;
}

export function dailyRankLabel(entry: DailyRankEntry, lang: "ko" | "en"): string {
  return lang === "en" ? entry.labelEn : entry.labelKo;
}
