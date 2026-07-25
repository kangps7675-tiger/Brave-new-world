/**
 * 오늘 핫한 전장·초크 → 유저가 바로 봐야 할 뉴스/전황 레이어 패치.
 * daily-ranks TOP을 읽어 conceptLayers 스택에 얹는다.
 *
 * 핫존은 그 순간의 랭킹이 정한다 — 홍해/특정 초크를 하드코딩하지 않는다.
 * 홍해·후티 스택은 TOP이 그 초크일 때만 켠다.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import type { DailyRankEntry, DailyRanksPayload } from "@/lib/dailyRanks";
import { conceptLayersForConflict } from "@/lib/conceptLayers";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";
import type { NewsTheater } from "@/lib/news/types";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export type HotTheaterLayerPatch = Partial<Record<BooleanLayerKey, boolean>>;

export type HotTheaterFocus = {
  theaterId: string | null;
  chokeId: string | null;
  patch: HotTheaterLayerPatch;
  fly: { lat: number; lng: number; altitude: number } | null;
  labelKo: string;
  labelEn: string;
};

const ENTITY_FLY: Record<string, { lat: number; lng: number; altitude: number }> = {
  ukraine: { lat: 48.5, lng: 37.5, altitude: 1.35 },
  "middle-east": {
    lat: THEATER_FLY_TO["middle-east"].lat,
    lng: THEATER_FLY_TO["middle-east"].lng,
    altitude: 1.55,
  },
  taiwan: {
    lat: THEATER_FLY_TO["china-taiwan"].lat,
    lng: THEATER_FLY_TO["china-taiwan"].lng,
    altitude: 0.95,
  },
  korea: {
    lat: THEATER_FLY_TO.korea.lat,
    lng: THEATER_FLY_TO.korea.lng,
    altitude: 0.75,
  },
  japan: THEATER_FLY_TO.japan,
  "south-asia": THEATER_FLY_TO["south-asia"],
  "southeast-asia": THEATER_FLY_TO["southeast-asia"],
  "south-america": THEATER_FLY_TO["south-america"],
  africa: THEATER_FLY_TO.africa,
  arctic: THEATER_FLY_TO.arctic,
  atlantic: THEATER_FLY_TO.atlantic,
  "choke-hormuz": { lat: 26.58, lng: 56.25, altitude: 0.72 },
  "choke-suez": { lat: 31.25, lng: 32.34, altitude: 0.85 },
  "choke-bab-el-mandeb": { lat: 12.61, lng: 43.35, altitude: 0.8 },
  "choke-malacca": { lat: 2.5, lng: 101.5, altitude: 0.85 },
  "choke-taiwan": { lat: 24.48, lng: 119.5, altitude: 0.9 },
  "choke-gibraltar": { lat: 35.95, lng: -5.6, altitude: 0.85 },
  "choke-good-hope": { lat: -34.35, lng: 18.48, altitude: 1.2 },
};

/** 홍해·후티 회랑 — TOP이 홍해 계열일 때만 사용 */
export const RED_SEA_HOUTHI_STACK: HotTheaterLayerPatch = {
  showShippingLanes: true,
  showLogisticsRisk: true,
  showPorts: true,
  showAis: true,
  showFirmsFires: true,
  showGdeltWar: true,
  showGdeltDiplomatic: true,
  showNewfeedsIranAttacks: true,
  showUsCarriers: true,
  showMilitaryActivity: true,
  showWarZones: true,
  showUkmtoIncidents: true,
  showNavareaWarnings: true,
};

/** @deprecated 입구 자동 홍해 fly는 제거됨. 좌표 맵 참조용으로만 유지. */
export const CONFLICT_ENTRY_MARITIME_FLY = ENTITY_FLY["choke-bab-el-mandeb"]!;

const RED_SEA_CHOKE_IDS = new Set([
  "choke-bab-el-mandeb",
  "choke-suez",
  "choke-hormuz",
]);

const MARITIME_BASE_STACK: HotTheaterLayerPatch = {
  showShippingLanes: true,
  showLogisticsRisk: true,
  showPorts: true,
  showAis: true,
  showUkmtoIncidents: true,
  showNavareaWarnings: true,
  showUsCarriers: true,
};

function theaterToConcept(
  entityId: string,
): "russia-ukraine" | "korea" | "china-taiwan" | "middle-east" | null {
  if (entityId === "ukraine" || entityId === "russia-ukraine") return "russia-ukraine";
  if (entityId === "korea") return "korea";
  if (entityId === "taiwan" || entityId === "china-taiwan") return "china-taiwan";
  if (entityId === "middle-east") return "middle-east";
  return null;
}

function flyForEntity(entityId: string): { lat: number; lng: number; altitude: number } | null {
  if (ENTITY_FLY[entityId]) return ENTITY_FLY[entityId]!;
  if (Object.prototype.hasOwnProperty.call(THEATER_FLY_TO, entityId)) {
    return THEATER_FLY_TO[entityId as NewsTheater];
  }
  return null;
}

function patchForHotEntry(entry: DailyRankEntry): HotTheaterLayerPatch {
  if (entry.kind === "chokepoint") {
    if (RED_SEA_CHOKE_IDS.has(entry.entityId)) {
      return { ...RED_SEA_HOUTHI_STACK };
    }
    return {
      ...MARITIME_BASE_STACK,
      showFirmsFires: true,
      showGdeltWar: true,
      showGdeltDiplomatic: true,
    };
  }

  const concept = theaterToConcept(entry.entityId);
  if (concept) {
    return { ...conceptLayersForConflict(concept) };
  }
  return {
    showWarZones: true,
    showGdeltWar: true,
    showGdeltDiplomatic: true,
    showMilitaryActivity: true,
  };
}

/**
 * daily-ranks 응답 → 그 순간 가장 핫한 1곳.
 * 전장 TOP vs 초크 TOP을 score로 비교. 데이터 없으면 null (가짜 홍해 폴백 없음).
 */
export function resolveHotTheaterFocus(
  ranks: Pick<DailyRanksPayload, "theater" | "chokepoint">,
): HotTheaterFocus | null {
  const theaters = ranks.theater ?? [];
  const chokepoints = ranks.chokepoint ?? [];
  const topTheater = theaters[0] ?? null;
  const topChoke = chokepoints[0] ?? null;
  if (!topTheater && !topChoke) return null;

  let winner: DailyRankEntry;
  if (topTheater && topChoke) {
    winner = topTheater.score >= topChoke.score ? topTheater : topChoke;
  } else {
    winner = (topTheater ?? topChoke)!;
  }

  const theaterId = winner.kind === "theater" ? winner.entityId : topTheater?.entityId ?? null;
  const chokeId = winner.kind === "chokepoint" ? winner.entityId : null;

  return {
    theaterId,
    chokeId,
    patch: patchForHotEntry(winner),
    fly: flyForEntity(winner.entityId),
    labelKo: winner.labelKo,
    labelEn: winner.labelEn,
  };
}

/** 세션당 1회 — 같은 탭에서 레이어를 반복 덮지 않음 */
export const HOT_THEATER_SESSION_KEY = "geowatch-hot-theater-applied-v1";

export function hotTheaterSessionConsumed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(HOT_THEATER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHotTheaterSessionApplied(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HOT_THEATER_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
