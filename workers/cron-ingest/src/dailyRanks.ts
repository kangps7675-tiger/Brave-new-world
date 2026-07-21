/**
 * 일일 전장 긴장도 + 초크포인트 공급망 스트레스 랭킹.
 * D1 라이브 스냅샷(GDELT / FIRMS / AIS)으로 UTC 날짜별 TOP 스냅샷을 upsert.
 */

import { severityTierFromText } from "./telegramSeverity";
import {
  googleNewsVerificationByTheater,
  verificationLevelFor,
  VERIFICATION_FACTOR,
  type VerificationLevel,
} from "./newsVerification";

export type DailyRankKind = "theater" | "chokepoint" | "world";

export type DailyRankRow = {
  rank_date: string;
  kind: DailyRankKind;
  entity_id: string;
  label_ko: string;
  label_en: string;
  score: number;
  rank: number;
  prev_rank: number | null;
  delta_rank: number | null;
  delta_score: number | null;
  detail_json: string | null;
  updated_at: string;
};

type ScoredEntity = {
  entityId: string;
  labelKo: string;
  labelEn: string;
  score: number;
  detail: Record<string, unknown>;
};

const THEATERS: Array<{
  id: string;
  labelKo: string;
  labelEn: string;
  gdeltTags: string[];
  firmsIds: string[];
}> = [
  {
    id: "ukraine",
    labelKo: "우크라이나 전선",
    labelEn: "Ukraine front",
    gdeltTags: ["ukraine-tension"],
    firmsIds: ["ukraine", "black-sea"],
  },
  {
    id: "middle-east",
    labelKo: "중동·이란",
    labelEn: "Middle East / Iran",
    gdeltTags: ["middle-east-tension"],
    firmsIds: ["middle-east", "red-sea"],
  },
  {
    id: "taiwan",
    labelKo: "대만 해협",
    labelEn: "Taiwan Strait",
    gdeltTags: ["taiwan-tension"],
    firmsIds: ["taiwan", "south-china-sea"],
  },
  {
    id: "korea",
    labelKo: "한반도",
    labelEn: "Korean Peninsula",
    gdeltTags: ["korea-tension"],
    firmsIds: ["korea"],
  },
  {
    id: "pacific",
    labelKo: "태평양 지정학",
    labelEn: "Pacific geopolitics",
    gdeltTags: ["pacific-tension"],
    firmsIds: ["south-china-sea"],
  },
  {
    id: "atlantic",
    labelKo: "대서양 지정학",
    labelEn: "Atlantic geopolitics",
    gdeltTags: ["atlantic-tension"],
    firmsIds: [],
  },
  {
    id: "arctic",
    labelKo: "북극 지정학",
    labelEn: "Arctic geopolitics",
    gdeltTags: ["arctic-tension"],
    firmsIds: [],
  },
];

/** Worker에 임베드 — Next logisticsRiskPoints와 동기 유지 */
const CHOKEPOINTS: Array<{
  id: string;
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
  radiusDeg: number;
  tier: number;
}> = [
  { id: "choke-hormuz", labelKo: "호르무즈 해협", labelEn: "Strait of Hormuz", lat: 26.58, lng: 56.25, radiusDeg: 1.2, tier: 1 },
  { id: "choke-suez", labelKo: "수에즈 운하", labelEn: "Suez Canal", lat: 31.25, lng: 32.34, radiusDeg: 1.0, tier: 1 },
  { id: "choke-bab-el-mandeb", labelKo: "바브엘만데브", labelEn: "Bab-el-Mandeb", lat: 12.61, lng: 43.35, radiusDeg: 1.1, tier: 1 },
  { id: "choke-malacca", labelKo: "말라카 해협", labelEn: "Strait of Malacca", lat: 2.52, lng: 101.34, radiusDeg: 1.4, tier: 1 },
  { id: "choke-taiwan", labelKo: "대만 해협", labelEn: "Taiwan Strait", lat: 24.32, lng: 120.85, radiusDeg: 1.8, tier: 1 },
  { id: "choke-panama", labelKo: "파나마 운하", labelEn: "Panama Canal", lat: 9.12, lng: -79.91, radiusDeg: 0.9, tier: 1 },
  { id: "choke-bosporus", labelKo: "보스포루스", labelEn: "Bosporus", lat: 41.12, lng: 29.05, radiusDeg: 0.8, tier: 2 },
  { id: "choke-gibraltar", labelKo: "지브롤터", labelEn: "Gibraltar", lat: 35.98, lng: -5.6, radiusDeg: 0.9, tier: 2 },
  { id: "choke-good-hope", labelKo: "희망봉 우회", labelEn: "Cape of Good Hope", lat: -34.35, lng: 18.48, radiusDeg: 1.6, tier: 2 },
];

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

