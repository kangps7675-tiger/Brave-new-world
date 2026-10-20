import type { NewfeedsAttackPoint } from "@/lib/newfeeds";

/** 이란 NewFeeds — 이 시간 안 major/high 공격만 ‘진행 중 공습’으로 취급 */
export const AIR_RAID_IRAN_FRESH_MS = 45 * 60 * 1000;

function isElevatedIranSeverity(severity: string | undefined): boolean {
  const sev = String(severity ?? "").toLowerCase();
  return sev === "major" || sev === "high" || sev === "critical";
}

/** 이란 공습 ‘활성’ 판정 — 최근 발표된 고심각도 공격 */
export function isFreshIranAirRaidAttack(
  attack: NewfeedsAttackPoint,
  now = Date.now(),
): boolean {
  if (!isElevatedIranSeverity(attack.severity)) return false;
  if (!attack.publishedAt) return false;
  const t = Date.parse(attack.publishedAt);
  if (!Number.isFinite(t)) return false;
  return now - t <= AIR_RAID_IRAN_FRESH_MS;
}

export function isIranAirRaidActive(
  attacks: readonly NewfeedsAttackPoint[],
  now = Date.now(),
): boolean {
  return attacks.some((a) => isFreshIranAirRaidAttack(a, now));
}
