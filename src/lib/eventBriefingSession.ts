import type { LayerPrefs } from "@/lib/layerPrefs";
import { conceptLayersForConflictNavId } from "@/lib/conceptLayers";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";

type BooleanLayerKey = {
  [K in keyof LayerPrefs]: LayerPrefs[K] extends boolean ? K : never;
}[keyof LayerPrefs];

export type LayerPatch = Partial<Record<BooleanLayerKey, boolean>>;

export type LiveBriefingKind = "air-raid" | "hub" | "theater" | "economy";

export type LiveBriefingSession = {
  kind: LiveBriefingKind;
  /** 중계 시작 전 prefs 스냅샷 — 종료 시 복원 */
  snapshot: LayerPrefs;
  labelKo: string;
  labelEn: string;
};

/** 공습·경보 종류별 중계용 레이어 */
export function airRaidBriefingLayers(kind: AirRaidSirenKind): LayerPatch {
  if (kind === "tzeva") {
    return {
      showTzevaAdom: true,
      showWarZones: true,
      showDiplomaticTension: true,
      showGdeltWar: true,
      showMilitaryActivity: true,
      showUsCarriers: true,
    };
  }
  if (kind === "neptun") {
    return {
      showNeptun: true,
      showUkraineControl: true,
      showWarZones: true,
      showTelegramOsint: true,
      showGdeltWar: true,
      showMilitaryActivity: true,
    };
  }
  // newfeeds · 이란·중동
  return {
    showNewfeedsIranAttacks: true,
    showWarZones: true,
    showFirmsFires: true,
    showLogisticsRisk: true,
    showGdeltWar: true,
    showMilitaryActivity: true,
    showUsCarriers: true,
  };
}

export function hubBriefingLayers(navId: string): LayerPatch {
  return conceptLayersForConflictNavId(navId);
}

export function applyLayerPatch(prefs: LayerPrefs, patch: LayerPatch): LayerPrefs {
  return { ...prefs, ...patch };
}

export function liveBriefingLabel(
  kind: LiveBriefingKind,
  place: string,
): { ko: string; en: string } {
  if (kind === "air-raid") {
    return {
      ko: `공습 중계 · ${place}`,
      en: `Air-raid desk · ${place}`,
    };
  }
  if (kind === "hub" || kind === "theater") {
    return {
      ko: `전장 중계 · ${place}`,
      en: `Theater desk · ${place}`,
    };
  }
  return {
    ko: `시장 중계 · ${place}`,
    en: `Market desk · ${place}`,
  };
}