/** 예측 허용 전장 entity id */
export const THEATER_ENTITY_IDS = THEATERS.map((t) => t.id);

async function gdeltMentionByTag(db: D1Database): Promise<Map<string, { mentions: number; points: number }>> {
  const map = new Map<string, { mentions: number; points: number }>();
  try {
    const { results } = await db
      .prepare(
        `SELECT query_tag AS tag,
                COUNT(*) AS points,
                COALESCE(SUM(COALESCE(mention_count, 1)), 0) AS mentions
         FROM gdelt_points
         WHERE query_tag IS NOT NULL AND query_tag != ''
         GROUP BY query_tag`,
      )
      .all<{ tag: string; points: number; mentions: number }>();
    for (const row of results ?? []) {
      map.set(String(row.tag), {
        points: Number(row.points) || 0,
        mentions: Number(row.mentions) || 0,
      });
    }
  } catch {
    // table may be empty
  }
  return map;
}

async function firmsCountByTheater(db: D1Database): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { results } = await db
      .prepare(
        `SELECT theater AS id, COUNT(*) AS c
         FROM firms_fires
         WHERE theater IS NOT NULL AND theater != ''
         GROUP BY theater`,
      )
      .all<{ id: string; c: number }>();
    for (const row of results ?? []) {
      map.set(String(row.id), Number(row.c) || 0);
    }
  } catch {
    // ignore
  }
  return map;
}

