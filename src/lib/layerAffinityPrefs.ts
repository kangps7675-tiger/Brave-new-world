/**
 * 레이어 출석 친화도 — 켠 채로 접속한「서로 다른 날짜」를 누적하고,
 * 마일스톤(1·3·5·…·21)에 도달하면 이후 로드 시 자동 체크(ON).
 *
 * 같은 날 여러 번 열어도 레이어당 하루 1회만 카운트.
 * 자동 ON은「저장값이 OFF여도」unlock된 레이어에 적용.
 * 출석 카운트는 unlock 적용 전(유저가 실제로 켜 둔 상태)만 반영.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";

export const LAYER_AFFINITY_KEY = "geowatch-layer-affinity-v1";

/** 출석 마일스톤 — 첫 unlock=1일, 이후 홀수일 계단, 상한 21 */
export const AFFINITY_MILESTONES = [
  1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21,
] as const;

export type LayerAffinityEntry = {
  /** 켠 채로 접속한 서로 다른 날짜 수 (최대 21) */
  dayCount: number;
  /** 마지막으로 카운트한 로컬 날짜 YYYY-MM-DD */
  lastDay: string | null;
  /** 마일스톤 도달 후 자동 체크 대상 */
  unlocked: boolean;
  /** 도달한 최고 마일스톤 (없으면 0) */
  tier: number;
};

export type LayerAffinityState = {
  version: 1;
  layers: Partial<Record<string, LayerAffinityEntry>>;
};

const MAX_DAYS = AFFINITY_MILESTONES[AFFINITY_MILESTONES.length - 1]!;

function isLayerToggleKey(key: string, prefs: LayerPrefs): boolean {
  if (!key.startsWith("show")) return false;
  return typeof prefs[key as keyof LayerPrefs] === "boolean";
}

function layerToggleKeys(prefs: LayerPrefs): string[] {
  return (Object.keys(prefs) as string[]).filter((key) => isLayerToggleKey(key, prefs));
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** 로컬 캘린더 날짜 — 출석은 유저 시간대 기준 */
export function localAffinityDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function highestAffinityTier(dayCount: number): number {
  let tier = 0;
  for (const milestone of AFFINITY_MILESTONES) {
    if (dayCount >= milestone) tier = milestone;
    else break;
  }
  return tier;
}

export function isAffinityUnlocked(dayCount: number): boolean {
  return dayCount >= AFFINITY_MILESTONES[0]!;
}

function emptyEntry(): LayerAffinityEntry {
  return { dayCount: 0, lastDay: null, unlocked: false, tier: 0 };
}

function normalizeEntry(raw: unknown): LayerAffinityEntry {
  if (!raw || typeof raw !== "object") return emptyEntry();
  const o = raw as Partial<LayerAffinityEntry>;
  const dayCount = Math.max(
    0,
    Math.min(MAX_DAYS, Math.floor(Number(o.dayCount) || 0)),
  );
  const lastDay =
    typeof o.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.lastDay)
      ? o.lastDay
      : null;
  const tier = highestAffinityTier(dayCount);
  return {
    dayCount,
    lastDay,
    unlocked: Boolean(o.unlocked) || isAffinityUnlocked(dayCount),
    tier,
  };
}

export function readLayerAffinityState(): LayerAffinityState {
  if (!canUseStorage()) return { version: 1, layers: {} };
  try {
    const raw = window.localStorage.getItem(LAYER_AFFINITY_KEY);
    if (!raw) return { version: 1, layers: {} };
    const parsed = JSON.parse(raw) as Partial<LayerAffinityState>;
    const layers: LayerAffinityState["layers"] = {};
    if (parsed.layers && typeof parsed.layers === "object") {
      for (const [key, value] of Object.entries(parsed.layers)) {
        if (!key.startsWith("show")) continue;
        layers[key] = normalizeEntry(value);
      }
    }
    return { version: 1, layers };
  } catch {
    return { version: 1, layers: {} };
  }
}

export function writeLayerAffinityState(state: LayerAffinityState): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      LAYER_AFFINITY_KEY,
      JSON.stringify({ version: 1, layers: state.layers }),
    );
  } catch {
    // quota / private mode
  }
}

/**
 * ON인 레이어에 대해 오늘 출석 1회 반영.
 * 이미 오늘 카운트했으면 스킵. unlock·tier 갱신.
 */
export function noteLayerAffinityAttendance(
  prefs: LayerPrefs,
  today: string = localAffinityDateKey(),
): LayerAffinityState {
  const state = readLayerAffinityState();
  let changed = false;

  for (const key of layerToggleKeys(prefs)) {
    if (!prefs[key as keyof LayerPrefs]) continue;
    const prev = state.layers[key] ?? emptyEntry();
    if (prev.lastDay === today) continue;

    const dayCount = Math.min(MAX_DAYS, prev.dayCount + 1);
    const tier = highestAffinityTier(dayCount);
    const unlocked = isAffinityUnlocked(dayCount);
    state.layers[key] = {
      dayCount,
      lastDay: today,
      unlocked: prev.unlocked || unlocked,
      tier,
    };
    changed = true;
  }

  if (changed) writeLayerAffinityState(state);
  return state;
}

/** unlock된 레이어를 ON으로 강제 (저장값이 OFF여도) */
export function applyUnlockedLayerDefaults(prefs: LayerPrefs): LayerPrefs {
  const state = readLayerAffinityState();
  let next: LayerPrefs | null = null;

  for (const key of layerToggleKeys(prefs)) {
    const entry = state.layers[key];
    if (!entry?.unlocked) continue;
    if (prefs[key as keyof LayerPrefs]) continue;
    if (!next) next = { ...prefs };
    (next as Record<string, unknown>)[key] = true;
  }

  return next ?? prefs;
}

/**
 * loadLayerPrefs 훅:
 * 1) 저장된 ON 기준으로 오늘 출석 기록
 * 2) unlock 레이어 자동 체크
 */
export function finalizeLayerPrefsWithAffinity(prefs: LayerPrefs): LayerPrefs {
  if (!canUseStorage()) return prefs;
  noteLayerAffinityAttendance(prefs);
  return applyUnlockedLayerDefaults(prefs);
}
