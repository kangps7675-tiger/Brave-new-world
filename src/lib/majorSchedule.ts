import {
  MAJOR_SCHEDULES,
  type MajorSchedule,
} from "@/data/majorSchedules";

export type SchedulePhase = "upcoming" | "awaiting-result" | "result";

/** 11월 첫 월요일 다음 화요일. 미국 법전 2편 7조·3편 1조의 선거일이다. */
export function usElectionTuesday(year: number): string {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const dow = nov1.getUTCDay();
  const firstMonday = dow <= 1 ? 1 + ((1 - dow + 7) % 7) : 1 + (8 - dow);
  const day = firstMonday + 1;
  return `${year}-11-${String(day).padStart(2, "0")}`;
}

/** 서울 달력의 날짜. 일정 비교는 이 날짜로 한다. */
export function seoulCalendarDate(now: number): string {
  return new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
}

function lastDay(row: MajorSchedule): string {
  return row.end ?? row.start;
}

export function schedulePhase(row: MajorSchedule, now: number): SchedulePhase {
  if (row.precision === "unfixed") return "upcoming";
  if (row.outcomeUrl && (row.outcomeKo || row.outcomeEn)) return "result";
  const today = seoulCalendarDate(now);
  if (today > lastDay(row)) return "awaiting-result";
  return "upcoming";
}

/**
 * 지난 일정은 목록에서 빠진다.
 * retainPast 는 새 날짜로 고치기 전까지 지난 뒤에도 남긴다.
 */
export function orderedSchedules(now: number, rows: readonly MajorSchedule[] = MAJOR_SCHEDULES): MajorSchedule[] {
  return rows
    .filter((row) => schedulePhase(row, now) === "upcoming" || row.retainPast)
    .sort((a, b) => {
      const aPast = schedulePhase(a, now) !== "upcoming";
      const bPast = schedulePhase(b, now) !== "upcoming";
      if (aPast !== bPast) return aPast ? 1 : -1;
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
    });
}

export function nextSchedule(now: number, rows: readonly MajorSchedule[] = MAJOR_SCHEDULES): MajorSchedule | null {
  return orderedSchedules(now, rows).find((row) => schedulePhase(row, now) === "upcoming") ?? null;
}