async function countNear(
  db: D1Database,
  table: "gdelt_points" | "ais_vessels",
  lat: number,
  lng: number,
  radiusDeg: number,
): Promise<number> {
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS c FROM ${table}
         WHERE lat BETWEEN ?1 AND ?2 AND lng BETWEEN ?3 AND ?4`,
      )
      .bind(lat - radiusDeg, lat + radiusDeg, lng - radiusDeg, lng + radiusDeg)
      .first<{ c: number }>();
    return Number(row?.c) || 0;
  } catch {
    return 0;
  }
}

/** log1p 압축 — 스파이크 완화 (초크포인트·콜드스타트용) */
function log1p(n: number): number {
  return Math.log1p(Math.max(0, n));
}

const EMA_TODAY = 0.55;
const EMA_PREV = 0.45;
/** 전일 대비 하루 최대 변동 비율 */
const MAX_DAY_DELTA_RATIO = 0.4;
/** 전장별 베이스라인 창 — 최근 N일 대비 이탈(z-score). 가용 일수만큼 사용. */
const BASELINE_DAYS = 90;
/** 세계 긴장도 = 평균·최고치 혼합 (HOI World Tension / GPR 스타일 간판 숫자) */
const WORLD_AVG_WEIGHT = 0.55;
const WORLD_MAX_WEIGHT = 0.45;
const WORLD_ENTITY_ID = "global";

type TheaterSignals = {
  mentions: number;
  points: number;
  fireCount: number;
  telegramCount: number;
  airRaidScore: number;
};

/**
 * soft: GDELT + telegram + air raid / hard: FIRMS
 * soft 합 0.75 + hard 0.25 = 1.0
 */
const SIGNAL_WEIGHTS: Record<keyof TheaterSignals, number> = {
  mentions: 0.2,
  points: 0.25,
  fireCount: 0.25,
  telegramCount: 0.2,
  airRaidScore: 0.1,
};

/**
 * raw → EMA(prev) → 일일 cap.
 * detail에 rawScore / smoothScore / components 보존.
 */
function stabilizeScore(
  rawScore: number,
  prevScore: number | null,
  components: Record<string, unknown>,
): { score: number; detail: Record<string, unknown> } {
  const raw = Math.max(0, rawScore);
  let smooth =
    prevScore != null && Number.isFinite(prevScore)
      ? EMA_TODAY * raw + EMA_PREV * prevScore
      : raw;
  if (prevScore != null && Number.isFinite(prevScore)) {
    const maxDelta = Math.max(prevScore, 12) * MAX_DAY_DELTA_RATIO;
    const delta = smooth - prevScore;
    if (delta > maxDelta) smooth = prevScore + maxDelta;
    else if (delta < -maxDelta) smooth = prevScore - maxDelta;
  }
  const score = Math.round(smooth * 100) / 100;
  return {
    score,
    detail: {
      rawScore: Math.round(raw * 100) / 100,
      smoothScore: score,
      prevScore: prevScore == null ? null : Math.round(prevScore * 100) / 100,
      components,
    },
  };
}

function extractTheaterSignals(detail: Record<string, unknown> | null): TheaterSignals {
  const src =
    detail?.components && typeof detail.components === "object"
      ? (detail.components as Record<string, unknown>)
      : detail;
  return {
    mentions: Number(src?.mentions) || 0,
    points: Number(src?.points) || 0,
    fireCount: Number(src?.fireCount) || 0,
    telegramCount: Number(src?.telegramCount) || 0,
    airRaidScore: Number(src?.airRaidScore) || 0,
  };
}

/** 평소 대비 이탈 — 표본이 적으면 soft ratio / log 콜드스타트 */
function zScore(today: number, history: number[]): number {
  const samples = history.filter((n) => Number.isFinite(n));
  if (samples.length === 0) {
    return log1p(today) / 3;
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (samples.length === 1) {
    const base = Math.max(mean, 1);
    return (today - mean) / (base * 0.5);
  }
  const variance =
    samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1);
  const std = Math.sqrt(variance);
  return (today - mean) / Math.max(std, 1);
}

/** z=0 → 50 (평시), +2σ ≈ 78, −2σ ≈ 22 */
function weightedZToScore(weightedZ: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + weightedZ * 14)) * 100) / 100;
}

function shiftUtcDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return utcRankDate(dt);
}

/**
 * 텔레그램 알림 하나하나의 내용 심각도(1/3/5)를 합산 — 아직 검증 게이팅 전 원값.
 * 실제 점수 반영 시 scoreTheaters에서 구글뉴스 검증 상태에 따라
 * (미확인이면 count로, 확인되면 severitySum으로) 최종 선택한다.
 */
async function telegramSeverityByTheater(
  db: D1Database,
): Promise<Map<string, { count: number; severitySum: number }>> {
  const map = new Map<string, { count: number; severitySum: number }>();
  try {
    const { results } = await db
      .prepare(
        `SELECT region, text FROM telegram_alerts
         WHERE region IS NOT NULL AND region != ''`,
      )
      .all<{ region: string; text: string | null }>();
    for (const row of results ?? []) {
      const theaterId =
        row.region === "ukraine" ? "ukraine" : row.region === "middle-east" ? "middle-east" : null;
      if (!theaterId) continue;
      const tier = severityTierFromText(row.text || "");
      const entry = map.get(theaterId) ?? { count: 0, severitySum: 0 };
      entry.count += 1;
      entry.severitySum += tier;
      map.set(theaterId, entry);
    }
  } catch {
    // ignore
  }
  return map;
}

async function loadTheaterSignalHistory(
  db: D1Database,
  beforeDate: string,
  days: number,
): Promise<Map<string, TheaterSignals[]>> {
  const map = new Map<string, TheaterSignals[]>();
  const startDate = shiftUtcDate(beforeDate, -days);

  // 1) 내구 일별 집계 테이블 우선 (90일 기준선)
  try {
    const { results } = await db
      .prepare(
        `SELECT signal_date, theater_id, mentions, points, fire_count,
                telegram_count, air_raid_score
         FROM theater_signal_daily
         WHERE signal_date >= ?1 AND signal_date < ?2`,
      )
      .bind(startDate, beforeDate)
      .all<{
        signal_date: string;
        theater_id: string;
        mentions: number;
        points: number;
        fire_count: number;
        telegram_count: number;
        air_raid_score: number;
      }>();
    for (const row of results ?? []) {
      const signals: TheaterSignals = {
        mentions: Number(row.mentions) || 0,
        points: Number(row.points) || 0,
        fireCount: Number(row.fire_count) || 0,
        telegramCount: Number(row.telegram_count) || 0,
        airRaidScore: Number(row.air_raid_score) || 0,
      };
      const list = map.get(row.theater_id) ?? [];
      list.push(signals);
      map.set(row.theater_id, list);
    }
  } catch {
    // migration 0014 전
  }

  // 갭 보완: daily_entity_ranks.detail_json (표본이 얇을 때)
  const needFallback = [...map.values()].every((l) => l.length < Math.min(7, days));
  if (needFallback || map.size === 0) {
    try {
      const { results } = await db
        .prepare(
          `SELECT entity_id, detail_json FROM daily_entity_ranks
           WHERE kind = 'theater'
             AND entity_id != ?1
             AND rank_date >= ?2
             AND rank_date < ?3`,
        )
        .bind(WORLD_ENTITY_ID, startDate, beforeDate)
        .all<{ entity_id: string; detail_json: string | null }>();
      for (const row of results ?? []) {
        if ((map.get(row.entity_id)?.length ?? 0) >= days) continue;
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = row.detail_json
            ? (JSON.parse(row.detail_json) as Record<string, unknown>)
            : null;
        } catch {
          parsed = null;
        }
        const signals = extractTheaterSignals(parsed);
        const list = map.get(row.entity_id) ?? [];
        list.push(signals);
        map.set(row.entity_id, list);
      }
    } catch {
      // first run / missing table
    }
  }

  return map;
}

async function persistTheaterSignalDaily(
  db: D1Database,
  rankDate: string,
  byTheater: Map<string, TheaterSignals>,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];
  for (const [theaterId, s] of byTheater) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO theater_signal_daily (
             signal_date, theater_id, mentions, points, fire_count,
             telegram_count, air_raid_score, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
           ON CONFLICT(signal_date, theater_id) DO UPDATE SET
             mentions = excluded.mentions,
             points = excluded.points,
             fire_count = excluded.fire_count,
             telegram_count = excluded.telegram_count,
             air_raid_score = excluded.air_raid_score,
             updated_at = excluded.updated_at`,
        )
        .bind(
          rankDate,
          theaterId,
          s.mentions,
          s.points,
          s.fireCount,
          s.telegramCount,
          s.airRaidScore,
          updatedAt,
        ),
    );
  }
  if (stmts.length > 0) {
    try {
      await db.batch(stmts);
    } catch {
      // table may not exist until migration 0014
    }
  }
}

