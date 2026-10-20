/**
 * 하루 1회급 “오늘 핫한 곳” — LLM 없이 hero + 통계로 3줄 구성.
 * @see docs/retention-markets-roadmap.md
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import { theaterAssetNote, theaterAssetSymbols } from "@/lib/theaterAssets";
import type { HeroBreakingItem, NewsStreamPayload, NewsTheater } from "@/lib/news/types";
import { THEATER_LABELS } from "@/lib/uiStrings";

export type TodayBriefing = {
  theater: NewsTheater;
  headline: string;
  lines: [string, string, string];
  link: string | null;
  source: string | null;
  articleId: string | null;
  kind: "hero" | "stats";
};

const DISMISS_PREFIX = "cv-today-briefing-dismissed-";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isTodayBriefingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_PREFIX + todayKey()) === "1";
  } catch {
    return false;
  }
}

export function dismissTodayBriefing(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISMISS_PREFIX + todayKey(), "1");
  } catch {
    // ignore
  }
}

function hottestTheaterFromStats(
  theaters: Record<NewsTheater, number> | undefined,
): NewsTheater | null {
  if (!theaters) return null;
  let best: NewsTheater | null = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(theaters) as Array<[NewsTheater, number]>) {
    if (key === "global") continue;
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return bestCount > 0 ? best : null;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildTodayBriefingFromHero(
  hero: HeroBreakingItem,
  payload: NewsStreamPayload | null,
  lang: LabelLanguage,
): TodayBriefing {
  const theaterName = THEATER_LABELS[lang][hero.theater];
  const symbols = theaterAssetSymbols(hero.theater).join(" · ");
  const status =
    hero.heroStatus === "confirmed"
      ? lang === "en"
        ? "Confirmed signal"
        : "확인 신호"
      : hero.heroStatus === "unverified"
        ? lang === "en"
          ? "Unverified — cross-check map"
          : "미확인 — 지도 교차 확인"
        : lang === "en"
          ? "Breaking"
          : "속보";

  const line1 =
    lang === "en"
      ? `${status} · ${theaterName}: ${truncate(hero.title, 90)}`
      : `${status} · ${theaterName}: ${truncate(hero.title, 90)}`;
  const line2 =
    lang === "en"
      ? `${hero.source} · ${hero.ageMinutes < 60 ? `${hero.ageMinutes}m ago` : `${Math.round(hero.ageMinutes / 60)}h ago`} · Tier ${hero.trustTier}`
      : `${hero.source} · ${hero.ageMinutes < 60 ? `${hero.ageMinutes}분 전` : `${Math.round(hero.ageMinutes / 60)}시간 전`} · Tier ${hero.trustTier}`;
  const tier1 = payload?.stats.tier1 ?? 0;
  const tier2 = payload?.stats.tier2 ?? 0;
  const line3 =
    lang === "en"
      ? `Related: ${symbols}. ${theaterAssetNote(hero.theater, "en")} · T1 ${tier1} / T2 ${tier2}`
      : `관련 심볼: ${symbols}. ${theaterAssetNote(hero.theater, "ko")} · T1 ${tier1} / T2 ${tier2}`;

  return {
    theater: hero.theater,
    headline: truncate(hero.title, 72),
    lines: [line1, line2, line3],
    link: hero.link || null,
    source: hero.source,
    articleId: hero.id,
    kind: "hero",
  };
}

export function buildTodayBriefing(
  payload: NewsStreamPayload | null,
  lang: LabelLanguage,
): TodayBriefing | null {
  if (payload?.hero) {
    return buildTodayBriefingFromHero(payload.hero, payload, lang);
  }
  const theater = hottestTheaterFromStats(payload?.stats.theaters);
  if (!theater) return null;

  const theaterName = THEATER_LABELS[lang][theater];
  const count = payload?.stats.theaters[theater] ?? 0;
  const symbols = theaterAssetSymbols(theater).join(" · ");

  return {
    theater,
    headline: theaterName,
    lines:
      lang === "en"
        ? [
            `Hottest cluster today: ${theaterName} (${count} items in feed)`,
            `No single headline — open the intel sheet for this theater.`,
            `Related: ${symbols}. ${theaterAssetNote(theater, "en")}`,
          ]
        : [
            `오늘 피드에서 가장 뜨거운 전장: ${theaterName} (${count}건)`,
            `단일 속보 없음 — Intel 시트에서 이 전장을 확인하세요.`,
            `관련 심볼: ${symbols}. ${theaterAssetNote(theater, "ko")}`,
          ],
    link: null,
    source: null,
    articleId: null,
    kind: "stats",
  };
}
