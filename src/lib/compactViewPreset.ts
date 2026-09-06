import {
  DEFAULT_LAYER_PREFS,
  type LayerPrefs,
} from "@/lib/layerPrefs";
import { clampPrefsToActiveCap } from "@/lib/layerExclusiveCap";
import { applyUltraLiteToLayerPrefs } from "@/lib/ultraLiteMode";
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
    labelKo: "전선",
    labelEn: "Front",
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
      showNewfeedsIranAttacks: true,
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
      showNewfeedsIranAttacks: true,
    },
  },
];

/** 지경학 Compact — Ultra-Lite 캡 3개 이내 */
export const COMPACT_ECONOMY_PRESETS: CompactChipDef[] = [
  {
    id: "lanes",
    labelKo: "항로",
    labelEn: "Lanes",
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
      showNewfeedsIranAttacks: true,
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
      showNewfeedsIranAttacks: true,
    },
  },
];

export function compactPresetsForMode(mode: ViewerMode): CompactChipDef[] {
  return mode === "economy" ? COMPACT_ECONOMY_PRESETS : COMPACT_CONFLICT_PRESETS;
}

export function defaultCompactChipId(mode: ViewerMode): CompactChipId {
  // 지경학 진입 시 매장지·가스관·LNG가 바로 보이도록 energy 기본
  return mode === "economy" ? "energy" : "frontline";
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
  const chip = presets.find((p) => p.id === chipId) ?? presets[0];
  const labelLanguage = current?.labelLanguage ?? DEFAULT_LAYER_PREFS.labelLanguage;

  let next = allLayersOff({ ...DEFAULT_LAYER_PREFS, labelLanguage });
  next = applyUltraLiteToLayerPrefs(next);
  next = { ...next, ...chip.layers, labelLanguage };
  return clampPrefsToActiveCap(next, true);
}