/**
 * 전장 긴장도 — 절대 카운트가 아니라 최근 최대 90일 베이스라인 대비 z-score 가중합.
 * 우크라 일상 포격은 평범, 대만해협 평소 3배 활동이 진짜 신호.
 *
 * soft(주장 기반: GDELT mentions·points, 텔레그램, 공습경보) / hard(FIRMS 위성 열원) 로 나눠서,
 * soft 쪽에만 구글뉴스 검증계수(0.5/1.0/1.2)를 곱한다. 텔레그램 내용 심각도(1/3/5)도
 * 그 전장이 구글뉴스로 확인되기 전엔 무조건 1(기본)로 클램프 — 검증 안 된 자극적
 * 문구가 그 자체로 점수를 올리는 조작 구멍을 막는다.
 */
async function scoreTheaters(db: D1Database, rankDate: string): Promise<ScoredEntity[]> {
  const gdelt = await gdeltMentionByTag(db);
  const firms = await firmsCountByTheater(db);
  const telegramSeverity = await telegramSeverityByTheater(db);
  const verification = await googleNewsVerificationByTheater(db);
  const { airRaidScoreByTheater } = await import("./airRaidIngest");
  const airRaids = await airRaidScoreByTheater(db, 24);
  const history = await loadTheaterSignalHistory(db, rankDate, BASELINE_DAYS);
  const todayByTheater = new Map<string, TheaterSignals>();

  const scored = THEATERS.map((theater) => {
    let mentions = 0;
    let points = 0;
    for (const tag of theater.gdeltTags) {
      const hit = gdelt.get(tag);
      if (!hit) continue;
      mentions += hit.mentions;
      points += hit.points;
    }
    let fireCount = 0;
    for (const id of theater.firmsIds) {
      fireCount += firms.get(id) ?? 0;
    }

    const level: VerificationLevel = verificationLevelFor(theater.id, verification);
    const verificationFactor = VERIFICATION_FACTOR[level];
    const tSeverity = telegramSeverity.get(theater.id) ?? { count: 0, severitySum: 0 };
    // 미확인이면 내용 등급 무시하고 count(전부 tier 1 취급)만, 확인되면 심각도 합산치 사용
    const telegramCount = level === "unverified" ? tSeverity.count : tSeverity.severitySum;
    const airRaidScore = airRaids.get(theater.id) ?? 0;

    const today: TheaterSignals = {
      mentions,
      points,
      fireCount,
      telegramCount,
      airRaidScore,
    };
    todayByTheater.set(theater.id, today);
    const past = history.get(theater.id) ?? [];

    const zMentions = zScore(
      today.mentions,
      past.map((p) => p.mentions),
    );
    const zPoints = zScore(
      today.points,
      past.map((p) => p.points),
    );
    const zFire = zScore(
      today.fireCount,
      past.map((p) => p.fireCount),
    );
    const zTelegram = zScore(
      today.telegramCount,
      past.map((p) => p.telegramCount),
    );
    const zAirRaid = zScore(
      today.airRaidScore,
      past.map((p) => p.airRaidScore),
    );

    const softZ =
      zMentions * SIGNAL_WEIGHTS.mentions +
      zPoints * SIGNAL_WEIGHTS.points +
      zTelegram * SIGNAL_WEIGHTS.telegramCount +
      zAirRaid * SIGNAL_WEIGHTS.airRaidScore;
    const hardZ = zFire * SIGNAL_WEIGHTS.fireCount;
    const weightedZ = softZ * verificationFactor + hardZ;

    const rawScore = weightedZToScore(weightedZ);
    return {
      entityId: theater.id,
      labelKo: theater.labelKo,
      labelEn: theater.labelEn,
      score: rawScore,
      detail: {
        methodology: "baseline-zscore-90d-verified-airraid",
        baselineDays: BASELINE_DAYS,
        baselineSamples: past.length,
        mentions,
        points,
        fireCount,
        telegramCount,
        airRaidScore,
        telegramRawCount: tSeverity.count,
        telegramSeveritySum: tSeverity.severitySum,
        verificationLevel: level,
        verificationFactor,
        tags: theater.gdeltTags,
        zScores: {
          mentions: Math.round(zMentions * 100) / 100,
          points: Math.round(zPoints * 100) / 100,
          fireCount: Math.round(zFire * 100) / 100,
          telegramCount: Math.round(zTelegram * 100) / 100,
          airRaidScore: Math.round(zAirRaid * 100) / 100,
          soft: Math.round(softZ * 100) / 100,
          hard: Math.round(hardZ * 100) / 100,
          weighted: Math.round(weightedZ * 100) / 100,
        },
      },
    };
  });

  await persistTheaterSignalDaily(db, rankDate, todayByTheater);
  return scored;
}

