/**
 * 영토분쟁 통합 아카이브 — 진영 내부 + 국경·화약고를 한 목록으로.
 * 렌즈(bloc / border) · 대륙 카테고리로 걸러 본다.
 */

import {
  FRICTION_EPISODES,
  episodeLocationName,
  episodeTitle,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";
import {
  TERRITORIAL_DISPUTE_EPISODES,
  type TerritorialDisputeEpisode,
} from "@/data/territorialDisputeEpisodes";

export type ArchiveLens = "bloc" | "border";

/** 지정학 열람용 대륙·권역 (중동·북극을 대륙에 병기) */
export type ArchiveContinent =
  | "asia"
  | "middle-east"
  | "europe"
  | "africa"
  | "americas"
  | "arctic";

export type ArchiveEpisode = {
  /** 목록·선택 키 — friction: / territorial: 접두 */
  key: string;
  lens: ArchiveLens;
  continent: ArchiveContinent;
  kind: "friction" | "territorial";
  id: string;
  historicalYear: number;
  yearEnd?: number;
  titleKo: string;
  titleEn: string;
  locationKo: string;
  locationEn: string;
  parties: string[];
  friction?: FrictionEpisode;
  territorial?: TerritorialDisputeEpisode;
};

export const ARCHIVE_CONTINENT_ORDER: readonly ArchiveContinent[] = [
  "asia",
  "middle-east",
  "europe",
  "africa",
  "americas",
  "arctic",
] as const;

export const ARCHIVE_CONTINENT_LABEL: Record<
  ArchiveContinent | "all",
  { ko: string; en: string }
> = {
  all: { ko: "전 대륙", en: "All continents" },
  asia: { ko: "아시아", en: "Asia" },
  "middle-east": { ko: "중동", en: "Middle East" },
  europe: { ko: "유럽", en: "Europe" },
  africa: { ko: "아프리카", en: "Africa" },
  americas: { ko: "아메리카", en: "Americas" },
  arctic: { ko: "북극·대서양", en: "Arctic · N. Atlantic" },
};

/** 좌표 휴리스틱이 애매한 현장 — id 오버라이드 */
const CONTINENT_BY_EPISODE_ID: Partial<Record<string, ArchiveContinent>> = {
  // 코카서스 · 카스피해 → 유럽 화약고 묶음
  "russo-georgian-war-2008": "europe",
  "nagorno-karabakh-war-2020": "europe",
  "caspian-legal": "europe",
  // 에게·키프로스
  "imia-kardak-1996": "europe",
  "cyprus-1974": "europe",
  "kosovo-1999": "europe",
  "bosnia-dayton": "europe",
  // 중동 초크포인트·레반트
  "iran-iraq-war-1980": "middle-east",
  "tunb-islands-dispute-1971": "middle-east",
  "golan-heights": "middle-east",
  "hormuz-chokepoint": "middle-east",
  "bab-el-mandeb": "middle-east",
  "iran-israel-corridor": "middle-east",
  // 우크라이나 연속
  "crimea-2014": "europe",
  // 아프리카
  "eritrean-ethiopian-war-1998": "africa",
  "western-sahara": "africa",
  "ceuta-melilla": "africa",
  "sahel-borders": "africa",
  "congo-east": "africa",
  // 아메리카
  "falklands-1982": "americas",
  "venezuela-guyana-essequibo": "americas",
  "beagle-channel-chile-argentina": "americas",
  // 북극·GIUK
  "arctic-lomonosov": "arctic",
  "giuk-gap": "arctic",
};

/**
 * [lng, lat] → 대륙. 중동·코카서스·북극은 지정학 열람에 맞게 보정.
 */
export function continentFromCoordinates(
  lng: number,
  lat: number,
): ArchiveContinent {
  if (lat >= 66) return "arctic";
  // 북대서양 GIUK 권역
  if (lat >= 55 && lng >= -45 && lng <= 10) return "arctic";

  // 아메리카
  if (lng <= -25 && lng >= -170) return "americas";
  if (lng > 160 && lat < 0) return "americas"; // 드물게 태평양 횡단 좌표

  // 아프리카 (마그레브·사헬·동아프리카; 중동 레반트 제외)
  if (lat <= 37.5 && lat >= -35 && lng >= -20 && lng <= 52) {
    // 시나이·레반트·아라비아·이란은 중동
    if (lat >= 12 && lng >= 32 && lng <= 63) {
      if (lat >= 27 || lng >= 34) return "middle-east";
    }
    // 아라비아 반도·페르시아만
    if (lng >= 34 && lng <= 63 && lat >= 12 && lat <= 40) return "middle-east";
    return "africa";
  }

  // 중동 (레반트·아라비아·이란·걸프)
  if (lng >= 26 && lng <= 63 && lat >= 12 && lat <= 42) {
    // 코카서스 북부(조지아 등)는 유럽 쪽으로
    if (lat >= 41 && lng >= 40 && lng <= 50) return "europe";
    return "middle-east";
  }

  // 유럽 (우랄 서쪽 대략)
  if (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 45) return "europe";
  // 우랄~카스피해 서쪽 유럽 잔여
  if (lat >= 41 && lat <= 62 && lng > 45 && lng <= 60) return "europe";

  // 그 외 유라시아 → 아시아
  if (lat >= -10 && lng >= 45 && lng <= 180) return "asia";
  if (lng >= -180 && lng < -170 && lat > 40) return "asia"; // 베링 근처

  return "asia";
}

function resolveContinent(
  id: string,
  coordinates: readonly [number, number],
): ArchiveContinent {
  const override = CONTINENT_BY_EPISODE_ID[id];
  if (override) return override;
  return continentFromCoordinates(coordinates[0], coordinates[1]);
}

function yearSortKey(ep: ArchiveEpisode): number {
  return ep.yearEnd ?? ep.historicalYear;
}

export function buildTerritorialArchive(): ArchiveEpisode[] {
  const bloc: ArchiveEpisode[] = FRICTION_EPISODES.map((ep) => ({
    key: `friction:${ep.id}`,
    lens: "bloc" as const,
    continent: resolveContinent(ep.id, ep.coordinates),
    kind: "friction" as const,
    id: ep.id,
    historicalYear: ep.historicalYear,
    yearEnd: ep.yearEnd,
    titleKo: ep.title,
    titleEn: ep.titleEn ?? ep.title,
    locationKo: ep.locationName,
    locationEn: ep.locationNameEn ?? ep.locationName,
    parties: ep.parties,
    friction: ep,
  }));

  const border: ArchiveEpisode[] = TERRITORIAL_DISPUTE_EPISODES.map((ep) => ({
    key: `territorial:${ep.id}`,
    lens: "border" as const,
    continent: resolveContinent(ep.id, ep.coordinates),
    kind: "territorial" as const,
    id: ep.id,
    historicalYear: ep.historicalYear,
    yearEnd: ep.yearEnd,
    titleKo: ep.title,
    titleEn: ep.titleEn,
    locationKo: ep.locationName,
    locationEn: ep.locationNameEn,
    parties: ep.parties,
    territorial: ep,
  }));

  return [...bloc, ...border].sort((a, b) => {
    const y = yearSortKey(a) - yearSortKey(b);
    if (y !== 0) return y;
    return a.titleKo.localeCompare(b.titleKo, "ko");
  });
}

let cached: ArchiveEpisode[] | null = null;

export function territorialArchiveEpisodes(): ArchiveEpisode[] {
  if (!cached) cached = buildTerritorialArchive();
  return cached;
}

export type ArchiveFilter = {
  lens?: ArchiveLens | "all";
  continent?: ArchiveContinent | "all";
};

export function filterArchiveEpisodes(
  lensOrFilter: ArchiveLens | "all" | ArchiveFilter = "all",
  continent: ArchiveContinent | "all" = "all",
): ArchiveEpisode[] {
  const filter: ArchiveFilter =
    typeof lensOrFilter === "object"
      ? lensOrFilter
      : { lens: lensOrFilter, continent };

  const lens = filter.lens ?? "all";
  const cont = filter.continent ?? "all";

  return territorialArchiveEpisodes().filter((e) => {
    if (lens !== "all" && e.lens !== lens) return false;
    if (cont !== "all" && e.continent !== cont) return false;
    return true;
  });
}

export function archiveContinentCounts(
  lens: ArchiveLens | "all" = "all",
): Record<ArchiveContinent | "all", number> {
  const base = filterArchiveEpisodes(lens, "all");
  const counts = {
    all: base.length,
    asia: 0,
    "middle-east": 0,
    europe: 0,
    africa: 0,
    americas: 0,
    arctic: 0,
  } satisfies Record<ArchiveContinent | "all", number>;
  for (const e of base) counts[e.continent] += 1;
  return counts;
}

export function archiveEpisodeTitle(ep: ArchiveEpisode, lang: "ko" | "en"): string {
  if (ep.friction) return episodeTitle(ep.friction, lang);
  return lang === "en" ? ep.titleEn : ep.titleKo;
}

export function archiveEpisodeLocation(ep: ArchiveEpisode, lang: "ko" | "en"): string {
  if (ep.friction) return episodeLocationName(ep.friction, lang);
  return lang === "en" ? ep.locationEn : ep.locationKo;
}

export function archiveYearLabel(ep: ArchiveEpisode): string {
  return ep.yearEnd ? `${ep.historicalYear}–${ep.yearEnd}` : `${ep.historicalYear}`;
}

export const ARCHIVE_LENS_LABEL = {
  all: { ko: "전체", en: "All" },
  bloc: { ko: "같은 진영끼리의 충돌", en: "Clashes inside a bloc" },
  border: { ko: "국경·영토 긴장", en: "Border & territory tension" },
} as const;
