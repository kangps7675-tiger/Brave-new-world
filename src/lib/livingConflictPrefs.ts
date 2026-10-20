/**
 * 진행형 분쟁 팔로우 — 기기 로컬.
 */

export const LIVING_CONFLICT_PREFS_KEY = "geowatch-living-conflicts-v1";

export type LivingConflictPrefs = {
  followedConflictIds: string[];
};

const DEFAULT: LivingConflictPrefs = {
  followedConflictIds: [],
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLivingConflictPrefs(): LivingConflictPrefs {
  if (!canUseStorage()) return { ...DEFAULT, followedConflictIds: [] };
  try {
    const raw = window.localStorage.getItem(LIVING_CONFLICT_PREFS_KEY);
    if (!raw) return { ...DEFAULT, followedConflictIds: [] };
    const parsed = JSON.parse(raw) as Partial<LivingConflictPrefs>;
    const ids = Array.isArray(parsed.followedConflictIds)
      ? parsed.followedConflictIds.filter((id): id is string => typeof id === "string")
      : [];
    return { followedConflictIds: [...new Set(ids)] };
  } catch {
    return { ...DEFAULT, followedConflictIds: [] };
  }
}

export function writeLivingConflictPrefs(prefs: LivingConflictPrefs): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    LIVING_CONFLICT_PREFS_KEY,
    JSON.stringify({
      followedConflictIds: [...new Set(prefs.followedConflictIds)],
    }),
  );
}

export function isFollowingLivingConflict(conflictId: string): boolean {
  return readLivingConflictPrefs().followedConflictIds.includes(conflictId);
}

export function toggleFollowLivingConflict(conflictId: string): LivingConflictPrefs {
  const prefs = readLivingConflictPrefs();
  const has = prefs.followedConflictIds.includes(conflictId);
  const next: LivingConflictPrefs = {
    followedConflictIds: has
      ? prefs.followedConflictIds.filter((id) => id !== conflictId)
      : [...prefs.followedConflictIds, conflictId],
  };
  writeLivingConflictPrefs(next);
  return next;
}
