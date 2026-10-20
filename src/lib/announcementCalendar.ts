/**
 * 공개 발표 캘린더 — FOMC(Fed) · OPEC+ 회의일.
 * 매크로 지표(기존 macroTable)가 "무슨 일이 있었나"라면, 이건 "다음에 뭐가 터지나".
 *
 * 출처: federalreserve.gov/monetarypolicy/fomccalendars.htm,
 *       OPEC 공식 발표(opec.org) · 로이터/공개 보도 기준 확인된 날짜만 수록.
 * 유지보수: 연 1회 정도 다음 해 일정으로 갱신 필요 (공식 캘린더 확정 시).
 */

export type AnnouncementKind = "fomc" | "opec";

export type AnnouncementEvent = {
  id: string;
  kind: AnnouncementKind;
  label: { ko: string; en: string };
  /** 결과 발표일 (FOMC는 2일 회의 중 둘째 날, UTC 기준 날짜 문자열) */
  date: string;
};

/** 2026년 확정 일정 (검색 확인일 기준) */
export const ANNOUNCEMENT_CALENDAR_2026: AnnouncementEvent[] = [
  { id: "fomc-2026-01", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-01-28" },
  { id: "fomc-2026-03", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-03-18" },
  { id: "fomc-2026-04", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-04-29" },
  { id: "fomc-2026-06", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-06-17" },
  { id: "fomc-2026-07", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-07-29" },
  { id: "fomc-2026-09", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-09-16" },
  { id: "fomc-2026-10", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-10-28" },
  { id: "fomc-2026-12", kind: "fomc", label: { ko: "FOMC", en: "FOMC" }, date: "2026-12-09" },
  { id: "opec-2026-01", kind: "opec", label: { ko: "OPEC+", en: "OPEC+" }, date: "2026-01-04" },
  { id: "opec-2026-02", kind: "opec", label: { ko: "OPEC+", en: "OPEC+" }, date: "2026-02-01" },
  {
    id: "opec-2026-06",
    kind: "opec",
    label: { ko: "OPEC+ 각료급", en: "OPEC+ Ministerial" },
    date: "2026-06-07",
  },
  { id: "opec-2026-08", kind: "opec", label: { ko: "OPEC+", en: "OPEC+" }, date: "2026-08-02" },
];

export type UpcomingAnnouncement = AnnouncementEvent & { daysUntil: number };

/** 오늘(UTC) 기준 앞으로 남은 발표를 가까운 순으로 최대 limit개 */
export function upcomingAnnouncements(
  fromDate: Date = new Date(),
  limit = 3,
): UpcomingAnnouncement[] {
  const from = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  return ANNOUNCEMENT_CALENDAR_2026.map((ev) => {
    const eventMs = new Date(`${ev.date}T00:00:00Z`).getTime();
    const daysUntil = Math.round((eventMs - from) / 86_400_000);
    return { ...ev, daysUntil };
  })
    .filter((ev) => ev.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}
