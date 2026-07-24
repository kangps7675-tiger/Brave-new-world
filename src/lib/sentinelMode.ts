/**
 * 센티넬 모드 — 뷰어별 자동 fly-to 순회.
 * - 지정학: 전장 긴장 + 초크 랭킹
 * - 지경학: 공급망 초크 + 에너지·금융·원자재 중심지 (전장 제외)
 * 매일 같은 코스가 되지 않도록 랭킹 + UTC 날짜 시드 셔플.
 */

import type { DailyRankEntry, DailyRanksPayload } from "@/lib/dailyRanks";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import { ECON_NAV_MENU_GROUPS } from "@/data/econNavRegions";

export type SentinelViewerMode = "conflict" | "economy";

export type SentinelFlyTarget = {
  entityId: string;
  kind: "theater" | "chokepoint" | "econ-hub";
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
  altitude: number;
  rank: number;
};

/** rank entityId → 카메라 (지정학·초크 공통) */
const ENTITY_FLY: Record<string, { lat: number; lng: number; altitude: number }> = {
  ukraine: { lat: 48.5, lng: 37.5, altitude: 1.35 },
  "middle-east": {
    lat: THEATER_FLY_TO["middle-east"].lat,
    lng: THEATER_FLY_TO["middle-east"].lng,
    altitude: 1.55,
  },
  taiwan: {
    lat: THEATER_FLY_TO["china-taiwan"].lat,
    lng: THEATER_FLY_TO["china-taiwan"].lng,
    altitude: 0.95,
  },
  korea: {
    lat: THEATER_FLY_TO.korea.lat,
    lng: THEATER_FLY_TO.korea.lng,
    altitude: 0.75,
  },
  pacific: {
    lat: THEATER_FLY_TO.global.lat,
    lng: 140,
    altitude: 1.85,
  },
  atlantic: {
    lat: THEATER_FLY_TO.atlantic.lat,
    lng: THEATER_FLY_TO.atlantic.lng,
    altitude: 1.9,
  },
  arctic: {
    lat: THEATER_FLY_TO.arctic.lat,
    lng: THEATER_FLY_TO.arctic.lng,
    altitude: 1.85,
  },
  "choke-hormuz": { lat: 26.58, lng: 56.25, altitude: 0.72 },
  "choke-suez": { lat: 31.25, lng: 32.34, altitude: 0.85 },
  "choke-bab-el-mandeb": { lat: 12.61, lng: 43.35, altitude: 0.8 },
  "choke-malacca": { lat: 2.52, lng: 101.34, altitude: 0.9 },
  "choke-taiwan": { lat: 24.32, lng: 120.85, altitude: 0.88 },
  "choke-panama": { lat: 9.12, lng: -79.91, altitude: 0.85 },
  "choke-bosporus": { lat: 41.12, lng: 29.05, altitude: 0.7 },
  "choke-gibraltar": { lat: 35.98, lng: -5.6, altitude: 0.8 },
  "choke-good-hope": { lat: -34.35, lng: 18.48, altitude: 1.2 },
};

/** econ nav id ↔ daily-ranks chokepoint entityId */
const ECON_TO_CHOKE: Record<string, string> = {
  hormuz: "choke-hormuz",
  suez: "choke-suez",
  "suez-canal": "choke-suez",
  "bab-el-mandeb": "choke-bab-el-mandeb",
  malacca: "choke-malacca",
  panama: "choke-panama",
};

const CHOKE_LABELS: Record<string, { ko: string; en: string }> = {
  "choke-hormuz": { ko: "호르무즈 해협", en: "Strait of Hormuz" },
  "choke-suez": { ko: "수에즈 운하", en: "Suez Canal" },
  "choke-bab-el-mandeb": { ko: "바브엘만데브", en: "Bab-el-Mandeb" },
  "choke-malacca": { ko: "말라카 해협", en: "Strait of Malacca" },
  "choke-taiwan": { ko: "대만 해협", en: "Taiwan Strait" },
  "choke-panama": { ko: "파나마 운하", en: "Panama Canal" },
  "choke-bosporus": { ko: "보스포루스", en: "Bosporus" },
  "choke-gibraltar": { ko: "지브롤터", en: "Gibraltar" },
  "choke-good-hope": { ko: "희망봉 우회", en: "Cape of Good Hope" },
};

