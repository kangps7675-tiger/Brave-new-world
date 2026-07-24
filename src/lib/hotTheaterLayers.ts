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
  showNavareaWarnings: true,
};

/**
 * 2026 기준 지정학 입구 최우선 해상 위협:
 * 호르무즈 위기 이후 홍해·바브엘만데브가 가장 위태로운 항로.
 */
export const CONFLICT_ENTRY_MARITIME_FLY = ENTITY_FLY["choke-bab-el-mandeb"]!;

const RED_SEA_CHOKE_IDS = new Set([
  "choke-bab-el-mandeb",
  "choke-suez",
  "choke-hormuz",
]);

const MARITIME_CHOKE_PRIORITY = [
  "choke-bab-el-mandeb",
  "choke-hormuz",
  "choke-suez",
] as const;

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

function pickPriorityMaritimeChoke(
  chokepoints: DailyRankEntry[],
): string | null {
  for (const id of MARITIME_CHOKE_PRIORITY) {
    if (chokepoints.some((c) => c.entityId === id && c.rank <= 5)) return id;
  }
  const top = chokepoints[0];
  if (top && RED_SEA_CHOKE_IDS.has(top.entityId)) return top.entityId;
  return null;
}

function pickFly(
  priorityMaritimeId: string | null,
): { lat: number; lng: number; altitude: number } {
  // 지정학 입구: 대만·우크라 전장보다 해상 초크를 항상 먼저
  if (priorityMaritimeId && ENTITY_FLY[priorityMaritimeId]) {
    return ENTITY_FLY[priorityMaritimeId];
  }
  return CONFLICT_ENTRY_MARITIME_FLY;
}

/**
 * daily-ranks 응답 → ON-only 레이어 패치 + 카메라 후보.
 * OFF는 건드리지 않음(유저가 켠 다른 레이어 유지).
 * 지정학에서는 홍해·호르무즈 해상 위협을 최우선으로 연다.
 */
export function resolveHotTheaterFocus(
  ranks: Pick<DailyRanksPayload, "theater" | "chokepoint">,
): HotTheaterFocus | null {
  const theaters = ranks.theater ?? [];
  const chokepoints = ranks.chokepoint ?? [];
  const topTheater = theaters[0] ?? null;
  const topChoke = chokepoints[0] ?? null;
  if (!topTheater && !topChoke) {
    // ranks 비어도 지정학 입구용 기본 해상 위협 포커스
    return {
      theaterId: "middle-east",
      chokeId: "choke-bab-el-mandeb",
      patch: { ...RED_SEA_HOUTHI_STACK },
      fly: CONFLICT_ENTRY_MARITIME_FLY,
      labelKo: "홍해·바브엘만데브 해상 위협",
      labelEn: "Red Sea · Bab el-Mandeb maritime threat",
    };
  }

  const theaterId = topTheater?.entityId ?? null;
  const chokeId = topChoke?.entityId ?? null;
  const redSeaChokeHot = isRedSeaHot(chokepoints);
  const middleEastHot = theaterId === "middle-east";
  const priorityMaritimeId = pickPriorityMaritimeChoke(chokepoints);

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

  // 지정학 핫 포커스: 홍해·해상 위협 스택을 항상 먼저 연다
  patch = { ...patch, ...RED_SEA_HOUTHI_STACK };

  if (
    chokeId === "choke-hormuz" ||
    priorityMaritimeId === "choke-hormuz" ||
    middleEastHot
  ) {
    patch = { ...patch, showNewfeedsIranAttacks: true, showFirmsFires: true };
  }

  const flyChokeId = priorityMaritimeId || "choke-bab-el-mandeb";
  const labelKo =
    flyChokeId === "choke-bab-el-mandeb"
      ? "홍해·바브엘만데브 해상 위협"
      : flyChokeId === "choke-hormuz"
        ? "호르무즈 해협 해상 위협"
        : flyChokeId === "choke-suez"
          ? "수에즈·홍해 회랑"
          : redSeaChokeHot && middleEastHot
            ? "중동·홍해 핫존"
            : topTheater?.labelKo || topChoke?.labelKo || "핫 전장";
  const labelEn =
    flyChokeId === "choke-bab-el-mandeb"
      ? "Red Sea · Bab el-Mandeb maritime threat"
      : flyChokeId === "choke-hormuz"
        ? "Strait of Hormuz maritime threat"
        : flyChokeId === "choke-suez"
          ? "Suez · Red Sea corridor"
          : redSeaChokeHot && middleEastHot
            ? "Middle East · Red Sea hot zone"
            : topTheater?.labelEn || topChoke?.labelEn || "Hot theater";

  return {
    theaterId,
    chokeId: flyChokeId,
    patch,
    fly: pickFly(priorityMaritimeId),
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
