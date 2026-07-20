import type { LayerPrefs } from "@/lib/layerPrefs";
import type { RegionBBox } from "@/data/navRegions";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";

export type BattlefieldZone = "ukraine" | "taiwan" | "korea" | "middle-east";

function allShowOff(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean" && key !== "labelLanguage") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

function patch(base: LayerPrefs, on: Partial<LayerPrefs>): LayerPrefs {
  const next = { ...allShowOff(base), ...on, labelLanguage: base.labelLanguage };
  return clampPrefsToActiveCap(next, false);
}

/**
 * 전장별 기본 레이어 프리셋.
 * ExplorationTabs / viewport soft-apply에서 사용.
 */
export function applyBattlefieldPreset(
  zone: BattlefieldZone,
  current: LayerPrefs,
): LayerPrefs {
  switch (zone) {
    case "ukraine":
      return patch(current, {
        showUkraineControl: true,
        showNeptun: true,
        showNeptunPreviousTrails: false,
        showWarZones: true,
        showGdeltWar: true,
        showGdeltDiplomatic: true,
        showTelegramOsint: true,
        showMilitaryActivity: false,
        showAis: false,
      });
    case "taiwan":
      return patch(current, {
        showMilitaryActivity: true,
        showAis: true,
        showShippingLanes: true,
        showLogisticsRisk: true,
        showSubmarineCables: true,
        showOilPipelines: true,
        showGasPipelines: true,
        showResources: true,
        showGemOilGasExtraction: true,
        showGdeltWar: true,
        showGdeltDiplomatic: true,
        // 주요전장 이동 뒤에도 전쟁구역 빨간 빗금은 기본 유지
        showWarZones: true,
        showUkraineControl: false,
        showNeptun: false,
      });
    case "middle-east":
      return patch(current, {
        // 호르무즈·홍해 등 위험 항로 — AIS·ADS-B(군용) 필수
        showLogisticsRisk: true,
        showShippingLanes: true,
        showOilPipelines: true,
        showGasPipelines: true,
        showFirmsFires: true,
        showAis: true,
        showMilitaryActivity: true,
        showGdeltWar: true,
        showGdeltDiplomatic: true,
        showWarZones: true,
        showUkraineControl: false,
        showNeptun: false,
      });
    case "korea":
      return patch(current, {
        showMilitaryActivity: true,
        showMilitaryBases: true,
        showAis: true,
        showGdeltWar: true,
        showGdeltDiplomatic: true,
        showWarZones: true,
        showDiplomaticTension: true,
        showUkraineControl: false,
        showNeptun: false,
      });
    default:
      return current;
  }
}

export function battlefieldZoneFromExplorationId(id: string): BattlefieldZone | null {
  if (id === "ukraine" || id === "taiwan" || id === "korea" || id === "middle-east") {
    return id;
  }
  return null;
}

/** 뷰포트 중심이 전장 bbox 안에 있으면 해당 zone */
export const BATTLEFIELD_BBOXES: Record<BattlefieldZone, RegionBBox> = {
  ukraine: { minLat: 44.0, maxLat: 53.5, minLng: 22.0, maxLng: 41.0 },
  taiwan: { minLat: 18.0, maxLat: 28.0, minLng: 116.0, maxLng: 130.0 },
  korea: { minLat: 30.0, maxLat: 43.5, minLng: 122.0, maxLng: 136.0 },
  "middle-east": { minLat: 12.0, maxLat: 42.0, minLng: 30.0, maxLng: 65.0 },
};

export function detectBattlefieldZone(
  lat: number,
  lng: number,
  altitude: number,
): BattlefieldZone | null {
  // 전역 고도에서는 auto soft-apply 하지 않음
  if (altitude > 1.9) return null;
  for (const zone of ["ukraine", "taiwan", "korea", "middle-east"] as const) {
    const box = BATTLEFIELD_BBOXES[zone];
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      return zone;
    }
  }
  return null;
}

export const THEATER_COACHMARK_KEY = "geowatch-theater-coach-v1";

export function readTheaterCoachmarkDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(THEATER_COACHMARK_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTheaterCoachmarkDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEATER_COACHMARK_KEY, "1");
  } catch {
    /* ignore */
  }
}
