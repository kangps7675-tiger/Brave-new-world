/**
 * 로그인 없이 — 유저가 고른 전장/허브를 이 기기에만 기억.
 * 다음 방문 시 "당신이 보던 …" 한 줄용.
 */

import type { NavSelection } from "@/data/navRegions";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import { newsTheaterFromNavId } from "@/lib/news/theaterMap";
import type { ViewerMode, ViewTheaterChoice } from "@/lib/viewPackages";

export const WATCH_FOCUS_STORAGE_KEY = "cv-watch-focus-v1";

export type WatchFocus = {
  mode: ViewerMode;
  theater?: string;
  hub?: string;
  navId?: string;
  labelKo: string;
  labelEn: string;
  /** dailyEntityRanks entityId */
  rankEntityId?: string;
  rankKind?: "theater" | "chokepoint";
  updatedAt: string;
};

/** ViewTheaterChoice / NewsTheater → daily ranks theater entityId */
export const THEATER_TO_RANK_ENTITY: Record<string, string> = {
  "china-taiwan": "taiwan",
  "russia-ukraine": "ukraine",
  korea: "korea",
  japan: "japan",
  "middle-east": "middle-east",
  global: "pacific",
};

const THEATER_LABELS: Record<string, { ko: string; en: string }> = {
  "china-taiwan": { ko: "대만 해협", en: "Taiwan Strait" },
  "russia-ukraine": { ko: "우크라이나 전선", en: "Ukraine front" },
  korea: { ko: "한반도", en: "Korean Peninsula" },
  japan: { ko: "일본·인도태평양", en: "Japan · Indo-Pacific" },
  "middle-east": { ko: "중동·이란", en: "Middle East / Iran" },
  global: { ko: "글로벌 전장", en: "Global theaters" },
};

/** 경제 내비 id → chokepoint rank entity */
const ECON_NAV_TO_CHOKEPOINT: Record<string, string> = {
  hormuz: "hormuz",
  "suez-red-sea": "suez",
  suez: "suez",
  malacca: "malacca",
  "taiwan-strait": "taiwan-strait",
  panama: "panama",
};

export function loadWatchFocus(): WatchFocus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WATCH_FOCUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WatchFocus;
    if (!parsed?.mode || !parsed.labelKo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWatchFocus(focus: Omit<WatchFocus, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: WatchFocus = {
      ...focus,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(WATCH_FOCUS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function rememberConflictTheater(
  theater: ViewTheaterChoice,
  navId?: string,
): void {
  if (theater === "auto") return;
  const labels = THEATER_LABELS[theater];
  if (!labels) return;
  saveWatchFocus({
    mode: "conflict",
    theater,
    navId,
    labelKo: labels.ko,
    labelEn: labels.en,
    rankEntityId: THEATER_TO_RANK_ENTITY[theater],
    rankKind: "theater",
  });
}

export function rememberConflictNav(selection: NavSelection): void {
  const theater = newsTheaterFromNavId(selection.id);
  if (theater === "all") return;
  const labels = THEATER_LABELS[theater];
  saveWatchFocus({
    mode: "conflict",
    theater,
    navId: selection.id,
    labelKo: selection.label || labels?.ko || theater,
    labelEn: labels?.en || selection.label || theater,
    rankEntityId: THEATER_TO_RANK_ENTITY[theater],
    rankKind: "theater",
  });
}

export function rememberEconomyHub(
  hub: EconomyHubChoice,
  labelKo: string,
  labelEn: string,
  navId?: string,
): void {
  if (!hub || hub === "auto") return;
  const choke = navId ? ECON_NAV_TO_CHOKEPOINT[navId] : undefined;
  saveWatchFocus({
    mode: "economy",
    hub,
    navId,
    labelKo,
    labelEn,
    rankEntityId: choke,
    rankKind: choke ? "chokepoint" : undefined,
  });
}

export function rememberEconomyNav(selection: NavSelection): void {
  const choke = ECON_NAV_TO_CHOKEPOINT[selection.id];
  saveWatchFocus({
    mode: "economy",
    hub: selection.id,
    navId: selection.id,
    labelKo: selection.label,
    labelEn: selection.label,
    rankEntityId: choke,
    rankKind: choke ? "chokepoint" : undefined,
  });
}

/** 인사 한 줄 — 랭크가 있으면 함께 */
export function formatWatchFocusLine(
  focus: WatchFocus,
  lang: "ko" | "en",
  rank?: { rank: number; prevRank: number | null } | null,
): string {
  const name = lang === "en" ? focus.labelEn : focus.labelKo;
  if (rank && Number.isFinite(rank.rank)) {
    const prev = rank.prevRank;
    if (prev != null && prev !== rank.rank) {
      return lang === "en"
        ? `Your watch: ${name} — rank #${rank.rank} (was #${prev})`
        : `당신이 지켜보던 ${name} · 오늘 ${rank.rank}위 (어제 ${prev}위)`;
    }
    return lang === "en"
      ? `Your watch: ${name} — rank #${rank.rank} today`
      : `당신이 지켜보던 ${name} · 오늘 ${rank.rank}위`;
  }
  return lang === "en" ? `Your watch: ${name}` : `당신이 지켜보던 ${name}`;
}
