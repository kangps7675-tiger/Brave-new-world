/**
 * 로그인 없이 — 유저가 고른 전장/허브를 이 기기에만 기억.
 * 단수 focus → 핀 목록(최대 8). 다음 방문 시 ranks 조인 한 줄용.
 */

import type { NavSelection } from "@/data/navRegions";
import type { EconomyHubChoice } from "@/lib/autoFlyTarget";
import { newsTheaterFromNavId } from "@/lib/news/theaterMap";
import { trackEvent } from "@/lib/trackClient";
import type { ViewerMode, ViewTheaterChoice } from "@/lib/viewPackages";

export const WATCH_FOCUS_STORAGE_KEY = "cv-watch-focus-v1";
export const WATCH_PINS_STORAGE_KEY = "cv-watch-pins-v1";
export const WATCH_PINS_MAX = 8;

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

export type WatchPinRank = {
  rank: number;
  prevRank: number | null;
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

function pinIdentity(p: Pick<WatchFocus, "rankEntityId" | "mode" | "theater" | "hub" | "navId">): string {
  if (p.rankEntityId) return `rank:${p.rankEntityId}`;
  if (p.navId) return `nav:${p.mode}:${p.navId}`;
  if (p.theater) return `theater:${p.theater}`;
  if (p.hub) return `hub:${p.hub}`;
  return `mode:${p.mode}`;
}

function readLegacyFocus(): WatchFocus | null {
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

function persistPins(pins: WatchFocus[]): void {
  window.localStorage.setItem(WATCH_PINS_STORAGE_KEY, JSON.stringify(pins));
  // 하위 호환: 최신 핀을 단수 키에도 유지
  if (pins[0]) {
    window.localStorage.setItem(WATCH_FOCUS_STORAGE_KEY, JSON.stringify(pins[0]));
  } else {
    window.localStorage.removeItem(WATCH_FOCUS_STORAGE_KEY);
  }
}

/** 핀 목록 — 최신이 앞. 구 단수 키에서 마이그레이션. */
export function loadWatchPins(): WatchFocus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCH_PINS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WatchFocus[];
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => p?.mode && p.labelKo).slice(0, WATCH_PINS_MAX);
      }
    }
    const legacy = readLegacyFocus();
    if (legacy) {
      persistPins([legacy]);
      return [legacy];
    }
    return [];
  } catch {
    return [];
  }
}

/** 최신 핀 1개 — 기존 API 호환 */
export function loadWatchFocus(): WatchFocus | null {
  return loadWatchPins()[0] ?? null;
}

export function saveWatchFocus(focus: Omit<WatchFocus, "updatedAt">): void {
  upsertWatchPin(focus);
}

/**
 * 핀 upsert. 동일 identity면 갱신·맨 앞으로.
 * 초과 시 가장 오래된 핀 drop.
 * @returns { added, pins } — added면 신규 삽입(킬스위치 지표용)
 */
export function upsertWatchPin(
  focus: Omit<WatchFocus, "updatedAt">,
): { added: boolean; pins: WatchFocus[] } {
  if (typeof window === "undefined") return { added: false, pins: [] };
  try {
    const payload: WatchFocus = {
      ...focus,
      updatedAt: new Date().toISOString(),
    };
    const id = pinIdentity(payload);
    const prev = loadWatchPins();
    const without = prev.filter((p) => pinIdentity(p) !== id);
    const added = without.length === prev.length;
    const next = [payload, ...without].slice(0, WATCH_PINS_MAX);
    persistPins(next);
    if (added) {
      trackEvent("watch_pin_add", {
        mode: payload.mode,
        entity: payload.rankEntityId ?? payload.navId ?? payload.theater ?? payload.hub,
        count: next.length,
      });
    }
    return { added, pins: next };
  } catch {
    return { added: false, pins: [] };
  }
}

export function removeWatchPin(
  match: Pick<WatchFocus, "rankEntityId" | "mode" | "theater" | "hub" | "navId">,
): WatchFocus[] {
  if (typeof window === "undefined") return [];
  try {
    const id = pinIdentity(match);
    const prev = loadWatchPins();
    const next = prev.filter((p) => pinIdentity(p) !== id);
    if (next.length < prev.length) {
      persistPins(next);
      trackEvent("watch_pin_remove", {
        entity: match.rankEntityId ?? match.navId ?? match.theater ?? match.hub,
        count: next.length,
      });
    }
    return next;
  } catch {
    return [];
  }
}

export function clearWatchPins(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WATCH_PINS_STORAGE_KEY);
    window.localStorage.removeItem(WATCH_FOCUS_STORAGE_KEY);
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
  upsertWatchPin({
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
  upsertWatchPin({
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
  upsertWatchPin({
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
  upsertWatchPin({
    mode: "economy",
    hub: selection.id,
    navId: selection.id,
    labelKo: selection.label,
    labelEn: selection.label,
    rankEntityId: choke,
    rankKind: choke ? "chokepoint" : undefined,
  });
}

/** 단수 인사 한 줄 — 랭크가 있으면 함께 */
export function formatWatchFocusLine(
  focus: WatchFocus,
  lang: "ko" | "en",
  rank?: WatchPinRank | null,
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

function formatPinSnippet(
  focus: WatchFocus,
  lang: "ko" | "en",
  rank?: WatchPinRank | null,
): string {
  const name = lang === "en" ? focus.labelEn : focus.labelKo;
  if (!rank || !Number.isFinite(rank.rank)) return name;
  const prev = rank.prevRank;
  if (prev != null && prev !== rank.rank) {
    const arrow = rank.rank < prev ? "↑" : "↓";
    return lang === "en"
      ? `${name} #${rank.rank}${arrow}`
      : `${name} ${rank.rank}위${arrow}`;
  }
  return lang === "en" ? `${name} #${rank.rank}` : `${name} ${rank.rank}위`;
}

/**
 * 핀 여러 개 한 줄.
 * 1개 → 기존 formatWatchFocusLine
 * 2+ → 「내 핀 N · A · B · …」
 */
export function formatWatchPinsLine(
  pins: WatchFocus[],
  lang: "ko" | "en",
  ranksByEntity: Record<string, WatchPinRank | null | undefined>,
): string | null {
  if (pins.length === 0) return null;
  if (pins.length === 1) {
    const p = pins[0]!;
    const rank = p.rankEntityId ? ranksByEntity[p.rankEntityId] : null;
    return formatWatchFocusLine(p, lang, rank ?? null);
  }
  const snippets = pins.slice(0, 4).map((p) => {
    const rank = p.rankEntityId ? ranksByEntity[p.rankEntityId] : null;
    return formatPinSnippet(p, lang, rank ?? null);
  });
  const more = pins.length > 4 ? (lang === "en" ? ` +${pins.length - 4}` : ` 외 ${pins.length - 4}`) : "";
  return lang === "en"
    ? `Your pins (${pins.length}): ${snippets.join(" · ")}${more}`
    : `내 핀 ${pins.length} · ${snippets.join(" · ")}${more}`;
}
