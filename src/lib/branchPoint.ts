/**
 * 분기점의 예고·당일·사후.
 * 지난 날은 목록에서 지우지 않고 사후 칸에 남겨, 의석·헌법·법을 출처로 확인한다.
 */
import { EXTRA_BRANCHES, SCHEDULE_CHECKS, SCHEDULE_GOAL, type BranchCheck, type CheckKind } from "@/data/branchPoints";
import { COUNTRY_INITIATIVES, initiativeById, type CountryInitiative } from "@/data/countryInitiatives";
import { MAJOR_SCHEDULES, type MajorSchedule, type MajorSchedulePrecision } from "@/data/majorSchedules";
import type { NewsStreamItem } from "@/lib/news/types";
import { buildEventScenarioBoard } from "@/lib/news/eventScenarios";
import { seoulCalendarDate } from "@/lib/majorSchedule";

export type { BranchCheck, CheckKind };

export type BranchPhase = "preview" | "day" | "aftermath";

export type BranchPoint = {
  id: string;
  countryId: string;
  goalId?: string;
  titleKo: string;
  titleEn: string;
  start: string;
  end?: string;
  precision: MajorSchedulePrecision;
  whenKo: string;
  whenEn: string;
  sourceUrl: string;
  sourceNameKo: string;
  sourceNameEn: string;
  checkedOn: string;
  checks: readonly BranchCheck[];
};

export type BranchLink = {
  countryId: string;
  branchId: string;
  goalId: string | null;
  phase: BranchPhase;
  title: string;
};

const RESULT_WORD = /win|won|result|seat|majority|certified|의석|당선|개표|결과|다수/i;
const ELECTION_WORD = /election|midterm|congress|parliament|vote|poll|seat|constitution|선거|당대회|의석|헌법|총선|투표/i;

function lastDay(row: { start: string; end?: string }): string {
  return row.end ?? row.start;
}

function openCheck(schedule: MajorSchedule): BranchCheck {
  const seats = schedule.kind !== "congress";
  return {
    id: `${schedule.id}-after`,
    kind: seats ? "seats" : "leadership",
    status: "open",
    promptKo: seats
      ? "의석이나 당선은 공식 결과가 이 주소에 실린 뒤에 적는다."
      : "대회가 고른 직책과 문서는 공식 글이 실린 뒤에 적는다.",
    promptEn: seats
      ? "Seats or winners are written here after an official result is on this page."
      : "Offices and documents chosen by the congress are written here after the official text is on this page.",
    sourceUrl: schedule.sourceUrl,
    sourceNameKo: schedule.sourceNameKo,
    sourceNameEn: schedule.sourceNameEn,
    checkedOn: schedule.checkedOn,
  };
}

function fromSchedule(row: MajorSchedule): BranchPoint {
  return {
    id: row.id,
    countryId: countryIdForSchedule(row),
    goalId: SCHEDULE_GOAL[row.id],
    titleKo: row.titleKo,
    titleEn: row.titleEn,
    start: row.start,
    end: row.end,
    precision: row.precision,
    whenKo: row.whenKo,
    whenEn: row.whenEn,
    sourceUrl: row.sourceUrl,
    sourceNameKo: row.sourceNameKo,
    sourceNameEn: row.sourceNameEn,
    checkedOn: row.checkedOn,
    checks: SCHEDULE_CHECKS[row.id] ?? [openCheck(row)],
  };
}

const COUNTRY_BY_NAME: Readonly<Record<string, string>> = {
  대만: "tw",
  중국: "cn",
  미국: "us",
  호주: "au",
  이란: "ir",
  한국: "kr",
  튀르키예: "tr",
  일본: "jp",
  인도: "in",
  러시아: "ru",
  우크라이나: "ua",
};

function countryIdForSchedule(row: MajorSchedule): string {
  return COUNTRY_BY_NAME[row.countryKo] ?? row.id;
}

export function allBranchPoints(): BranchPoint[] {
  return [...MAJOR_SCHEDULES.map(fromSchedule), ...EXTRA_BRANCHES];
}

