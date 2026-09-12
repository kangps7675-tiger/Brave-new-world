/**
 * 장면 모드 — 전역 미니멀 뷰에서 명시적으로 고르는 fly + 레이어 패치.
 * HotTheater 배너를 대체하는 SSOT.
 */

import type { LayerPrefs } from "@/lib/layerPrefs";
import {
  CONFLICT_ENTRY_MARITIME_FLY,
  RED_SEA_HOUTHI_STACK,
  type HotTheaterFocus,
  type HotTheaterLayerPatch,
} from "@/lib/hotTheaterLayers";
import type { ViewerMode } from "@/lib/viewPackages";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export type SceneMissionId = "frontline" | "maritime" | "energy" | "stay-global";

export type SceneMissionFly = { lat: number; lng: number; altitude: number };

export type SceneMissionApply = {
  id: SceneMissionId;
  viewerMode: ViewerMode | null;
  patch: HotTheaterLayerPatch;
  fly: SceneMissionFly | null;
};

export const ENERGY_AXIS_PATCH: HotTheaterLayerPatch = {
  showGasPipelines: true,
  showLngTerminals: true,
  showShippingLanes: true,
  showLogisticsRisk: true,
  showPorts: true,
  showStrategicCorridors: true,
  showResources: true,
  showNewfeedsIranAttacks: true,
};

export const ENERGY_AXIS_FLY: SceneMissionFly = {
  lat: 26.58,
  lng: 56.25,
  altitude: 1.05,
};

export const MARITIME_ARTERY_PATCH: HotTheaterLayerPatch = {
  ...RED_SEA_HOUTHI_STACK,
};

export const MARITIME_ARTERY_FLY: SceneMissionFly = CONFLICT_ENTRY_MARITIME_FLY;

/** 전선 장면 — 우크라·이란 + 드론/미사일/폭발 실시간 (핫존 패치와 합침) */
export const FRONTLINE_LIVE_STACK: HotTheaterLayerPatch = {
  showUkraineControl: true,
  showWarZones: true,
  showNeptun: true,
  showTzevaAdom: true,
  showNewfeedsIranAttacks: true,
  showGdeltWar: true,
  showFirmsFires: true,
  showMilitaryActivity: true,
};

const FRONTLINE_DEFAULT_FLY: SceneMissionFly = {
  lat: 48.5,
  lng: 37.5,
  altitude: 1.35,
};

export function buildFrontlineMission(hot: HotTheaterFocus | null): SceneMissionApply {
  if (hot) {
    return {
      id: "frontline",
      viewerMode: "conflict",
      patch: { ...FRONTLINE_LIVE_STACK, ...hot.patch },
      fly: hot.fly ?? FRONTLINE_DEFAULT_FLY,
    };
  }
  return {
    id: "frontline",
    viewerMode: "conflict",
    patch: { ...FRONTLINE_LIVE_STACK },
    fly: FRONTLINE_DEFAULT_FLY,
  };
}

export function buildMaritimeMission(): SceneMissionApply {
  return {
    id: "maritime",
    viewerMode: "conflict",
    patch: MARITIME_ARTERY_PATCH,
    fly: MARITIME_ARTERY_FLY,
  };
}

export function buildEnergyMission(): SceneMissionApply {
  return {
    id: "energy",
    viewerMode: "economy",
    patch: ENERGY_AXIS_PATCH,
    fly: ENERGY_AXIS_FLY,
  };
}

export function buildStayGlobalMission(): SceneMissionApply {
  return {
    id: "stay-global",
    viewerMode: null,
    patch: {},
    fly: null,
  };
}

export function sceneMissionApply(
  id: SceneMissionId,
  hot: HotTheaterFocus | null,
): SceneMissionApply {
  switch (id) {
    case "frontline":
      return buildFrontlineMission(hot);
    case "maritime":
      return buildMaritimeMission();
    case "energy":
      return buildEnergyMission();
    case "stay-global":
      return buildStayGlobalMission();
  }
}

/** 장면 적용 후 soft-zone 힌트 (전장 포커스용) */
export function softZoneForMission(
  apply: SceneMissionApply,
  hot: HotTheaterFocus | null,
): "middle-east" | "ukraine" | "taiwan" | "korea" | null {
  if (apply.id === "maritime" || apply.id === "energy") return "middle-east";
  if (apply.id !== "frontline" || !hot) {
    if (apply.id === "frontline") return "ukraine";
    return null;
  }
  if (
    hot.theaterId === "middle-east" ||
    hot.chokeId === "choke-bab-el-mandeb" ||
    hot.chokeId === "choke-hormuz" ||
    hot.chokeId === "choke-suez"
  ) {
    return "middle-east";
  }
  if (hot.theaterId === "ukraine" || hot.theaterId === "russia-ukraine") return "ukraine";
  if (hot.theaterId === "taiwan" || hot.theaterId === "china-taiwan") return "taiwan";
  if (hot.theaterId === "korea") return "korea";
  return null;
}

export type SceneMissionCardMeta = {
  id: SceneMissionId;
  titleKo: string;
  titleEn: string;
  hintKo: string;
  hintEn: string;
};

export const SCENE_MISSION_CARDS: readonly SceneMissionCardMeta[] = [
  {
    id: "frontline",
    titleKo: "오늘의 전선",
    titleEn: "Today's frontline",
    hintKo: "우크라·이란 축 · 드론·미사일·폭발 실시간",
    hintEn: "Ukraine–Iran axis · live drones, missiles, blasts",
  },
  {
    id: "maritime",
    titleKo: "해상 동맥",
    titleEn: "Maritime artery",
    hintKo: "홍해·초크포인트 항로와 리스크",
    hintEn: "Red Sea lanes, chokepoints, and risk",
  },
  {
    id: "energy",
    titleKo: "에너지 축",
    titleEn: "Energy axis",
    hintKo: "가스·LNG·호르무즈 에너지 회랑",
    hintEn: "Gas, LNG, and the Hormuz energy corridor",
  },
  {
    id: "stay-global",
    titleKo: "전역 유지",
    titleEn: "Stay global",
    hintKo: "지구 실루엣에서 직접 탐색합니다",
    hintEn: "Keep the full-Earth view and explore freely",
  },
] as const;

export function asLayerPatch(
  patch: HotTheaterLayerPatch,
): Partial<Record<BooleanLayerKey, boolean>> {
  return patch;
}