export const SENTINEL_CYCLE_MS = 9_000;

function utcDateKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 결정적 해시 — 같은 날·같은 입력 → 같은 순회 */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function toConflictTarget(entry: DailyRankEntry): SentinelFlyTarget | null {
  const fly = ENTITY_FLY[entry.entityId];
  if (!fly) return null;
  if (entry.kind !== "theater" && entry.kind !== "chokepoint") return null;
  return {
    entityId: entry.entityId,
    kind: entry.kind,
    labelKo: entry.labelKo,
    labelEn: entry.labelEn,
    lat: fly.lat,
    lng: fly.lng,
    altitude: fly.altitude,
    rank: entry.rank,
  };
}

function flattenEconHubs(): Array<{
  id: string;
  labelKo: string;
  labelEn: string;
  lat: number;
  lng: number;
  altitude: number;
  groupId: string;
}> {
  const out: Array<{
    id: string;
    labelKo: string;
    labelEn: string;
    lat: number;
    lng: number;
    altitude: number;
    groupId: string;
  }> = [];
  const seen = new Set<string>();

  const push = (
    id: string,
    label: string,
    lat: number,
    lng: number,
    altitude: number,
    groupId: string,
  ) => {
    if (seen.has(id)) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    seen.add(id);
    out.push({
      id,
      labelKo: label,
      labelEn: label,
      lat,
      lng,
      altitude: altitude || 1.1,
      groupId,
    });
  };

  for (const group of ECON_NAV_MENU_GROUPS) {
    for (const item of group.items) {
      push(item.id, item.label, item.lat, item.lng, item.altitude, group.id);
      for (const sub of item.subItems ?? []) {
        push(sub.id, sub.label, sub.lat, sub.lng, sub.altitude, group.id);
      }
    }
  }
  return out;
}

function chokeTargetFromRank(entry: DailyRankEntry): SentinelFlyTarget | null {
  const fly = ENTITY_FLY[entry.entityId];
  if (!fly || entry.kind !== "chokepoint") return null;
  const labels = CHOKE_LABELS[entry.entityId];
  return {
    entityId: entry.entityId,
    kind: "chokepoint",
    labelKo: entry.labelKo || labels?.ko || entry.entityId,
    labelEn: entry.labelEn || labels?.en || entry.entityId,
    lat: fly.lat,
    lng: fly.lng,
    altitude: fly.altitude,
    rank: entry.rank,
  };
}

