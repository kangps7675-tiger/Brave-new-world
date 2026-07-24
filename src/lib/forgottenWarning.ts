/**
 * 그날의 잊혀진 경고 — 오늘 MM-DD와 맞는 역사 콜백 1건.
 */

import { FRICTION_EPISODES, type FrictionEpisode } from "@/data/frictionEpisodes";
import {
  MAJOR_EVENT_TIMELINE,
  type MajorEventDomain,
  type MajorEventTimelineEntry,
} from "@/data/majorEventTimeline";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import type { NewsTheater } from "@/lib/news/types";
import type { ViewerMode } from "@/lib/viewPackages";

export type ForgottenWarning = {
  id: string;
  /** 원 사건 날짜 YYYY-MM-DD (가능하면) */
  date: string;
  yearsAgo: number;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  lat: number | null;
  lng: number | null;
  altitude?: number;
  theater?: string;
  source: "timeline" | "friction";
  exactAnniversary: boolean;
};

const MILESTONE_YEARS = new Set([1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 55, 60, 70, 75, 100]);

/** Friction 에피소드 — 공개 기록상 대표 기념일 (MM-DD) */
const FRICTION_ANNIVERSARY_MD: Record<string, string> = {
  "sino-soviet-border-1969": "03-02",
  "sino-vietnamese-war-1979": "02-17",
  "galwan-valley-clash-2020": "06-15",
  "russo-georgian-war-2008": "08-08",
  "nagorno-karabakh-war-2020": "09-27",
  "iran-iraq-war-1980": "09-22",
  "tunb-islands-dispute-1971": "11-30",
  "cambodian-vietnamese-war-1978": "12-25",
  "eritrean-ethiopian-war-1998": "05-06",
  "sino-north-korean-border-clash-1969": "03-15",
  "ussr-north-korea-maritime-friction-1980s": "08-01",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthDayKey(now: Date = new Date()): string {
  return `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function domainMatchesMode(domain: MajorEventDomain, mode: ViewerMode): boolean {
  if (mode === "economy") {
    return domain === "economy" || domain === "logistics" || domain === "both";
  }
  return domain === "conflict" || domain === "logistics" || domain === "both";
}

function yearsAgoFromDate(eventYmd: string, now: Date): number {
  const y = Number(eventYmd.slice(0, 4));
  if (!Number.isFinite(y)) return 0;
  return Math.max(0, now.getFullYear() - y);
}

function milestoneScore(yearsAgo: number): number {
  if (MILESTONE_YEARS.has(yearsAgo)) return 100 - Math.min(yearsAgo, 99);
  return 40 - Math.min(yearsAgo, 39);
}

function flyForTheater(theater: string | undefined): {
  lat: number;
  lng: number;
  altitude: number;
} | null {
  if (!theater) return null;
  if (theater in THEATER_FLY_TO) {
    return THEATER_FLY_TO[theater as NewsTheater];
  }
  return null;
}

function fromTimeline(
  entry: MajorEventTimelineEntry,
  now: Date,
  exact: boolean,
): ForgottenWarning {
  const fly = flyForTheater(entry.theater);
  return {
    id: `timeline:${entry.id}`,
    date: entry.date,
    yearsAgo: yearsAgoFromDate(entry.date, now),
    titleKo: entry.labelKo,
    titleEn: entry.labelEn,
    summaryKo: entry.summaryKo,
    summaryEn: entry.summaryEn,
    lat: fly?.lat ?? null,
    lng: fly?.lng ?? null,
    altitude: fly?.altitude,
    theater: entry.theater,
    source: "timeline",
    exactAnniversary: exact,
  };
}

function fromFriction(ep: FrictionEpisode, now: Date, exact: boolean): ForgottenWarning {
  const md = FRICTION_ANNIVERSARY_MD[ep.id] ?? "01-01";
  const date = `${ep.historicalYear}-${md}`;
  return {
    id: `friction:${ep.id}`,
    date,
    yearsAgo: Math.max(0, now.getFullYear() - ep.historicalYear),
    titleKo: ep.title,
    titleEn: ep.title,
    summaryKo: ep.briefing.slice(0, 220) + (ep.briefing.length > 220 ? "…" : ""),
    summaryEn: ep.briefing.slice(0, 220) + (ep.briefing.length > 220 ? "…" : ""),
    lat: ep.coordinates[1],
    lng: ep.coordinates[0],
    altitude: 1.4,
    theater: ep.lens,
    source: "friction",
    exactAnniversary: exact,
  };
}

function dayHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function mdDistance(a: string, b: string): number {
  const [am, ad] = a.split("-").map(Number);
  const [bm, bd] = b.split("-").map(Number);
  if (!am || !ad || !bm || !bd) return 999;
  const ay = 2000;
  const aDate = new Date(ay, am - 1, ad);
  const bDate = new Date(ay, bm - 1, bd);
  return Math.abs(Math.round((aDate.getTime() - bDate.getTime()) / 86_400_000));
}

/**
 * 오늘 모드에 맞는 잊혀진 경고 1건.
 * 우선: 정확 기념일 → 같은 달 ±7일 → friction 기념일 → 해시 폴백.
 */
export function pickForgottenWarning(
  now: Date = new Date(),
  viewerMode: ViewerMode = "conflict",
): ForgottenWarning | null {
  const md = monthDayKey(now);
  const pool = MAJOR_EVENT_TIMELINE.filter((e) => domainMatchesMode(e.domain, viewerMode));

  const exact = pool
    .filter((e) => e.date.slice(5) === md)
    .map((e) => fromTimeline(e, now, true))
    .sort((a, b) => milestoneScore(b.yearsAgo) - milestoneScore(a.yearsAgo));
  if (exact[0]) return exact[0];

  const near = pool
    .map((e) => ({ e, dist: mdDistance(e.date.slice(5), md) }))
    .filter((x) => x.dist > 0 && x.dist <= 7)
    .sort(
      (a, b) =>
        a.dist - b.dist ||
        milestoneScore(yearsAgoFromDate(b.e.date, now)) -
          milestoneScore(yearsAgoFromDate(a.e.date, now)),
    );
  if (near[0]) return fromTimeline(near[0].e, now, false);

  const frictionExact = FRICTION_EPISODES.map((ep) => {
    const amd = FRICTION_ANNIVERSARY_MD[ep.id];
    if (!amd || amd !== md) return null;
    if (viewerMode === "economy" && ep.lens === "global") {
      /* allow */
    }
    return fromFriction(ep, now, true);
  }).filter((x): x is ForgottenWarning => Boolean(x));
  if (frictionExact[0]) {
    return frictionExact.sort(
      (a, b) => milestoneScore(b.yearsAgo) - milestoneScore(a.yearsAgo),
    )[0]!;
  }

  if (FRICTION_EPISODES.length === 0 && pool.length === 0) return null;

  const seed = `${md}-${viewerMode}`;
  if (FRICTION_EPISODES.length > 0 && viewerMode === "conflict") {
    const idx = dayHash(seed) % FRICTION_EPISODES.length;
    return fromFriction(FRICTION_EPISODES[idx]!, now, false);
  }

  if (pool.length > 0) {
    const idx = dayHash(seed) % pool.length;
    return fromTimeline(pool[idx]!, now, false);
  }

  const idx = dayHash(seed) % FRICTION_EPISODES.length;
  return fromFriction(FRICTION_EPISODES[idx]!, now, false);
}

export function forgottenWarningLead(
  warning: ForgottenWarning,
  ko: boolean,
): string {
  const when = warning.exactAnniversary
    ? ko
      ? `오늘로부터 꼭 ${warning.yearsAgo}년 전`
      : `Exactly ${warning.yearsAgo} years ago today`
    : ko
      ? `지금으로부터 약 ${warning.yearsAgo}년 전 이맘때`
      : `Around ${warning.yearsAgo} years ago this season`;

  if (ko) {
    return `${when} — ${warning.titleKo}. 오늘의 긴장도와 나란히 보면 느낌이 달라집니다.`;
  }
  return `${when}: ${warning.titleEn}. Hold it beside today’s tension.`;
}