function computeWorldTension(theaterScores: number[]): number {
  if (theaterScores.length === 0) return 50;
  const avg = theaterScores.reduce((a, b) => a + b, 0) / theaterScores.length;
  const max = Math.max(...theaterScores);
  return Math.round((WORLD_AVG_WEIGHT * avg + WORLD_MAX_WEIGHT * max) * 100) / 100;
}

async function scoreChokepoints(db: D1Database): Promise<ScoredEntity[]> {
  const out: ScoredEntity[] = [];
  for (const choke of CHOKEPOINTS) {
    const gdeltNear = await countNear(db, "gdelt_points", choke.lat, choke.lng, choke.radiusDeg);
    const aisNear = await countNear(db, "ais_vessels", choke.lat, choke.lng, choke.radiusDeg);
    const tierBoost = choke.tier === 1 ? 2.5 : 1.2;
    const rawScore = log1p(gdeltNear) * 5 + log1p(aisNear) * 3 + tierBoost;
    out.push({
      entityId: choke.id,
      labelKo: choke.labelKo,
      labelEn: choke.labelEn,
      score: rawScore,
      detail: { gdeltNear, aisNear, radiusDeg: choke.radiusDeg, tier: choke.tier },
    });
  }
  return out;
}

async function loadPrevRanks(
  db: D1Database,
  rankDate: string,
  kind: DailyRankKind,
): Promise<Map<string, { rank: number; score: number; detailJson: string | null }>> {
  const map = new Map<string, { rank: number; score: number; detailJson: string | null }>();
  try {
    const { results } = await db
      .prepare(
        `SELECT entity_id, rank, score, detail_json FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind = ?2`,
      )
      .bind(rankDate, kind)
      .all<{ entity_id: string; rank: number; score: number; detail_json: string | null }>();
    for (const row of results ?? []) {
      map.set(String(row.entity_id), {
        rank: Number(row.rank) || 0,
        score: Number(row.score) || 0,
        detailJson: row.detail_json ?? null,
      });
    }
  } catch {
    // first run / missing table
  }
  return map;
}

