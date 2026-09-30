/**
 * 거시 브리핑 카메라 — 기사에 나온 도시명(gazetteer)을 우선.
 */

import { matchGazetteer, type GazetteerEntry } from "@/lib/geo/gazetteer";
import { resolveNewsCoords } from "@/lib/news/newsStreamMapTags";
import type { NewsStreamItem } from "@/lib/news/types";
import { cameraForTheme, parseMacroThemeId } from "./themes";
import type {
  MacroCameraHint,
  MacroGdeltInputEvent,
  MacroRssInputItem,
  MacroThemeId,
} from "./types";

function asNewsStreamItem(item: MacroRssInputItem): NewsStreamItem {
  return {
    id: item.id,
    title: item.title,
    link: item.link,
    source: item.source,
    publisher: item.publisher,
    pubDate: item.pubDate,
    theater: item.theater,
    trustTier: item.trustTier,
    feedTopic: item.feedTopic,
    econGenre: item.econGenre,
    summary: item.summary,
  };
}

function altitudeForPrecision(precision: "city" | "region" | "country"): number {
  if (precision === "city") return 0.92;
  if (precision === "region") return 1.35;
  return 1.7;
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

/** 초크 테마: 지명이 앵커에서 너무 멀면(외교 수도 등) 해협 고정 */
const CHOKE_PLACE_MAX_KM = 500;

type ArticlePlace = {
  lat: number;
  lng: number;
  label: string;
  precision: "city" | "region" | "country";
};

function fromGazetteer(entry: GazetteerEntry): ArticlePlace {
  return {
    lat: entry.lat,
    lng: entry.lng,
    label: entry.en,
    precision: entry.precision,
  };
}

/**
 * 기사 텍스트 → 좌표.
 * 기억된 도시명(GAZETTEER)을 제목에서 먼저, 없으면 요약의 도시만.
 * 기존 네온 resolveNewsCoords는 보강 폴백.
 */
export function placeFromArticle(item: MacroRssInputItem): ArticlePlace | null {
  const titleBlob = [item.title, item.titleKo].filter(Boolean).join(" \n ");
  const bodyBlob = [item.summary, item.bodyKo].filter(Boolean).join(" \n ");

  const titleGaz = titleBlob ? matchGazetteer(titleBlob) : null;
  if (titleGaz && titleGaz.precision !== "country") {
    return fromGazetteer(titleGaz);
  }

  const neon = resolveNewsCoords(asNewsStreamItem(item));
  if (neon) {
    return {
      lat: neon.lat,
      lng: neon.lng,
      label: neon.label,
      precision: "city",
    };
  }

  if (titleGaz) return fromGazetteer(titleGaz);

  const bodyGaz = bodyBlob ? matchGazetteer(bodyBlob) : null;
  if (bodyGaz && bodyGaz.precision === "city") {
    return fromGazetteer(bodyGaz);
  }

  return null;
}

function hintFromPlace(
  place: ArticlePlace,
  base: MacroCameraHint,
  theaterFallback?: MacroRssInputItem["theater"],
): MacroCameraHint {
  return {
    lat: place.lat,
    lng: place.lng,
    altitude: altitudeForPrecision(place.precision),
    theater: base.theater ?? theaterFallback,
    chokepointId: base.chokepointId,
    layerHints: base.layerHints,
  };
}

/**
 * RSS 기사 → 카메라.
 * 1) 기사 도시명(gazetteer)
 * 2) 초크면 앵커 근처만 채택
 * 3) 없으면 테마 앵커
 */
export function cameraForRssItem(
  item: MacroRssInputItem,
  themeId: MacroThemeId,
): MacroCameraHint {
  const base = cameraForTheme(themeId);
  const { kind } = parseMacroThemeId(themeId);
  const place = placeFromArticle(item);

  if (place) {
    if (kind === "choke") {
      const dist = haversineKm(place.lat, place.lng, base.lat, base.lng);
      if (dist > CHOKE_PLACE_MAX_KM) return base;
    }
    return hintFromPlace(place, base, item.theater);
  }
  return base;
}

function placeFromGdeltTitle(title: string | null | undefined): ArticlePlace | null {
  if (!title?.trim()) return null;
  const hit = matchGazetteer(title);
  if (!hit) return null;
  if (hit.precision === "country") return null;
  return fromGazetteer(hit);
}

/**
 * GDELT 밀도 포커스.
 * 1) 같은 테마 RSS 기사의 도시명
 * 2) GDELT 제목의 도시·지역
 * 3) 초크면 앵커 고정 / 아니면 밀도 봉우리·최고 tension
 * 평균(centroid) 금지.
 */
export function cameraForGdeltFocus(
  events: MacroGdeltInputEvent[],
  themeId: MacroThemeId,
  rssItems: MacroRssInputItem[] = [],
): MacroCameraHint {
  const base = cameraForTheme(themeId);
  const { kind } = parseMacroThemeId(themeId);

  const sortedRss = [...rssItems].sort((a, b) => {
    const ua = a.urgencyScore ?? (a.breakingGrade ?? 0) * 10;
    const ub = b.urgencyScore ?? (b.breakingGrade ?? 0) * 10;
    if (ub !== ua) return ub - ua;
    return (a.ageMinutes ?? 9999) - (b.ageMinutes ?? 9999);
  });
  for (const item of sortedRss) {
    const place = placeFromArticle(item);
    if (!place || place.precision === "country") continue;
    if (kind === "choke") {
      const dist = haversineKm(place.lat, place.lng, base.lat, base.lng);
      if (dist > CHOKE_PLACE_MAX_KM) continue;
    }
    return hintFromPlace(place, base, item.theater);
  }

  if (kind === "choke") {
    return base;
  }

  const ranked = [...events].sort((a, b) => {
    const ia = importanceRank(a) * 10 + (a.tensionScore ?? 0);
    const ib = importanceRank(b) * 10 + (b.tensionScore ?? 0);
    return ib - ia;
  });

  for (const e of ranked) {
    const place = placeFromGdeltTitle(e.title);
    if (place) {
      return {
        lat: place.lat,
        lng: place.lng,
        altitude: altitudeForPrecision(place.precision),
        theater: base.theater,
        chokepointId: base.chokepointId,
        layerHints: ["gdelt", "conflictEvents"],
      };
    }
  }

  if (events.length === 0) return base;

  const cells = new Map<
    string,
    { n: number; latSum: number; lngSum: number; best: MacroGdeltInputEvent }
  >();
  for (const e of events) {
    const key = `${(e.lat * 2).toFixed(0)},${(e.lng * 2).toFixed(0)}`;
    const row = cells.get(key);
    if (!row) {
      cells.set(key, { n: 1, latSum: e.lat, lngSum: e.lng, best: e });
      continue;
    }
    row.n += 1;
    row.latSum += e.lat;
    row.lngSum += e.lng;
    if (
      importanceRank(e) * 10 + (e.tensionScore ?? 0) >
      importanceRank(row.best) * 10 + (row.best.tensionScore ?? 0)
    ) {
      row.best = e;
    }
  }

  let densest: { n: number; latSum: number; lngSum: number; best: MacroGdeltInputEvent } | null =
    null;
  for (const row of cells.values()) {
    if (!densest || row.n > densest.n) densest = row;
  }

  const focus =
    densest && densest.n >= 3
      ? {
          lat: densest.latSum / densest.n,
          lng: densest.lngSum / densest.n,
        }
      : { lat: ranked[0].lat, lng: ranked[0].lng };

  return {
    lat: focus.lat,
    lng: focus.lng,
    altitude: altitudeForPrecision(densest && densest.n >= 3 ? "region" : "city"),
    theater: base.theater,
    chokepointId: base.chokepointId,
    layerHints: ["gdelt", "conflictEvents"],
  };
}

function importanceRank(e: MacroGdeltInputEvent): number {
  if (e.importanceGrade === "S") return 4;
  if (e.importanceGrade === "A") return 3;
  if (e.importanceGrade === "B") return 2;
  return 1;
}

/** 토픽 기본 카메라: RSS 기사 도시 > GDELT 제목/밀도 > 테마 */
export function cameraForTopic(
  themeId: MacroThemeId,
  topRss: MacroRssInputItem | null,
  gdeltEvents: MacroGdeltInputEvent[],
  rssItems: MacroRssInputItem[] = [],
): MacroCameraHint {
  if (topRss) {
    const place = placeFromArticle(topRss);
    if (place && place.precision !== "country") {
      return cameraForRssItem(topRss, themeId);
    }
  }
  return cameraForGdeltFocus(gdeltEvents, themeId, rssItems.length ? rssItems : topRss ? [topRss] : []);
}
