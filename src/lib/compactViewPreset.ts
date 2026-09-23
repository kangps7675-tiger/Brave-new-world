import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
import { stripLegacyConflictPrefs } from "@/lib/conflictEvents/flags";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  FIRST_SCREEN_CONFLICT_ON,
  FIRST_SCREEN_ECONOMY_ON,
} from "@/lib/firstScreenLayers";

export type CompactConflictChipId = "frontline" | "news" | "alert";
export type CompactEconomyChipId = "lanes" | "energy" | "market";
export type CompactChipId = CompactConflictChipId | CompactEconomyChipId;

export type CompactChipDef = {
  id: CompactChipId;
  labelKo: string;
  labelEn: string;
  layers: Partial<LayerPrefs>;
};

/** 지정학 Compact — Ultra-Lite 캡 3개 이내 */
export const COMPACT_CONFLICT_PRESETS: CompactChipDef[] = [
  {
    id: "frontline",
    labelKo: "폴리곤",
    labelEn: "Polygons",
    layers: { ...FIRST_SCREEN_CONFLICT_ON },
  },
  {
    id: "news",
    labelKo: "뉴스",
    labelEn: "News",
    layers: {
      showUkraineControl: true,
      showWarZones: true,
      showGdeltWar: true,
      showTelegramOsint: true,
      showConflictEvents: true,
    },
  },
  {
    id: "alert",
    labelKo: "공습",
    labelEn: "Alerts",
    layers: {
      showNeptun: true,
      showTzevaAdom: true,
      showGdeltWar: true,
      showConflictEvents: true,
    },
  },
];

/** 지경학 Compact — Ultra-Lite 캡 3개 이내 */
export const COMPACT_ECONOMY_PRESETS: CompactChipDef[] = [
  {
    id: "lanes",
    labelKo: "진영",
    labelEn: "Blocs",
    layers: { ...FIRST_SCREEN_ECONOMY_ON },
  },
  {
    id: "energy",
    labelKo: "에너지",
    labelEn: "Energy",
    layers: {
      showGasPipelines: true,
      showLngTerminals: true,
      showResources: true,
      showConflictEvents: true,
    },
  },
  {
    id: "market",
    labelKo: "시장",
    labelEn: "Market",
    layers: {
      showSanctionsEntities: true,
      showEconomicCenters: true,
      showAiDataCenters: true,
      showConflictEvents: true,
    },
  },
];

export function compactPresetsForMode(mode: ViewerMode): CompactChipDef[] {
  if (mode === "satellite" || mode === "live") return [];
  return mode === "economy" ? COMPACT_ECONOMY_PRESETS : COMPACT_CONFLICT_PRESETS;
}

export function defaultCompactChipId(mode: ViewerMode): CompactChipId {
  if (mode === "satellite" || mode === "live") return "frontline";
  // 경제·물류 진입 시 진영 폴리곤(lanes 칩 = FIRST_SCREEN) 기본
  return mode === "economy" ? "lanes" : "frontline";
}

function allLayersOff(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

/**
 * Compact 프리셋 prefs.
 * Ultra-Lite force-off 적용 후 칩 레이어를 다시 ON → 캡 3으로 clamp.
 * labelLanguage는 현재 값 유지.
 */
export function buildCompactPrefs(
  mode: ViewerMode,
  chipId: CompactChipId,
  current?: Pick<LayerPrefs, "labelLanguage">,
): LayerPrefs {
  const presets = compactPresetsForMode(mode);
  // satellite·live 모드는 compactPresetsForMode()가 의도적으로 빈 배열을 반환한다
  // (칩 프리셋이 없는 모드) — 그 경우 chip은 undefined이므로 spread 전 반드시 가드한다.
  const chip = presets.find((p) => p.id === chipId) ?? presets[0];
  const labelLanguage = current?.labelLanguage ?? DEFAULT_LAYER_PREFS.labelLanguage;

  let next = allLayersOff({ ...DEFAULT_LAYER_PREFS, labelLanguage });
  next = applyUltraLiteToLayerPrefs(next);
  next = { ...next, ...(chip?.layers ?? {}), labelLanguage };
  return clampPrefsToActiveCap(stripLegacyConflictPrefs(next), true);
}
