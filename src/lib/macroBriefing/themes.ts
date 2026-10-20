import { AIS_GATE_CENTERS } from "@/lib/cesiumAlerts";
import type { ChokepointId } from "@/lib/news/chokepointNews";
import {
  economyGenreLabel,
  type EconomyNewsGenre,
  ECONOMY_GENRE_ORDER,
} from "@/lib/news/economyGenres";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import type { NewsTheater } from "@/lib/news/types";
import { theaterLabel } from "@/lib/uiStrings";
import type { MacroCameraHint, MacroDomain, MacroThemeId, MacroThemeKind } from "./types";

export const MACRO_THEATERS: NewsTheater[] = [
  "middle-east",
  "russia-ukraine",
  "china-taiwan",
  "korea",
  "japan",
  "south-asia",
  "southeast-asia",
  "south-america",
  "africa",
  "arctic",
  "atlantic",
];

export const MACRO_CHOKES: ChokepointId[] = [
  "hormuz",
  "suez",
  "bab-el-mandeb",
  "malacca",
  "taiwan-strait",
  "panama",
  "bosporus",
  "gibraltar",
  "good-hope",
];

const CHOKE_FLY: Partial<Record<ChokepointId, { lat: number; lng: number; altitude: number }>> = {
  hormuz: { lat: 26.6, lng: 56.3, altitude: 1.35 },
  "bab-el-mandeb": { lat: 12.6, lng: 43.35, altitude: 1.4 },
  suez: { lat: 30.6, lng: 32.4, altitude: 1.45 },
  malacca: { lat: 2.5, lng: 102, altitude: 1.5 },
  "taiwan-strait": { lat: 24.25, lng: 119.75, altitude: 1.1 },
  panama: { lat: 9.15, lng: -79.65, altitude: 1.55 },
  bosporus: { lat: 41.1, lng: 29.05, altitude: 1.35 },
  gibraltar: { lat: 35.95, lng: -5.6, altitude: 1.45 },
  "good-hope": { lat: -34.35, lng: 18.45, altitude: 1.7 },
  generic: { lat: 20, lng: 40, altitude: 2.0 },
};

for (const gate of AIS_GATE_CENTERS) {
  const id = gate.id as ChokepointId;
  if (!CHOKE_FLY[id]) {
    CHOKE_FLY[id] = { lat: gate.lat, lng: gate.lng, altitude: 1.5 };
  }
}

export function parseMacroThemeId(id: MacroThemeId): {
  kind: MacroThemeKind;
  key: string;
} {
  const [kind, ...rest] = id.split(":");
  return { kind: kind as MacroThemeKind, key: rest.join(":") };
}

export function theaterThemeId(theater: NewsTheater): MacroThemeId {
  return `theater:${theater}`;
}

export function chokeThemeId(id: ChokepointId): MacroThemeId {
  return `choke:${id}`;
}

export function econThemeId(genre: EconomyNewsGenre): MacroThemeId {
  return `econ:${genre}`;
}

export function macroThemeTitle(id: MacroThemeId, lang: LabelLanguage): string {
  const { kind, key } = parseMacroThemeId(id);
  if (kind === "theater") {
    return theaterLabel(key as NewsTheater, lang);
  }
  if (kind === "choke") {
    const gate = AIS_GATE_CENTERS.find((g) => g.id === key);
    if (gate) return lang === "en" ? gate.nameEn : gate.nameKo;
    if (key === "gibraltar") return lang === "en" ? "Gibraltar" : "지브롤터";
    if (key === "good-hope") return lang === "en" ? "Cape of Good Hope" : "희망봉";
    if (key === "generic") return lang === "en" ? "Chokepoint" : "초크포인트";
    return key;
  }
  return economyGenreLabel(key as EconomyNewsGenre, lang);
}

export function cameraForTheme(id: MacroThemeId): MacroCameraHint {
  const { kind, key } = parseMacroThemeId(id);
  if (kind === "theater") {
    const fly = THEATER_FLY_TO[key as NewsTheater] ?? THEATER_FLY_TO.global;
    return {
      lat: fly.lat,
      lng: fly.lng,
      altitude: fly.altitude,
      theater: key as NewsTheater,
      layerHints: ["conflictEvents", "gdelt"],
    };
  }
  if (kind === "choke") {
    const fly = CHOKE_FLY[key as ChokepointId] ?? CHOKE_FLY.generic!;
    return {
      lat: fly.lat,
      lng: fly.lng,
      altitude: fly.altitude,
      chokepointId: key as ChokepointId,
      layerHints: ["chokepoint", "gdelt"],
    };
  }
  // econ genres — 장르별 대표 프레임 (아프리카 글로벌 폴백 금지)
  const econFly = ECON_GENRE_FLY[key as EconomyNewsGenre];
  if (econFly) {
    return {
      lat: econFly.lat,
      lng: econFly.lng,
      altitude: econFly.altitude,
      theater: econFly.theater,
      chokepointId: econFly.chokepointId,
      layerHints: econFly.layerHints,
    };
  }
  const global = THEATER_FLY_TO.global;
  return {
    lat: global.lat,
    lng: global.lng,
    altitude: global.altitude,
    theater: "global",
    layerHints: ["gdelt"],
  };
}

const ECON_GENRE_FLY: Partial<
  Record<
    EconomyNewsGenre,
    MacroCameraHint
  >
> = {
  shipping: {
    lat: 2.5,
    lng: 102,
    altitude: 1.55,
    chokepointId: "malacca",
    layerHints: ["chokepoint", "gdelt"],
  },
  energy: {
    lat: 26.6,
    lng: 56.3,
    altitude: 1.45,
    chokepointId: "hormuz",
    layerHints: ["chokepoint", "gdelt"],
  },
  chips: {
    lat: 24.48,
    lng: 119.5,
    altitude: 1.05,
    theater: "china-taiwan",
    layerHints: ["gdelt"],
  },
  tech: {
    lat: 37.45,
    lng: -122.12,
    altitude: 1.35,
    theater: "global",
    layerHints: ["gdelt"],
  },
  markets: {
    lat: 40.75,
    lng: -74.0,
    altitude: 1.25,
    theater: "global",
    layerHints: ["gdelt"],
  },
  macro: {
    lat: 38.9,
    lng: -77.04,
    altitude: 1.35,
    theater: "global",
    layerHints: ["gdelt"],
  },
  auto: {
    lat: 35.5,
    lng: 129.5,
    altitude: 1.55,
    theater: "korea",
    layerHints: ["gdelt"],
  },
  infra: {
    lat: 1.35,
    lng: 103.8,
    altitude: 1.45,
    theater: "southeast-asia",
    layerHints: ["gdelt"],
  },
};

/** 도메인별 후보 테마 풀 (고정 목록) */
export function candidateThemeIds(domain: MacroDomain): MacroThemeId[] {
  if (domain === "econ") {
    const chokes = MACRO_CHOKES.filter((c) => c !== "generic").map(chokeThemeId);
    const genres = ECONOMY_GENRE_ORDER.map(econThemeId);
    return [...chokes, ...genres];
  }
  const theaters = MACRO_THEATERS.map(theaterThemeId);
  const chokes = MACRO_CHOKES.filter((c) => c !== "generic").map(chokeThemeId);
  return [...chokes, ...theaters];
}
