import type { ConflictEvent, EventTier, GreatPowerScope } from "@/data/geoTypes";

/**
 * GDELT 지정학 뉴스 중요도 등급 (S > A > B > C).
 *
 * 지정변수(고정 축):
 * - isGeopolitics: scoreEvents를 통과한 이벤트만 (= 지정학 뉴스)
 * - tier: war | diplomatic | alliance | protest
 * - scope: rivalry | intervention | null
 * - fresh: 24h 이내 속보
 * - highTension: tensionScore ≥ 70 또는 severity ≥ 4
 * - destructiveWar: CAMEO 파괴적 전투
 *
 * 가능한 조합 → 등급 (상위부터 매칭):
 *
 * | # | 조건 요약 | 등급 |
 * |---|---|---|
 * | 1 | war ∧ (rivalry ∨ destructive) ∧ fresh | S |
 * | 2 | war ∧ rivalry | S |
 * | 3 | diplomatic ∧ rivalry ∧ fresh | S |
 * | 4 | war ∧ (fresh ∨ (intervention ∧ highTension) ∨ destructive) | A |
 * | 5 | diplomatic ∧ (rivalry ∨ (fresh ∧ highTension)) | A |
 * | 6 | alliance ∧ fresh ∧ highTension | A |
 * | 7 | war ∨ diplomatic ∨ alliance | B |
 * | 8 | protest (또는 그 외) | C |
 *
 * 지도·패널 「강조 표기」: S·A만 (MARKED_IMPORTANCE_GRADES).
 */
export type GdeltImportanceGrade = "S" | "A" | "B" | "C";

/** 강조 표기 대상 — 맨 위 두 단계 */
export const MARKED_IMPORTANCE_GRADES: readonly GdeltImportanceGrade[] = ["S", "A"];

export const IMPORTANCE_LABELS: Record<
  GdeltImportanceGrade,
  { ko: string; en: string; shortKo: string }
> = {
  S: { ko: "S급 속보", en: "S-flash", shortKo: "S급" },
  A: { ko: "A급 중요", en: "A-priority", shortKo: "A급" },
  B: { ko: "일반 지정학", en: "Standard", shortKo: "B" },
  C: { ko: "참고", en: "Background", shortKo: "C" },
};

export type GdeltImportanceInput = {
  eventTier: EventTier;
  greatPowerScope: GreatPowerScope | null;
  tensionScore: number;
  severity: number;
  createdAt?: string | null;
  eventDate?: string | null;
  category?: ConflictEvent["category"] | string | null;
  goldsteinScale?: number | null;
};

const FRESH_HOURS = 24;

function isFreshLocal(event: GdeltImportanceInput, now: number): boolean {
  const created = event.createdAt ? Date.parse(event.createdAt) : Number.NaN;
  if (Number.isFinite(created)) {
    return now - created <= FRESH_HOURS * 60 * 60 * 1000;
  }
  if (event.eventDate) {
    const dayStart = Date.parse(`${event.eventDate}T00:00:00Z`);
    if (Number.isFinite(dayStart)) {
      return now - dayStart <= FRESH_HOURS * 60 * 60 * 1000;
    }
  }
  return false;
}

function isHighTension(event: GdeltImportanceInput): boolean {
  return event.tensionScore >= 70 || event.severity >= 4;
}

function isDestructiveLocal(event: GdeltImportanceInput): boolean {
  const gs = event.goldsteinScale ?? 0;
  if (event.category === "Battles") return gs <= -4;
  if (event.category === "Violence against civilians") return gs <= -7;
  return false;
}

/** 지정학 뉴스 중요도 등급 산정 */
export function classifyGdeltImportance(
  event: GdeltImportanceInput,
  now = Date.now(),
): GdeltImportanceGrade {
  const tier = event.eventTier;
  const scope = event.greatPowerScope;
  const fresh = isFreshLocal(event, now);
  const highTension = isHighTension(event);
  const destructive = isDestructiveLocal(event);

  // —— S ——
  if (tier === "war" && (scope === "rivalry" || destructive) && fresh) return "S";
  if (tier === "war" && scope === "rivalry") return "S";
  if (tier === "diplomatic" && scope === "rivalry" && fresh) return "S";

  // —— A ——
  if (
    tier === "war" &&
    (fresh || (scope === "intervention" && highTension) || destructive)
  ) {
    return "A";
  }
  if (tier === "diplomatic" && (scope === "rivalry" || (fresh && highTension))) {
    return "A";
  }
  if (tier === "alliance" && fresh && highTension) return "A";

  // —— B / C ——
  if (tier === "war" || tier === "diplomatic" || tier === "alliance") return "B";
  return "C";
}

export function isMarkedGdeltImportance(grade: GdeltImportanceGrade): boolean {
  return MARKED_IMPORTANCE_GRADES.includes(grade);
}

export function gdeltImportanceLabel(
  grade: GdeltImportanceGrade,
  lang: "ko" | "en" = "ko",
): string {
  const entry = IMPORTANCE_LABELS[grade];
  return lang === "en" ? entry.en : entry.ko;
}

export function gdeltImportanceShortLabel(grade: GdeltImportanceGrade): string {
  return IMPORTANCE_LABELS[grade].shortKo;
}

/** 정렬·우선순위 — S/A 가중 */
export function gdeltImportanceRankWeight(grade: GdeltImportanceGrade): number {
  switch (grade) {
    case "S":
      return 4_000_000_000;
    case "A":
      return 2_000_000_000;
    case "B":
      return 500_000_000;
    default:
      return 0;
  }
}
