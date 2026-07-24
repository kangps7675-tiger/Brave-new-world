import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyPrompts } from "@/db/schema";
import { ingestWorkerBase } from "@/lib/d1LiveSnapshots";
import { nextUtcRankDate } from "@/lib/dailyRanks";

export type DailyPrompt = {
  targetDate: string;
  subjectKind: string;
  subjectId: string;
  labelKo: string;
  labelEn: string;
  baselineScore: number;
  questionKo: string;
  questionEn: string;
  createdAt: string;
};

export async function loadDailyPrompt(options: {
  targetDate?: string;
} = {}): Promise<DailyPrompt | null> {
  const targetDate = options.targetDate || nextUtcRankDate();
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(dailyPrompts)
      .where(eq(dailyPrompts.targetDate, targetDate))
      .limit(1);
    const row = rows[0];
    if (row) {
      return {
        targetDate: row.targetDate,
        subjectKind: row.subjectKind,
        subjectId: row.subjectId,
        labelKo: row.labelKo,
        labelEn: row.labelEn,
        baselineScore: Number(row.baselineScore) || 0,
        questionKo: row.questionKo,
        questionEn: row.questionEn,
        createdAt: row.createdAt,
      };
    }
  } catch {
    /* fall through */
  }

  const base = ingestWorkerBase();
  if (!base) return null;
  try {
    const qs = new URLSearchParams({ date: targetDate });
    const res = await fetch(`${base}/daily-prompt?${qs}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { prompt?: DailyPrompt | null };
    return body.prompt ?? null;
  } catch {
    return null;
  }
}

/** 로컬 캘린더 기준 하루 1회 모달 seen */
export function tensionPromptSeenKey(dayKey: string): string {
  return `cv-tomorrow-tension-seen-${dayKey}`;
}

export function hasSeenTensionPrompt(dayKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(tensionPromptSeenKey(dayKey)) === "1";
  } catch {
    return false;
  }
}

export function markTensionPromptSeen(dayKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(tensionPromptSeenKey(dayKey), "1");
  } catch {
    /* ignore */
  }
}