/** SITREP 기록 트리거 — 검증등급 전환은 항상, 점수 델타는 이 이상만 */
const SITREP_SCORE_DELTA_THRESHOLD = 8;

/**
 * daily_entity_ranks upsert 직후, 전일 대비 "판단이 바뀐 순간"만 sitrep_events에 남긴다.
 * 원시 사건(뉴스)이 아니라 우리 시스템 자체의 상태 전환 기록.
 * 테이블이 아직 마이그레이션 안 됐어도(db:generate/db:migrate:remote 전) 조용히 스킵 —
 * 메인 랭킹 파이프라인은 절대 이것 때문에 실패하지 않는다.
 */
async function recordSitrepChanges(
  db: D1Database,
  rankDate: string,
  kind: DailyRankKind,
  ranked: Array<{
    entityId: string;
    labelKo: string;
    labelEn: string;
    score: number;
    deltaScore: number | null;
    detail: Record<string, unknown> | null;
  }>,
  prev: Map<string, { rank: number; score: number; detailJson: string | null }>,
  updatedAt: string,
): Promise<void> {
  if (kind !== "theater") return; // 초크포인트는 베이스라인이 없어 델타가 신호가 아님
  try {
    const stmts: D1PreparedStatement[] = [];
    for (const item of ranked) {
      const prevHit = prev.get(item.entityId);
      const nextVerification =
        (item.detail?.verificationLevel as string | undefined) ?? null;
      let prevVerification: string | null = null;
      if (prevHit?.detailJson) {
        try {
          const parsed = JSON.parse(prevHit.detailJson) as Record<string, unknown>;
          prevVerification = (parsed.verificationLevel as string | undefined) ?? null;
        } catch {
          prevVerification = null;
        }
      }

      const verificationChanged =
        prevVerification != null &&
        nextVerification != null &&
        prevVerification !== nextVerification;
      const bigDelta =
        item.deltaScore != null && Math.abs(item.deltaScore) >= SITREP_SCORE_DELTA_THRESHOLD;

      if (!verificationChanged && !bigDelta) continue;

      const eventType = verificationChanged ? "verification-change" : "score-delta";
      const deltaRounded =
        item.deltaScore != null ? Math.round(item.deltaScore * 10) / 10 : null;
      const messageKo = verificationChanged
        ? `${item.labelKo} · ${prevVerification}→${nextVerification}`
        : `${item.labelKo} · ${deltaRounded! > 0 ? "+" : ""}${deltaRounded}`;
      const messageEn = verificationChanged
        ? `${item.labelEn} · ${prevVerification}→${nextVerification}`
        : `${item.labelEn} · ${deltaRounded! > 0 ? "+" : ""}${deltaRounded}`;

      stmts.push(
        db
          .prepare(
            `INSERT INTO sitrep_events (
               rank_date, entity_id, label_ko, label_en, event_type,
               message_ko, message_en, delta_score, prev_verification, next_verification, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
          )
          .bind(
            rankDate,
            item.entityId,
            item.labelKo,
            item.labelEn,
            eventType,
            messageKo,
            messageEn,
            item.deltaScore,
            prevVerification,
            nextVerification,
            updatedAt,
          ),
      );
    }
    if (stmts.length > 0) await db.batch(stmts);
  } catch {
    // sitrep_events 테이블 미마이그레이션 등 — 메인 파이프라인엔 영향 없음
  }
}

async function upsertKind(
  db: D1Database,
  kind: DailyRankKind,
  scored: ScoredEntity[],
  rankDate: string,
  prevDate: string,
  updatedAt: string,
  options: { absoluteDisplay?: boolean } = {},
): Promise<{ count: number; ranked: ScoredEntity[] }> {
  const prev = await loadPrevRanks(db, prevDate, kind);

  // EMA + 일일 cap 적용 후 재정렬
  const stabilized = scored.map((item) => {
    const prevHit = prev.get(item.entityId);
    const components =
      item.detail && typeof item.detail === "object"
        ? (item.detail as Record<string, unknown>)
        : {};
    const { score, detail } = stabilizeScore(
      item.score,
      prevHit?.score ?? null,
      components,
    );
    return { ...item, score, detail };
  });

  const ranked = stabilized
    .slice()
    .sort((a, b) => b.score - a.score || a.entityId.localeCompare(b.entityId));

  // 당일 상대 0–100 표시용 (max 대비) — z-score 전장은 이미 0–100이라 절대값 사용
  const maxScore = Math.max(...ranked.map((r) => r.score), 1);

  const stmts: D1PreparedStatement[] = [];
  const sitrepCandidates: Array<{
    entityId: string;
    labelKo: string;
    labelEn: string;
    score: number;
    deltaScore: number | null;
    detail: Record<string, unknown> | null;
  }> = [];
  ranked.forEach((item, index) => {
    const rank = index + 1;
    const prevHit = prev.get(item.entityId);
    const prevRank = prevHit?.rank ?? null;
    const deltaRank = prevRank != null ? prevRank - rank : null; // positive = climbed
    const deltaScore = prevHit != null ? item.score - prevHit.score : null;
    const displayScore = options.absoluteDisplay
      ? Math.round(item.score * 10) / 10
      : Math.round((item.score / maxScore) * 1000) / 10;
    const detail = {
      ...item.detail,
      displayScore,
      displayMax: options.absoluteDisplay ? 100 : maxScore,
    };
    sitrepCandidates.push({
      entityId: item.entityId,
      labelKo: item.labelKo,
      labelEn: item.labelEn,
      score: item.score,
      deltaScore,
      detail,
    });
    stmts.push(
      db
        .prepare(
          `INSERT INTO daily_entity_ranks (
             rank_date, kind, entity_id, label_ko, label_en, score, rank,
             prev_rank, delta_rank, delta_score, detail_json, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
           ON CONFLICT(rank_date, kind, entity_id) DO UPDATE SET
             label_ko = excluded.label_ko,
             label_en = excluded.label_en,
             score = excluded.score,
             rank = excluded.rank,
             prev_rank = excluded.prev_rank,
             delta_rank = excluded.delta_rank,
             delta_score = excluded.delta_score,
             detail_json = excluded.detail_json,
             updated_at = excluded.updated_at`,
        )
        .bind(
          rankDate,
          kind,
          item.entityId,
          item.labelKo,
          item.labelEn,
          item.score,
          rank,
          prevRank,
          deltaRank,
          deltaScore,
          JSON.stringify(detail),
          updatedAt,
        ),
    );
  });

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
  await recordSitrepChanges(db, rankDate, kind, sitrepCandidates, prev, updatedAt);
  return { count: ranked.length, ranked };
}

async function upsertWorldTension(
  db: D1Database,
  theaterScores: number[],
  rankDate: string,
  prevDate: string,
  updatedAt: string,
): Promise<{ score: number; deltaScore: number | null }> {
  const raw = computeWorldTension(theaterScores);
  const prev = await loadPrevRanks(db, prevDate, "world");
  const prevHit = prev.get(WORLD_ENTITY_ID);
  const { score, detail } = stabilizeScore(raw, prevHit?.score ?? null, {
    methodology: "theater-avg-max-blend",
    avgWeight: WORLD_AVG_WEIGHT,
    maxWeight: WORLD_MAX_WEIGHT,
    theaterCount: theaterScores.length,
    theaterScores: theaterScores.map((s) => Math.round(s * 10) / 10),
  });
  const deltaScore = prevHit != null ? score - prevHit.score : null;
  await db
    .prepare(
      `INSERT INTO daily_entity_ranks (
         rank_date, kind, entity_id, label_ko, label_en, score, rank,
         prev_rank, delta_rank, delta_score, detail_json, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
       ON CONFLICT(rank_date, kind, entity_id) DO UPDATE SET
         label_ko = excluded.label_ko,
         label_en = excluded.label_en,
         score = excluded.score,
         rank = excluded.rank,
         prev_rank = excluded.prev_rank,
         delta_rank = excluded.delta_rank,
         delta_score = excluded.delta_score,
         detail_json = excluded.detail_json,
         updated_at = excluded.updated_at`,
    )
    .bind(
      rankDate,
      "world",
      WORLD_ENTITY_ID,
      "세계 긴장도 지수 (WTI)",
      "World Tension Index (WTI)",
      score,
      1,
      prevHit?.rank ?? null,
      null,
      deltaScore,
      JSON.stringify({
        ...detail,
        displayScore: Math.round(score * 10) / 10,
        displayMax: 100,
        ticker: "WTI",
        blurbKo: "전장별 평소 대비 이탈(z-score) 가중합 · 평균+최고치 혼합 — 서비스 단일 기축",
        blurbEn: "Baseline z-score blend of theater signals · avg+max mix — product spine index",
        analogy: "VIX / GPR / HOI4 World Tension — headline currency of this product",
      }),
      updatedAt,
    );
  return { score, deltaScore };
}

export async function upsertDailyRanks(db: D1Database): Promise<{
  rankDate: string;
  theaterCount: number;
  chokepointCount: number;
  worldTension: number;
}> {
  const now = new Date();
  const rankDate = utcRankDate(now);
  const prevDate = prevUtcRankDate(now);
  const updatedAt = now.toISOString();

  const theaterResult = await upsertKind(
    db,
    "theater",
    await scoreTheaters(db, rankDate),
    rankDate,
    prevDate,
    updatedAt,
    { absoluteDisplay: true },
  );
  const chokepointResult = await upsertKind(
    db,
    "chokepoint",
    await scoreChokepoints(db),
    rankDate,
    prevDate,
    updatedAt,
  );

  const world = await upsertWorldTension(
    db,
    theaterResult.ranked.map((t) => t.score),
    rankDate,
    prevDate,
    updatedAt,
  );

  // 전일(어제) 타깃 예측 정산 — 어제 TOP1 / 긴장도 방향
  try {
    const { settlePredictions } = await import("./dailyPredictions");
    await settlePredictions(db, prevDate);
    await settlePredictions(db, rankDate);
  } catch (error) {
    console.warn(
      "[ingest] prediction settle skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  // 내일 UP/DOWN 문제 출제 (오늘 점수 = baseline)
  try {
    const { upsertTomorrowPrompt } = await import("./dailyPrompts");
    await upsertTomorrowPrompt(db, { rankDate });
  } catch (error) {
    console.warn(
      "[ingest] daily prompt skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    rankDate,
    theaterCount: theaterResult.count,
    chokepointCount: chokepointResult.count,
    worldTension: world.score,
  };
}

export async function readDailyRanks(
  db: D1Database,
  options: { date?: string; kind?: DailyRankKind; limit?: number } = {},
): Promise<DailyRankRow[]> {
  const rankDate = options.date || utcRankDate();
  const limit = Math.min(20, Math.max(1, options.limit ?? 5));
  try {
    if (options.kind) {
      const { results } = await db
        .prepare(
          `SELECT * FROM daily_entity_ranks
           WHERE rank_date = ?1 AND kind = ?2
           ORDER BY rank ASC
           LIMIT ?3`,
        )
        .bind(rankDate, options.kind, limit)
        .all<DailyRankRow>();
      return results ?? [];
    }
    const { results } = await db
      .prepare(
        `SELECT * FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind IN ('theater', 'chokepoint')
         ORDER BY kind ASC, rank ASC`,
      )
      .bind(rankDate)
      .all<DailyRankRow>();
    return results ?? [];
  } catch {
    return [];
  }
}

export async function readWorldTension(
  db: D1Database,
  date?: string,
): Promise<{
  score: number;
  deltaScore: number | null;
  prevScore: number | null;
  detail: Record<string, unknown> | null;
} | null> {
  const rankDate = date || utcRankDate();
  try {
    const row = await db
      .prepare(
        `SELECT score, delta_score, detail_json FROM daily_entity_ranks
         WHERE rank_date = ?1 AND kind = 'world' AND entity_id = ?2
         LIMIT 1`,
      )
      .bind(rankDate, WORLD_ENTITY_ID)
      .first<{ score: number; delta_score: number | null; detail_json: string | null }>();
    if (!row) return null;
    let detail: Record<string, unknown> | null = null;
    try {
      detail = row.detail_json ? (JSON.parse(row.detail_json) as Record<string, unknown>) : null;
    } catch {
      detail = null;
    }
    const prevScore =
      detail && typeof detail.prevScore === "number" ? detail.prevScore : null;
    return {
      score: Number(row.score) || 0,
      deltaScore: row.delta_score == null ? null : Number(row.delta_score),
      prevScore,
      detail,
    };
  } catch {
    return null;
  }
}
