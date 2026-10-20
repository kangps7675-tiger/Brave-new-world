/**
 * GEM 자원 레이어 카탈로그 — 빌드 스크립트·UI·viewport API가 공유.
 * (scripts에서도 require 가능하도록 CJS 호환 객체 + TS re-export)
 */
export type GemResourceLayerId =
  | "gem-coal-plants"
  | "gem-coal-mines"
  | "gem-coal-terminals"
  | "gem-nuclear"
  | "gem-solar"
  | "gem-wind"
  | "gem-hydro"
  | "gem-geothermal"
  | "gem-bioenergy"
  | "gem-oil-gas-plants"
  | "gem-oil-gas-extraction"
  | "gem-iron-ore"
  | "gem-cement"
  | "gem-steel"
  | "gem-chemicals";

export type GemResourcePrefKey =
  | "showGemCoalPlants"
  | "showGemCoalMines"
  | "showGemCoalTerminals"
  | "showGemNuclear"
  | "showGemSolar"
  | "showGemWind"
  | "showGemHydro"
  | "showGemGeothermal"
  | "showGemBioenergy"
  | "showGemOilGasPlants"
  | "showGemOilGasExtraction"
  | "showGemIronOre"
  | "showGemCement"
  | "showGemSteel"
  | "showGemChemicals";

export type GemResourceKind =
  | "gem-coal-plant"
  | "gem-coal-mine"
  | "gem-coal-terminal"
  | "gem-nuclear"
  | "gem-solar"
  | "gem-wind"
  | "gem-hydro"
  | "gem-geothermal"
  | "gem-bioenergy"
  | "gem-oil-gas-plant"
  | "gem-oil-gas-extraction"
  | "gem-iron-ore"
  | "gem-cement"
  | "gem-steel"
  | "gem-chemical";

export type GemResourceLayerDef = {
  id: GemResourceLayerId;
  prefKey: GemResourcePrefKey;
  kind: GemResourceKind;
  file: string;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
};

