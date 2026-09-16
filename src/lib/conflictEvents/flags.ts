/**
 * Phase 3 — `conflict-events` 가 기존 좌표 네온 4계통을 대체할지.
 *
 * 4계통: newfeeds-iran · korea-missile(nk) · china-theater(dyad들) · ukraine-strikes-russia
 *
 * 병행 비교 종료 후 기본값은 대체 ON.
 * 되돌리려면 `NEXT_PUBLIC_CONFLICT_EVENTS_REPLACE_LEGACY=0`.
 */
import type { LayerPrefs } from "@/lib/layerPrefs";

export function conflictEventsReplaceLegacy(): boolean {
  return process.env.NEXT_PUBLIC_CONFLICT_EVENTS_REPLACE_LEGACY !== "0";
}

/** 패널에서 숨길 레거시 토글 id */
export const LEGACY_CONFLICT_LAYER_IDS = [
  "newfeeds-iran",
  "nk-missile-tests",
  "korea-missile-incidents",
  "china-theater-incidents",
  "china-taiwan-incidents",
  "china-japan-incidents",
  "china-philippines-incidents",
  "us-china-incidents",
  "ukraine-strikes-russia",
  "east-asia-neon",
] as const;

/** prefs에서 강제 OFF — 캡 슬롯·로컬 저장본 잔존 방지 */
export const LEGACY_CONFLICT_PREF_KEYS = [
  "showNewfeedsIranAttacks",
  "showNorthKoreaMissileTests",
  "showUkraineStrikesOnRussia",
  "showChinaTaiwanIncidents",
  "showChinaJapanIncidents",
  "showChinaPhilippinesIncidents",
  "showUsChinaIncidents",
] as const satisfies ReadonlyArray<keyof LayerPrefs>;

export function stripLegacyConflictPrefs(prefs: LayerPrefs): LayerPrefs {
  if (!conflictEventsReplaceLegacy()) return prefs;
  const next = { ...prefs };
  for (const key of LEGACY_CONFLICT_PREF_KEYS) {
    next[key] = false;
  }
  return next;
}
