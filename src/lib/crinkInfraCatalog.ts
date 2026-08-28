import type { LayerPrefs } from "@/lib/layerPrefs";
import type { CrinkInfraCategory } from "@/lib/crinkInfraLayers";

export type CrinkInfraLayerDef = {
  id: CrinkInfraCategory;
  prefKey: keyof LayerPrefs;
  labelKo: string;
  labelEn: string;
  accent: "amber" | "cyan" | "yellow" | "blue" | "orange" | "red";
};

export const CRINK_INFRA_LAYERS: CrinkInfraLayerDef[] = [
  {
    id: "power",
    prefKey: "showCrinkInfraPower",
    labelKo: "변전소·발전소",
    labelEn: "Substations & plants",
    accent: "amber",
  },
  {
    id: "border",
    prefKey: "showCrinkInfraBorder",
    labelKo: "국경 검문소",
    labelEn: "Border crossings",
    accent: "yellow",
  },
  {
    id: "dam",
    prefKey: "showCrinkInfraDams",
    labelKo: "댐·저수지",
    labelEn: "Dams",
    accent: "blue",
  },
  {
    id: "aeroway",
    prefKey: "showCrinkInfraAeroway",
    labelKo: "활주로·공항",
    labelEn: "Airfields",
    accent: "cyan",
  },
  {
    id: "harbour",
    prefKey: "showCrinkInfraHarbour",
    labelKo: "항만 경계",
    labelEn: "Harbours",
    accent: "cyan",
  },
  {
    id: "checkpoint",
    prefKey: "showCrinkInfraCheckpoint",
    labelKo: "군사 검문소",
    labelEn: "Military checkpoints",
    accent: "red",
  },
  {
    id: "rail",
    prefKey: "showCrinkInfraRail",
    labelKo: "주요 교역로 철도",
    labelEn: "Major corridor rail",
    accent: "amber",
  },
  {
    id: "road",
    prefKey: "showCrinkInfraRoad",
    labelKo: "주요 교역로 도로",
    labelEn: "Major corridor roads",
    accent: "yellow",
  },
];

export const CRINK_INFRA_PREF_PATCH = Object.fromEntries(
  CRINK_INFRA_LAYERS.map((l) => [l.prefKey, true]),
) as Partial<LayerPrefs>;

export function isAnyCrinkInfraEnabled(prefs: LayerPrefs): boolean {
  return CRINK_INFRA_LAYERS.some((l) => Boolean(prefs[l.prefKey]));
}