/** 지정학 — 전장·초크 상위 합쳐 랭크 순 */
export function buildConflictSentinelTour(
  payload: DailyRanksPayload,
  limit = 8,
): SentinelFlyTarget[] {
  const merged = [...(payload.theater ?? []), ...(payload.chokepoint ?? [])]
    .slice()
    .sort((a, b) => a.rank - b.rank || b.score - a.score);
  const out: SentinelFlyTarget[] = [];
  const seen = new Set<string>();
  for (const entry of merged) {
    const key = `${entry.kind}:${entry.entityId}`;
    if (seen.has(key)) continue;
    const t = toConflictTarget(entry);
    if (!t) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * 지경학 — 공급망 초크(랭킹) + 에너지·금융·원자재 허브.
 * 전장(theater)은 절대 포함하지 않음.
 * 날짜 시드로 허브 풀을 돌려 매일 코스가 달라지게 함.
 */
export function buildEconomySentinelTour(
  payload: DailyRanksPayload,
  options: { limit?: number; dateKey?: string } = {},
): SentinelFlyTarget[] {
  const limit = options.limit ?? 8;
  const dateKey = options.dateKey ?? utcDateKey();
  const out: SentinelFlyTarget[] = [];
  const seen = new Set<string>();

  const chokes = (payload.chokepoint ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank || b.score - a.score);

  // 1) 오늘 스트레스 높은 초크포인트 우선 (데이터 검증 축)
  for (const entry of chokes) {
    const t = chokeTargetFromRank(entry);
    if (!t) continue;
    if (seen.has(t.entityId)) continue;
    seen.add(t.entityId);
    out.push(t);
    if (out.length >= Math.min(5, limit)) break;
  }

  // 랭킹이 비면 정적 초크 폴백 (그래도 전장은 넣지 않음)
  if (out.length === 0) {
    const fallbackIds = [
      "choke-hormuz",
      "choke-malacca",
      "choke-suez",
      "choke-bab-el-mandeb",
      "choke-panama",
    ];
    fallbackIds.forEach((id, index) => {
      const fly = ENTITY_FLY[id];
      const labels = CHOKE_LABELS[id];
      if (!fly || !labels) return;
      out.push({
        entityId: id,
        kind: "chokepoint",
        labelKo: labels.ko,
        labelEn: labels.en,
        lat: fly.lat,
        lng: fly.lng,
        altitude: fly.altitude,
        rank: index + 1,
      });
      seen.add(id);
    });
  }

  // 2) 나머지 슬롯 — 지경학 중심지 풀을 날짜·랭킹 시드로 셔플
  const hubs = flattenEconHubs().filter((hub) => {
    const mapped = ECON_TO_CHOKE[hub.id];
    if (mapped && seen.has(mapped)) return false;
    if (seen.has(hub.id)) return false;
    return true;
  });

  const scoreHint = chokes.map((c) => `${c.entityId}:${c.rank}`).join("|");
  const seed = hashSeed(`econ-sentinel|${dateKey}|${scoreHint}`);
  const shuffled = seededShuffle(hubs, seed);

  let hubRank = out.length + 1;
  for (const hub of shuffled) {
    if (out.length >= limit) break;
    seen.add(hub.id);
    out.push({
      entityId: hub.id,
      kind: "econ-hub",
      labelKo: hub.labelKo,
      labelEn: hub.labelEn,
      lat: hub.lat,
      lng: hub.lng,
      altitude: hub.altitude,
      rank: hubRank,
    });
    hubRank += 1;
  }

  // 시작 오프셋도 날짜에 따라 돌려 첫 스팟이 고정되지 않게
  if (out.length > 1) {
    const rot = hashSeed(`econ-rot|${dateKey}`) % out.length;
    return out.slice(rot).concat(out.slice(0, rot));
  }
  return out;
}

/** @deprecated buildConflictSentinelTour 사용 */
export function buildSentinelTour(payload: DailyRanksPayload, limit = 8): SentinelFlyTarget[] {
  return buildConflictSentinelTour(payload, limit);
}

export async function fetchSentinelTour(
  mode: SentinelViewerMode = "conflict",
): Promise<SentinelFlyTarget[]> {
  try {
    const res = await fetch("/api/daily-ranks?limit=8", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = res.ok
      ? ((await res.json()) as DailyRanksPayload)
      : ({
          date: "",
          fetchedAt: "",
          source: "empty",
          theater: [],
          chokepoint: [],
        } satisfies DailyRanksPayload);

    if (mode === "economy") {
      return buildEconomySentinelTour(data, { limit: 8 });
    }
    return buildConflictSentinelTour(data, 8);
  } catch {
    if (mode === "economy") {
      return buildEconomySentinelTour(
        {
          date: "",
          fetchedAt: "",
          source: "empty",
          theater: [],
          chokepoint: [],
        },
        { limit: 8 },
      );
    }
    return [];
  }
}
