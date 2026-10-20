import {
  detectChokepoint,
  isChokepointEconomyNews,
  isChokepointSecurityNews,
  type ChokepointId,
} from "@/lib/news/chokepointNews";
import type { EconomyNewsGenre } from "@/lib/news/economyGenres";
import { newsTheaterFromCoords } from "@/lib/news/theaterMap";
import type { NewsTheater } from "@/lib/news/types";
import {
  chokeThemeId,
  econThemeId,
  theaterThemeId,
} from "./themes";
import type { MacroDomain, MacroGdeltInputEvent, MacroRssInputItem, MacroThemeId } from "./types";

function textOf(item: MacroRssInputItem): string {
  return `${item.title} ${item.summary ?? ""}`;
}

/**
 * RSS → 거시 테마. 초크가 잡히면 초크 우선, 아니면 theater / econ genre.
 */
export function assignRssTheme(
  item: MacroRssInputItem,
  domain: MacroDomain,
): MacroThemeId | null {
  const text = textOf(item);
  const choke = detectChokepoint(text);

  if (domain === "econ") {
    if (choke && choke.id !== "generic" && isChokepointEconomyNews(text)) {
      return chokeThemeId(choke.id);
    }
    if (choke && choke.id !== "generic" && isChokepointNewsLoose(text)) {
      return chokeThemeId(choke.id);
    }
    if (item.econGenre) return econThemeId(item.econGenre);
    // defense theater spill into economy only via choke; else map genre heuristics
    const genre = inferEconGenre(text);
    if (genre) return econThemeId(genre);
    if (item.theater && item.theater !== "global") {
      // weak: shipping/energy theaters via choke already handled
      return null;
    }
    return null;
  }

  // geo
  if (choke && choke.id !== "generic") {
    if (isChokepointSecurityNews(text) || isChokepointNewsLoose(text)) {
      return chokeThemeId(choke.id as ChokepointId);
    }
  }
  if (item.theater && item.theater !== "global") {
    return theaterThemeId(item.theater);
  }
  return null;
}

function isChokepointNewsLoose(text: string): boolean {
  return detectChokepoint(text) != null;
}

function inferEconGenre(text: string): EconomyNewsGenre | null {
  if (/\b(fed|fomc|ecb|rate\s?(hike|cut)|관세|제재|imf)\b/i.test(text)) return "macro";
  if (/\b(oil|crude|brent|lng|opec|유가)\b/i.test(text)) return "energy";
  if (/\b(freight|shipping|tanker|운임|해운|maersk)\b/i.test(text)) return "shipping";
  if (/\b(nvidia|tsmc|semiconductor|반도체|chip)\b/i.test(text)) return "chips";
  if (/\b(rare\s?earth|희토류|data\s?center)\b/i.test(text)) return "infra";
  if (/\b(tesla|byd|ev\b|전기차)\b/i.test(text)) return "auto";
  if (/\b(apple|microsoft|google|meta|openai)\b/i.test(text)) return "tech";
  if (/\b(stock|market|index|s&p|nasdaq)\b/i.test(text)) return "markets";
  return null;
}

/**
 * GDELT → 거시 테마. 초크 근접이면 초크, 아니면 좌표 theater.
 * 지경학에서는 초크·전쟁밀도만 초크/에너지·물류로 붙이고 일반 theater는 스킵.
 */
export function assignGdeltTheme(
  event: MacroGdeltInputEvent,
  domain: MacroDomain,
): MacroThemeId | null {
  const choke = nearestChokepoint(event.lat, event.lng);
  const theater = newsTheaterFromCoords(event.lat, event.lng);

  if (domain === "econ") {
    if (choke) return chokeThemeId(choke);
    if (event.eventTier === "war" || event.eventTier === "diplomatic") {
      // 공급망 압력 후보 — shipping/energy 버킷
      if (theater === "middle-east" || theater === "china-taiwan" || theater === "southeast-asia") {
        return econThemeId("shipping");
      }
      return econThemeId("energy");
    }
    return null;
  }

  if (choke) return chokeThemeId(choke);
  if (theater !== "global") return theaterThemeId(theater);
  return null;
}

/** 초크 반경(km) — 너무 넓으면 레반트·페르시아만 내륙이 수에즈/호르무즈로 잘못 붙음 */
const CHOKE_SNAP_KM: Record<ChokepointId, number> = {
  hormuz: 200,
  "bab-el-mandeb": 220,
  suez: 140,
  malacca: 280,
  "taiwan-strait": 200,
  panama: 200,
  bosporus: 120,
  gibraltar: 150,
  "good-hope": 300,
  generic: 0,
};

function nearestChokepoint(lat: number, lng: number): ChokepointId | null {
  const anchors: Array<{ id: ChokepointId; lat: number; lng: number }> = [
    { id: "hormuz", lat: 26.6, lng: 56.3 },
    { id: "bab-el-mandeb", lat: 12.6, lng: 43.35 },
    { id: "suez", lat: 30.6, lng: 32.4 },
    { id: "malacca", lat: 2.5, lng: 102 },
    { id: "taiwan-strait", lat: 24.25, lng: 119.75 },
    { id: "panama", lat: 9.15, lng: -79.65 },
    { id: "bosporus", lat: 41.1, lng: 29.05 },
    { id: "gibraltar", lat: 35.95, lng: -5.6 },
    { id: "good-hope", lat: -34.35, lng: 18.45 },
  ];
  let best: ChokepointId | null = null;
  let bestD = Infinity;
  for (const a of anchors) {
    const d = haversineKm(lat, lng, a.lat, a.lng);
    const limit = CHOKE_SNAP_KM[a.id] ?? 180;
    if (d > limit) continue;
    if (d < bestD) {
      bestD = d;
      best = a.id;
    }
  }
  return best;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function themeMatchesTheater(themeId: MacroThemeId, theater: NewsTheater): boolean {
  return themeId === theaterThemeId(theater);
}
