/**
 * 오늘의 브리핑 진행도 (P3-7 Goal-Gradient).
 * sessionStorage — 탭 세션 동안 유지.
 */

export const BRIEFING_STEP_IDS = [
  "gti",
  "predict",
  "layer",
  "intel",
  "share",
] as const;

export type BriefingStepId = (typeof BRIEFING_STEP_IDS)[number];

const STORAGE_KEY = "geowatch-daily-briefing-progress-v1";
const DATE_KEY = "geowatch-daily-briefing-date-v1";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureToday(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const d = sessionStorage.getItem(DATE_KEY);
    const now = todayUtc();
    if (d !== now) {
      sessionStorage.setItem(DATE_KEY, now);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    }
  } catch {
    /* ignore */
  }
}

function readDone(): Partial<Record<BriefingStepId, boolean>> {
  if (typeof sessionStorage === "undefined") return {};
  ensureToday();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<BriefingStepId, boolean>>;
  } catch {
    return {};
  }
}

function writeDone(map: Partial<Record<BriefingStepId, boolean>>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    sessionStorage.setItem(DATE_KEY, todayUtc());
  } catch {
    /* ignore */
  }
}

export function markBriefingStep(step: BriefingStepId): void {
  const map = readDone();
  if (map[step]) return;
  map[step] = true;
  writeDone(map);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("geowatch-briefing-progress", { detail: { step } }),
      );
    } catch {
      /* ignore */
    }
  }
}

export function getBriefingProgress(): {
  done: number;
  total: number;
  steps: Record<BriefingStepId, boolean>;
} {
  const map = readDone();
  const steps = Object.fromEntries(
    BRIEFING_STEP_IDS.map((id) => [id, Boolean(map[id])]),
  ) as Record<BriefingStepId, boolean>;
  const done = BRIEFING_STEP_IDS.filter((id) => steps[id]).length;
  return { done, total: BRIEFING_STEP_IDS.length, steps };
}

export const BRIEFING_STEP_LABELS: Record<
  BriefingStepId,
  { ko: string; en: string }
> = {
  gti: { ko: "GTS 확인", en: "Check GTS" },
  predict: { ko: "GTS 감각 연습", en: "GTS intuition" },
  layer: { ko: "레이어 조정", en: "Tweak layers" },
  intel: { ko: "인텔 열기", en: "Open intel" },
  share: { ko: "카드 공유", en: "Share card" },
};
