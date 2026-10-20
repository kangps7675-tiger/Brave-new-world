/**
 * 애널리스트 인가(클리어런스) — 적중률과 별도로 출석이 끊기면 배지만 강등.
 * hits/attempts는 유지한다.
 */

import {
  analystTierFromStats,
  analystTierLabel,
  type AnalystTierId,
} from "@/lib/gti";
import type { DailyPredictPrefs } from "@/lib/dailyPredictPrefs";

const TIER_RANK: Record<AnalystTierId, number> = {
  rookie: 0,
  analyst: 1,
  senior: 2,
  chief: 3,
};

const TIER_BY_RANK: AnalystTierId[] = ["rookie", "analyst", "senior", "chief"];

export type ClearanceKind = "ok" | "threat" | "demoted";

export type ClearanceStatus = {
  meritTier: AnalystTierId;
  peakTier: AnalystTierId;
  effectiveTier: AnalystTierId;
  demotionSteps: number;
  daysAbsent: number;
  kind: ClearanceKind;
  /** demoted 일 때 직전(피크) 배지 */
  previousTier: AnalystTierId | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 로컬 캘린더 YYYY-MM-DD — 인가 출석 기준 */
export function localClearanceDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d);
}

export function calendarDaysBetween(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function maxTier(a: AnalystTierId, b: AnalystTierId): AnalystTierId {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

export function demoteTier(tier: AnalystTierId, steps: number): AnalystTierId {
  const next = Math.max(0, TIER_RANK[tier] - Math.max(0, steps));
  return TIER_BY_RANK[next] ?? "rookie";
}

export function promoteTier(tier: AnalystTierId, steps: number): AnalystTierId {
  const next = Math.min(TIER_BY_RANK.length - 1, TIER_RANK[tier] + Math.max(0, steps));
  return TIER_BY_RANK[next] ?? "chief";
}

/**
 * 1일 결석 = 경고만(0단)
 * 2–3일 = 1단 / 4–5일 = 2단 / 6일+ = 3단
 */
export function demotionStepsForAbsence(daysAbsent: number): number {
  if (daysAbsent <= 1) return 0;
  if (daysAbsent <= 3) return 1;
  if (daysAbsent <= 5) return 2;
  return 3;
}

export function meritTierFromPrefs(prefs: DailyPredictPrefs): AnalystTierId {
  return analystTierFromStats({
    hits: prefs.hits,
    attempts: prefs.attempts,
    streak: prefs.streak,
  });
}

export function resolveClearanceStatus(
  prefs: DailyPredictPrefs,
  today: string = localClearanceDay(),
): ClearanceStatus {
  const meritTier = meritTierFromPrefs(prefs);
  const peakTier = maxTier(prefs.peakTier ?? meritTier, meritTier);
  const last = prefs.lastActiveDate;

  if (!last) {
    return {
      meritTier,
      peakTier,
      effectiveTier: peakTier,
      demotionSteps: 0,
      daysAbsent: 0,
      kind: "ok",
      previousTier: null,
    };
  }

  const daysAbsent = calendarDaysBetween(last, today);
  const autoSteps = demotionStepsForAbsence(daysAbsent);
  const demotionSteps = Math.max(prefs.demotionSteps ?? 0, autoSteps);
  const effectiveTier = demoteTier(peakTier, demotionSteps);

  let kind: ClearanceKind = "ok";
  if (demotionSteps > 0 && TIER_RANK[effectiveTier] < TIER_RANK[peakTier]) {
    kind = "demoted";
  } else if (daysAbsent >= 1 && demotionSteps === 0 && TIER_RANK[peakTier] > 0) {
    kind = "threat";
  }

  return {
    meritTier,
    peakTier,
    effectiveTier,
    demotionSteps,
    daysAbsent,
    kind,
    previousTier: kind === "demoted" ? peakTier : null,
  };
}

/** 결석으로 늘어난 강등 단수를 prefs에 반영 (읽기 시 동기화) */
export function syncClearancePrefs(
  prefs: DailyPredictPrefs,
  today: string = localClearanceDay(),
): DailyPredictPrefs {
  const status = resolveClearanceStatus(prefs, today);
  const nextPeak = status.peakTier;
  const nextSteps = status.demotionSteps;
  if (
    prefs.peakTier === nextPeak &&
    (prefs.demotionSteps ?? 0) === nextSteps
  ) {
    return prefs;
  }
  return {
    ...prefs,
    peakTier: nextPeak,
    demotionSteps: nextSteps,
  };
}

/**
 * 픽 제출·등불 열람 등 활성 표시.
 * 강등 중이면 1단 회복, 연속 3일 활성이면 피크까지 복구.
 */
export function applyAnalystActivity(
  prefs: DailyPredictPrefs,
  today: string = localClearanceDay(),
): DailyPredictPrefs {
  const synced = syncClearancePrefs(prefs, today);
  const merit = meritTierFromPrefs(synced);
  const peakTier = maxTier(synced.peakTier ?? merit, merit);

  let demotionSteps = synced.demotionSteps ?? 0;
  let restoreStreak = synced.restoreActiveStreak ?? 0;
  const last = synced.lastActiveDate;

  if (last === today) {
    // 같은 날 재활성 — 스트릭·강등은 유지, 피크만 갱신
    return { ...synced, peakTier, lastActiveDate: today };
  }

  if (last && calendarDaysBetween(last, today) === 1) {
    restoreStreak += 1;
  } else {
    restoreStreak = 1;
  }

  if (demotionSteps > 0) {
    demotionSteps -= 1;
  }
  if (restoreStreak >= 3) {
    demotionSteps = 0;
  }

  return {
    ...synced,
    peakTier,
    demotionSteps,
    restoreActiveStreak: restoreStreak,
    lastActiveDate: today,
  };
}

export function clearanceThreatCopy(
  status: ClearanceStatus,
  ko: boolean,
): { title: string; subtitle: string; cta: string } {
  const eff = analystTierLabel(status.effectiveTier, ko);
  const peak = analystTierLabel(status.peakTier, ko);
  const nextDown = demoteTier(status.peakTier, 1);
  const nextLabel = analystTierLabel(nextDown, ko);

  if (status.kind === "demoted") {
    return ko
      ? {
          title: `인가가 내려갔습니다 · ${eff}`,
          subtitle: `직전 등급은 ${peak}. 오늘 픽을 내면 한 단계 올라갑니다.`,
          cta: "인가 다시 올리기",
        }
      : {
          title: `Clearance demoted · ${eff}`,
          subtitle: `Was: ${peak}. Submit tomorrow’s tension pick to restore clearance.`,
          cta: "Restore clearance",
        };
  }

  return ko
    ? {
        title: `인가가 곧 내려갑니다 · ${eff}`,
        subtitle: `오늘 픽을 안 하면 ${nextLabel}로 내려갑니다.`,
        cta: "오늘 픽하기",
      }
    : {
        title: `Clearance at risk · ${eff}`,
        subtitle: `Skip tomorrow’s tension pick and you drop to ${nextLabel}.`,
        cta: "Make today’s pick",
      };
}

const CHIP_SEEN_PREFIX = "cv-clearance-threat-seen-";

export function clearanceChipSeenKey(dayKey: string): string {
  return `${CHIP_SEEN_PREFIX}${dayKey}`;
}

export function hasSeenClearanceChip(dayKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(clearanceChipSeenKey(dayKey)) === "1";
  } catch {
    return true;
  }
}

export function markClearanceChipSeen(dayKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clearanceChipSeenKey(dayKey), "1");
  } catch {
    /* ignore */
  }
}