export function branchPhase(row: BranchPoint, now: number): BranchPhase {
  if (row.precision === "unfixed") return "preview";
  const today = seoulCalendarDate(now);
  if (today < row.start) return "preview";
  if (today <= lastDay(row)) return "day";
  return "aftermath";
}

/** 투표일이 하루로 잡힌 예고만 남은 날수를 준다. */
export function daysUntil(row: BranchPoint, now: number): number | null {
  if (branchPhase(row, now) !== "preview" || row.precision !== "day") return null;
  const today = Date.parse(`${seoulCalendarDate(now)}T00:00:00Z`);
  const start = Date.parse(`${row.start}T00:00:00Z`);
  return Math.round((start - today) / 86_400_000);
}

export function branchesInPhase(phase: BranchPhase, now: number, rows: readonly BranchPoint[] = allBranchPoints()): BranchPoint[] {
  return rows
    .filter((row) => branchPhase(row, now) === phase)
    .sort((a, b) => (phase === "aftermath" ? (a.start < b.start ? 1 : -1) : a.start < b.start ? -1 : 1));
}

/** 카드의 다음 분기점. 예고만 고른다. 지난 선거는 사후 칸이다. */
export function nextBranch(countryId: string, now: number, rows: readonly BranchPoint[] = allBranchPoints()): BranchPoint | null {
  return branchesInPhase("preview", now, rows).find((row) => row.countryId === countryId) ?? null;
}

export function aftermathFor(countryId: string, now: number, rows: readonly BranchPoint[] = allBranchPoints()): BranchPoint[] {
  return branchesInPhase("aftermath", now, rows).filter((row) => row.countryId === countryId);
}

export function branchById(id: string, rows: readonly BranchPoint[] = allBranchPoints()): BranchPoint | null {
  return rows.find((row) => row.id === id) ?? null;
}

function pickBranch(countryId: string, title: string, now: number): BranchPoint | null {
  const aftermath = aftermathFor(countryId, now);
  const upcoming = nextBranch(countryId, now);
  if (RESULT_WORD.test(title) && aftermath[0]) return aftermath[0];
  return upcoming ?? aftermath[0] ?? null;
}

/**
 * 기사 제목을 국가 카드와 분기점에 건다.
 * 선거·의석·헌법 말이 있거나, 카드가 잡아 둔 지명이 있을 때 연결한다.
 */
export function linksForTitle(title: string, now: number): BranchLink[] {
  const text = title.trim();
  if (!text) return [];
  const election = ELECTION_WORD.test(text) || RESULT_WORD.test(text);
  const hits: BranchLink[] = [];
  for (const card of COUNTRY_INITIATIVES) {
    const named = card.name.test(text);
    const scoped = card.scope?.test(text) ?? false;
    if (!scoped && !(named && election)) continue;
    const scopedOnly = scoped && !election;
    const branch = pickBranch(card.id, text, now);
    if (!branch) continue;
    hits.push({
      countryId: card.id,
      branchId: branch.id,
      goalId: scopedOnly ? card.goals[0]?.id ?? null : branch.goalId ?? card.goals[0]?.id ?? null,
      phase: branchPhase(branch, now),
      title: text,
    });
    if (hits.length >= 2) break;
  }
  return hits;
}

export function linksForItems(items: NewsStreamItem[], now = Date.now()): BranchLink[] {
  const board = buildEventScenarioBoard(items, now);
  const titles = [board?.eventTitle, ...items.map((item) => item.title)].filter((title): title is string => Boolean(title));
  const seen = new Set<string>();
  const out: BranchLink[] = [];
  for (const title of titles) {
    for (const link of linksForTitle(title, now)) {
      const key = `${link.countryId}:${link.branchId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(link);
      if (out.length >= 2) return out;
    }
  }
  return out;
}

export function goalOnCard(card: CountryInitiative, goalId: string | null) {
  if (!goalId) return null;
  return card.goals.find((goal) => goal.id === goalId) ?? null;
}

export function cardForBranch(branch: BranchPoint): CountryInitiative | null {
  return initiativeById(branch.countryId);
}
