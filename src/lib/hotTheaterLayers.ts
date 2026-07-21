/**
 * 오늘 핫한 전장·초크 → 유저가 바로 봐야 할 뉴스/전황 레이어 패치.
 * daily-ranks TOP을 읽어 conceptLayers 스택에 얹는다.
 *
 * 후티(홍해) 전용 공습경보 API는 아직 없음.
 * 1차: bab-el-mandeb / red-sea 핫이면 항로·초크·FIRMS·GDELT·NewFeeds를 켠다.
 * 2차(추후): UKMTO·CENTCOM 해상경보 → Tzeva/NEPTUN처럼 airRaidIngest 복제.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import type { DailyRankEntry, DailyRanksPayload } from "@/lib/dailyRanks";
import { conceptLayersForConflict } from "@/lib/conceptLayers";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";

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
  "choke-hormuz": { lat: 26.58, lng: 56.25, altitude: 0.72 },
  "choke-suez": { lat: 31.25, lng: 32.34, altitude: 0.85 },
  "choke-bab-el-mandeb": { lat: 12.61, lng: 43.35, altitude: 0.8 },
};

/** 홍해·후티 회랑 — 공식 경보 전 MVP 레이어 */
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
};

const RED_SEA_CHOKE_IDS = new Set([
  "choke-bab-el-mandeb",
  "choke-suez",
  "choke-hormuz",
]);

function theaterToConcept(
  entityId: string,
): "russia-ukraine" | "korea" | "china-taiwan" | "middle-east" | null {
  if (entityId === "ukraine") return "russia-ukraine";
  if (entityId === "korea") return "korea";
  if (entityId === "taiwan") return "china-taiwan";
  if (entityId === "middle-east") return "middle-east";
  return null;
}

function isRedSeaHot(chokepoints: DailyRankEntry[]): boolean {
  return chokepoints.some(
    (c) => RED_SEA_CHOKE_IDS.has(c.entityId) && c.rank <= 3,
  );
}

function pickFly(
  theaterId: string | null,
  chokeId: string | null,
  redSeaChokeHot: boolean,
): { lat: number; lng: number; altitude: number } | null {
  // 홍해 초크가 실제로 뜨거울 때만 바브엘만데브 우선
  if (redSeaChokeHot && chokeId === "choke-bab-el-mandeb") {
    return ENTITY_FLY["choke-bab-el-mandeb"] ?? null;
  }
  if (redSeaChokeHot && chokeId && ENTITY_FLY[chokeId]) {
    return ENTITY_FLY[chokeId];
  }
  if (chokeId === "choke-hormuz") return ENTITY_FLY["choke-hormuz"];
  if (theaterId && ENTITY_FLY[theaterId]) return ENTITY_FLY[theaterId];
  if (chokeId && ENTITY_FLY[chokeId]) return ENTITY_FLY[chokeId];
  return null;
}

/**
 * daily-ranks 응답 → ON-only 레이어 패치 + 카메라 후보.
 * OFF는 건드리지 않음(유저가 켠 다른 레이어 유지).
 */
export function resolveHotTheaterFocus(
  ranks: Pick<DailyRanksPayload, "theater" | "chokepoint">,
): HotTheaterFocus | null {
  const theaters = ranks.theater ?? [];
  const chokepoints = ranks.chokepoint ?? [];
  const topTheater = theaters[0] ?? null;
  const topChoke = chokepoints[0] ?? null;
  if (!topTheater && !topChoke) return null;

  const theaterId = topTheater?.entityId ?? null;
  const chokeId = topChoke?.entityId ?? null;
  const redSeaChokeHot = isRedSeaHot(chokepoints);
  const middleEastHot = theaterId === "middle-east";

  let patch: HotTheaterLayerPatch = {};
  const concept = theaterId ? theaterToConcept(theaterId) : null;
  if (concept) {
    patch = { ...conceptLayersForConflict(concept) };
  } else {
    patch = {
      showWarZones: true,
      showGdeltWar: true,
      showGdeltDiplomatic: true,
    };
  }

  // 홍해·후티 회랑(초크 TOP3) 또는 중동 전장 1위 → 항로·FIRMS·NewFeeds 보강
  if (redSeaChokeHot || middleEastHot) {
    patch = { ...patch, ...RED_SEA_HOUTHI_STACK };
  }

  if (chokeId === "choke-hormuz" || middleEastHot) {
    patch = { ...patch, showNewfeedsIranAttacks: true, showFirmsFires: true };
  }

  const labelKo =
    redSeaChokeHot && middleEastHot
      ? "중동·홍해 핫존"
      : topTheater?.labelKo || topChoke?.labelKo || "핫 전장";
  const labelEn =
    redSeaChokeHot && middleEastHot
      ? "Middle East · Red Sea hot zone"
      : topTheater?.labelEn || topChoke?.labelEn || "Hot theater";

  return {
    theaterId,
    chokeId,
    patch,
    fly: pickFly(theaterId, chokeId, redSeaChokeHot),
    labelKo,
    labelEn,
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