export const GEM_RESOURCE_LAYERS: readonly GemResourceLayerDef[] = [
  {
    id: "gem-coal-plants",
    prefKey: "showGemCoalPlants",
    kind: "gem-coal-plant",
    file: "gem-coal-plants.json",
    labelKo: "석탄 발전소",
    labelEn: "Coal plants",
    descriptionKo: "켜면 GEM 석탄 발전 유닛을 표시합니다.",
  },
  {
    id: "gem-coal-mines",
    prefKey: "showGemCoalMines",
    kind: "gem-coal-mine",
    file: "gem-coal-mines.json",
    labelKo: "석탄 광산",
    labelEn: "Coal mines",
    descriptionKo: "켜면 GEM 가동·개발 중 석탄 광산을 표시합니다.",
  },
  {
    id: "gem-coal-terminals",
    prefKey: "showGemCoalTerminals",
    kind: "gem-coal-terminal",
    file: "gem-coal-terminals.json",
    labelKo: "석탄 터미널",
    labelEn: "Coal terminals",
    descriptionKo: "켜면 GEM 석탄 터미널을 표시합니다.",
  },
  {
    id: "gem-nuclear",
    prefKey: "showGemNuclear",
    kind: "gem-nuclear",
    file: "gem-nuclear.json",
    labelKo: "원자력 발전",
    labelEn: "Nuclear power",
    descriptionKo: "켜면 GEM 원자력 발전 유닛을 표시합니다.",
  },
  {
    id: "gem-solar",
    prefKey: "showGemSolar",
    kind: "gem-solar",
    file: "gem-solar.json",
    labelKo: "태양광 발전",
    labelEn: "Solar",
    descriptionKo: "켜면 GEM 유틸리티급 태양광을 표시합니다.",
  },
  {
    id: "gem-wind",
    prefKey: "showGemWind",
    kind: "gem-wind",
    file: "gem-wind.json",
    labelKo: "풍력 발전",
    labelEn: "Wind",
    descriptionKo: "켜면 GEM 풍력 단지를 표시합니다.",
  },
  {
    id: "gem-hydro",
    prefKey: "showGemHydro",
    kind: "gem-hydro",
    file: "gem-hydro.json",
    labelKo: "수력 발전",
    labelEn: "Hydro",
    descriptionKo: "켜면 GEM 수력 발전을 표시합니다.",
  },
  {
    id: "gem-geothermal",
    prefKey: "showGemGeothermal",
    kind: "gem-geothermal",
    file: "gem-geothermal.json",
    labelKo: "지열 발전",
    labelEn: "Geothermal",
    descriptionKo: "켜면 GEM 지열 발전을 표시합니다.",
  },
  {
    id: "gem-bioenergy",
    prefKey: "showGemBioenergy",
    kind: "gem-bioenergy",
    file: "gem-bioenergy.json",
    labelKo: "바이오에너지",
    labelEn: "Bioenergy",
    descriptionKo: "켜면 GEM 바이오에너지 발전을 표시합니다.",
  },
  {
    id: "gem-oil-gas-plants",
    prefKey: "showGemOilGasPlants",
    kind: "gem-oil-gas-plant",
    file: "gem-oil-gas-plants.json",
    labelKo: "석유·가스 화력",
    labelEn: "Oil & gas plants",
    descriptionKo: "켜면 GEM 오일·가스 화력 발전을 표시합니다.",
  },
  {
    id: "gem-oil-gas-extraction",
    prefKey: "showGemOilGasExtraction",
    kind: "gem-oil-gas-extraction",
    file: "gem-oil-gas-extraction.json",
    labelKo: "석유·가스 채굴",
    labelEn: "Oil & gas extraction",
    descriptionKo: "켜면 GEM 오일·가스 채굴 필드를 표시합니다.",
  },
  {
    id: "gem-iron-ore",
    prefKey: "showGemIronOre",
    kind: "gem-iron-ore",
    file: "gem-iron-ore.json",
    labelKo: "철광산",
    labelEn: "Iron ore mines",
    descriptionKo: "켜면 GEM 철광산을 표시합니다.",
  },
  {
    id: "gem-cement",
    prefKey: "showGemCement",
    kind: "gem-cement",
    file: "gem-cement.json",
    labelKo: "시멘트 공장",
    labelEn: "Cement",
    descriptionKo: "켜면 GEM 시멘트·콘크리트 플랜트를 표시합니다.",
  },
  {
    id: "gem-steel",
    prefKey: "showGemSteel",
    kind: "gem-steel",
    file: "gem-steel.json",
    labelKo: "철강 공장",
    labelEn: "Steel",
    descriptionKo: "켜면 GEM 철강 플랜트를 표시합니다.",
  },
  {
    id: "gem-chemicals",
    prefKey: "showGemChemicals",
    kind: "gem-chemical",
    file: "gem-chemicals.json",
    labelKo: "화학 공장",
    labelEn: "Chemicals",
    descriptionKo: "켜면 GEM 화학 플랜트를 표시합니다.",
  },
] as const;

export const GEM_RESOURCE_PREF_KEYS = GEM_RESOURCE_LAYERS.map((l) => l.prefKey);

/** UI 드롭다운 그룹 — 종류별 묶음 */
export const GEM_RESOURCE_GROUPS = [
  {
    id: "gem-group-coal",
    labelKo: "석탄 (발전·광산·터미널)",
    labelEn: "Coal",
    layerIds: ["gem-coal-plants", "gem-coal-mines", "gem-coal-terminals"] as const,
  },
  {
    id: "gem-group-power",
    labelKo: "원자력·재생에너지",
    labelEn: "Nuclear & renewables",
    layerIds: [
      "gem-nuclear",
      "gem-solar",
      "gem-wind",
      "gem-hydro",
      "gem-geothermal",
      "gem-bioenergy",
    ] as const,
  },
  {
    id: "gem-group-oil-gas",
    labelKo: "석유·가스 발전·채굴",
    labelEn: "Oil & gas power / extraction",
    layerIds: ["gem-oil-gas-plants", "gem-oil-gas-extraction"] as const,
  },
  {
    id: "gem-group-industry",
    labelKo: "철강·시멘트·화학",
    labelEn: "Steel, cement, chemicals",
    layerIds: ["gem-iron-ore", "gem-cement", "gem-steel", "gem-chemicals"] as const,
  },
] as const;

export function gemLayerById(id: string): GemResourceLayerDef | undefined {
  return GEM_RESOURCE_LAYERS.find((l) => l.id === id);
}
