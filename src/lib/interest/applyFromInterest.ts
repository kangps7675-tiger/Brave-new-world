/**
 * 관심 프로필 → 지도·뉴스 soft 적용.
 * 고정 프리셋 픽커 없음 — 행동 스코어만으로 가중·레이어 ON(끄기는 안 함).
 */

import { conceptLayersForConflict } from "@/lib/conceptLayers";
import { deriveInterestProfile } from "@/lib/interest/deriveInterestProfile";
import { getInterestStore } from "@/lib/interest/interestStore";
import type { InterestProfile } from "@/lib/interest/interestTypes";
import type { LayerPrefs } from "@/lib/layerPrefs";
import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { ViewTheaterChoice } from "@/lib/viewPackages";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export type InterestLayerPatch = Partial<Record<BooleanLayerKey, boolean>>;

/** 테마 id → 켤 레이어 (추천 칩과 동일 맵) */
export const INTEREST_THEME_LAYERS: Record<
  string,
  { layerKey: BooleanLayerKey; economyOk: boolean }
> = {
  ais: { layerKey: "showAis", economyOk: true },
  carriers: { layerKey: "showUsCarriers", economyOk: false },
  firms: { layerKey: "showFirmsFires", economyOk: true },
  military: { layerKey: "showMilitaryActivity", economyOk: false },
  airTraffic: { layerKey: "showAirTraffic", economyOk: true },
};

const CONFLICT_THEATERS = new Set<string>([
  "russia-ukraine",
  "korea",
  "japan",
  "china-taiwan",
  "middle-east",
  "global",
]);

export const INTEREST_SOFT_APPLY_KEY = "geowatch-interest-soft-apply-v1";

/** 신호 너무 적으면 soft 레이어 적용 안 함 (뉴스 가중은 약하게라도 가능) */
export const INTEREST_APPLY_MIN_EVENTS = 3;
export const INTEREST_APPLY_MIN_SCORE = 1.2;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localDayKeyFixed(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function interestSoftApplyConsumedToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(INTEREST_SOFT_APPLY_KEY) === localDayKeyFixed();
  } catch {
    return false;
  }
}

export function markInterestSoftApplyToday(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTEREST_SOFT_APPLY_KEY, localDayKeyFixed());
  } catch {
    /* quota */
  }
}

/** theater id → 감쇠 스코어 */
export function interestTheaterScores(
  profile: InterestProfile,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of profile.topTheaters) {
    out[b.id] = (out[b.id] ?? 0) + b.score;
  }
  return out;
}

export function loadInterestTheaterScores(): Record<string, number> {
  return interestTheaterScores(deriveInterestProfile(getInterestStore().load()));
}

/**
 * 뉴스 정렬: 관심 전장 가점 → (경제면 경제 피드 우선) → 최신순.
 * 필터를 바꾸지 않고 「전체」안에서도 내 전장이 위로 오게.
 */
export function sortNewsByInterest(
  items: NewsStreamItem[],
  theaterScores: Record<string, number>,
  preferEconomy: boolean,
): NewsStreamItem[] {
  const hasInterest = Object.keys(theaterScores).length > 0;
  return [...items].sort((a, b) => {
    if (hasInterest) {
      const ia = theaterScores[a.theater] ?? 0;
      const ib = theaterScores[b.theater] ?? 0;
      if (Math.abs(ia - ib) > 0.05) return ib - ia;
    }
    if (preferEconomy) {
      const ae = a.feedTopic === "economy" ? 0 : 1;
      const be = b.feedTopic === "economy" ? 0 : 1;
      if (ae !== be) return ae - be;
    }
    return Date.parse(b.pubDate || "0") - Date.parse(a.pubDate || "0");
  });
}

function onlyEnable(patch: InterestLayerPatch): InterestLayerPatch {
  const out: InterestLayerPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === true) out[key as BooleanLayerKey] = true;
  }
  return out;
}

function isConflictTheater(id: string): id is Exclude<ViewTheaterChoice, "auto" | "all"> {
  return CONFLICT_THEATERS.has(id);
}

/**
 * 레이어 soft 패치 — true만. 유저가 끈 레이어를 강제로 끄거나 전장을 덮지 않음.
 * 상위 테마 1~2개 + (스코어 충분하면) 1위 전장 concept enable-only.
 */
export function suggestLayerPatchFromInterest(
  profile: InterestProfile,
  mode: "conflict" | "economy",
): InterestLayerPatch | null {
  if (
    profile.eventCount < INTEREST_APPLY_MIN_EVENTS &&
    (profile.buckets[0]?.score ?? 0) < INTEREST_APPLY_MIN_SCORE
  ) {
    return null;
  }

  const patch: InterestLayerPatch = {};

  for (const theme of profile.topThemes.slice(0, 2)) {
    if (theme.score < 0.8) continue;
    const meta = INTEREST_THEME_LAYERS[theme.id];
    if (!meta) continue;
    if (mode === "economy" && !meta.economyOk) continue;
    patch[meta.layerKey] = true;
  }

  if (mode === "conflict") {
    const top = profile.topTheaters[0];
    if (top && top.score >= INTEREST_APPLY_MIN_SCORE && isConflictTheater(top.id)) {
      Object.assign(patch, onlyEnable(conceptLayersForConflict(top.id)));
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function resolveInterestSoftApply(
  mode: "conflict" | "economy",
): { patch: InterestLayerPatch; topTheater: NewsTheater | null } | null {
  if (interestSoftApplyConsumedToday()) return null;
  const profile = deriveInterestProfile(getInterestStore().load());
  const patch = suggestLayerPatchFromInterest(profile, mode);
  if (!patch) return null;
  const top = profile.topTheaters[0];
  const topTheater =
    top && CONFLICT_THEATERS.has(top.id) && top.id !== "global"
      ? (top.id as NewsTheater)
      : null;
  return { patch, topTheater };
}

/** 테스트용 — day key 노출 */
export function __interestLocalDayKeyForTest(): string {
  return localDayKeyFixed();
}
