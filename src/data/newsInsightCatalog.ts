/**
 * 뉴스 인사이트 — 맵에 올릴 수 있는 레이어/번들 화이트리스트.
 * Claude 하이라이트·mapActions 는 여기 id 만 허용.
 */

import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";
import type { LayerPrefs } from "@/lib/layerPrefs";
import { LAYER_PREF_LABELS } from "@/lib/viewPackages";
import type { ViewerMode } from "@/lib/viewPackages";

export type NewsInsightMode = "conflict" | "economy";

export type NewsInsightCatalogKind =
  | "point"
  | "corridor"
  | "region"
  | "bloc"
  | "bundle";

export type NewsInsightFlyHint = {
  lat: number;
  lng: number;
  altitude: number;
};

export type NewsInsightCatalogEntry = {
  id: string;
  prefKeys: (keyof LayerPrefs)[];
  aliases: string[];
  modes: NewsInsightMode[];
  kind: NewsInsightCatalogKind;
  /** bundle only — catalog layer ids (not pref keys) */
  bundleLayerIds?: string[];
  flyHint?: NewsInsightFlyHint;
  labelKo?: string;
  labelEn?: string;
};

/** conflict에서 제외 (경제 전용 통로·인프라) */
const ECONOMY_ONLY_PREF = new Set<keyof LayerPrefs>([
  "showBriTradeConnectivity",
  "showUsDfcSupplyChain",
  "showStrategicCorridors",
  "showEconomicCenters",
  "showAiDataCenters",
  "showInternetExchanges",
  "showLogisticsStress",
  "showGscpiGauge",
  "showGemCoalPlants",
  "showGemCoalMines",
  "showGemCoalTerminals",
  "showGemNuclear",
  "showGemSolar",
  "showGemWind",
  "showGemHydro",
  "showGemGeothermal",
  "showGemBioenergy",
  "showGemOilGasPlants",
  "showGemOilGasExtraction",
  "showGemIronOre",
  "showGemCement",
  "showGemSteel",
  "showGemChemicals",
]);

/** economy에서 제외 (전장·군용) */
const CONFLICT_ONLY_PREF = new Set<keyof LayerPrefs>([
  "showUkraineControl",
  "showNeptun",
  "showMilitaryBases",
  "showRokMilitaryBases",
  "showJapanMilitaryBases",
  "showTaiwanMilitaryBases",
  "showPhilippinesMilitaryBases",
  "showAustraliaMilitaryBases",
  "showEasternNatoMilitaryBases",
  "showMissileSilos",
  "showStrategicMissileBases",
  "showMissileTestSites",
  "showMissileSiloFields",
  "showMilitaryActivity",
  "showFirmsFires",
  "showTelegramOsint",
  "showTzevaAdom",
  "showNewfeedsIranAttacks",
  "showChinaTaiwanIncidents",
  "showChinaJapanIncidents",
  "showChinaPhilippinesIncidents",
  "showUsChinaIncidents",
  "showNorthKoreaMissileTests",
  "showUkraineStrikesOnRussia",
  "showWeeklyShipMoves",
  "showReefWatch",
  "showEastAsiaAdiz",
  "showIslandChains",
  "showAxisNetwork",
  "showEscalationSignals",
  "showMilitaryExercises",
]);

const EXTRA_ALIASES: Partial<Record<string, string[]>> = {
  shipping: ["shipping lane", "해상 항로", "sea lane", "무역로", "해운"],
  ports: ["port", "항구", "harbour", "harbor", "터미널"],
  "oil-pipelines": ["oil pipeline", "송유관", "crude pipeline", "원유관"],
  "gas-pipelines": ["gas pipeline", "가스관", "천연가스관"],
  "lng-terminals": ["LNG", "액화가스", "lng terminal"],
  "subsea-pipelines": ["해저 파이프", "subsea pipeline"],
  cables: ["submarine cable", "해저케이블", "해저 케이블", "통신케이블"],
  ais: ["AIS", "선박 추적", "vessel tracking", "상선"],
  "disguised-vessels": ["shadow fleet", "그림자 함대", "위장 선박", "dark fleet"],
  "logistics-risk": ["chokepoint", "초크포인트", "해협", "요충지", "협로"],
  "ukmto-incidents": ["UKMTO", "상선 피습", "나포", "Houthi", "후티"],
  "navarea-warnings": ["NAVAREA", "항행경보", "해상 경보"],
  ukraine: ["ukraine", "우크라이나", "donbas", "돈바스", "front line", "전선"],
  neptun: ["missile", "미사일", "drone", "드론", "공습", "air threat"],
  "gdelt-war": ["전투", "교전", "clash", "shelling", "포격", "war"],
  "telegram-osint": ["telegram", "텔레그램", "OSINT"],
  "tzeva-adom": ["Israel", "이스라엘", "rocket", "아이언돔", "가자"],
  "china-taiwan-incidents": ["Taiwan", "대만", "海峡", "해협", "PLA", "대만해협"],
  "nk-missile-tests": ["North Korea", "북한", "ICBM", "미사일 시험"],
  "bri-trade": ["BRI", "일대일로", "Belt and Road", "belt road"],
  "us-dfc-supply": ["DFC", "개발금융", "US DFC"],
  "strategic-corridors": ["corridor", "통로", "물류 회랑", "corridor route"],
  "military-bases": ["base", "기지", "military base", "미군 기지"],
  nuclear: ["nuclear", "핵", "원자력"],
  sanctions: ["sanction", "제재"],
  "submarine-cables": ["해저케이블"],
  firms: ["FIRMS", "화재", "satellite fire", "위성 화재"],
  airports: ["airport", "공항"],
  "island-chains": ["island chain", "도련선", "first island"],
  "axis-network": ["CRINK", "축", "axis"],
  "reef-watch": ["Spratly", "남중국해", "artificial island", "인공섬", "암초"],
};

const KIND_BY_ITEM: Partial<Record<string, NewsInsightCatalogKind>> = {
  shipping: "corridor",
  "oil-pipelines": "corridor",
  "gas-pipelines": "corridor",
  "subsea-pipelines": "corridor",
  cables: "corridor",
  "bri-trade": "corridor",
  "strategic-corridors": "corridor",
  "us-dfc-supply": "region",
  "logistics-risk": "point",
  "critical-nodes": "point",
  ports: "point",
  airports: "point",
  ais: "point",
  "disguised-vessels": "point",
  ukraine: "region",
  "china-taiwan-incidents": "region",
  "island-chains": "bloc",
  "axis-network": "bloc",
  "military-bases": "point",
  "gdelt-war": "point",
  nuclear: "point",
  "lng-terminals": "point",
};

const FLY_BY_ITEM: Partial<Record<string, NewsInsightFlyHint>> = {
  ukraine: { lat: 48.5, lng: 34, altitude: 1.72 },
  "china-taiwan-incidents": { lat: 24.48, lng: 119.5, altitude: 0.98 },
  "nk-missile-tests": { lat: 39.0, lng: 127.3, altitude: 1.1 },
  "tzeva-adom": { lat: 31.5, lng: 34.8, altitude: 1.2 },
  "ukmto-incidents": { lat: 14.5, lng: 42.5, altitude: 1.85 },
  "logistics-risk": { lat: 12.5, lng: 43.3, altitude: 2.0 },
  shipping: { lat: 15, lng: 60, altitude: 2.4 },
  "bri-trade": { lat: 35, lng: 70, altitude: 2.6 },
  "reef-watch": { lat: 10, lng: 115, altitude: 1.6 },
  "island-chains": { lat: 20, lng: 130, altitude: 2.2 },
};

function modesForPref(pref: keyof LayerPrefs): NewsInsightMode[] {
  if (ECONOMY_ONLY_PREF.has(pref)) return ["economy"];
  if (CONFLICT_ONLY_PREF.has(pref)) return ["conflict"];
  return ["conflict", "economy"];
}

function labelForPref(pref: keyof LayerPrefs, itemId: string): { ko: string; en: string } {
  const ko = LAYER_PREF_LABELS[pref as keyof typeof LAYER_PREF_LABELS] ?? itemId;
  return { ko, en: itemId.replace(/-/g, " ") };
}

function seedFromLayerItems(): NewsInsightCatalogEntry[] {
  const entries: NewsInsightCatalogEntry[] = [];
  for (const [itemId, pref] of Object.entries(LAYER_ITEM_PREF_KEYS)) {
    if (!pref) continue;
    // city labels / rail glow — 인사이트 맵 타깃으로 약함
    if (itemId === "city-labels" || itemId === "rail") continue;
    const { ko, en } = labelForPref(pref, itemId);
    const aliases = [
      itemId,
      ko,
      en,
      ...(EXTRA_ALIASES[itemId] ?? []),
    ];
    entries.push({
      id: itemId,
      prefKeys: [pref],
      aliases: Array.from(new Set(aliases.map((a) => a.trim()).filter(Boolean))),
      modes: modesForPref(pref),
      kind: KIND_BY_ITEM[itemId] ?? "point",
      flyHint: FLY_BY_ITEM[itemId],
      labelKo: ko,
      labelEn: en,
    });
  }
  return entries;
}

const BUNDLE_ENTRIES: NewsInsightCatalogEntry[] = [
  {
    id: "bundle-red-sea",
    prefKeys: [],
    aliases: [
      "Red Sea",
      "홍해",
      "Bab el-Mandeb",
      "바브엘만데브",
      "Houthi shipping",
      "후티 해운",
      "Suez risk",
    ],
    modes: ["conflict", "economy"],
    kind: "bundle",
    bundleLayerIds: ["shipping", "ukmto-incidents", "logistics-risk", "navarea-warnings", "ais"],
    flyHint: { lat: 14.5, lng: 42.5, altitude: 1.9 },
    labelKo: "홍해·초크 리스크",
    labelEn: "Red Sea choke risk",
  },
  {
    id: "bundle-ukraine-front",
    prefKeys: [],
    aliases: ["Ukraine front", "우크라이나 전선", "Donbas war", "키이우 공습"],
    modes: ["conflict"],
    kind: "bundle",
    bundleLayerIds: ["ukraine", "neptun", "gdelt-war", "firms"],
    flyHint: { lat: 48.5, lng: 34, altitude: 1.65 },
    labelKo: "우크라이나 전선",
    labelEn: "Ukraine front",
  },
  {
    id: "bundle-taiwan-strait",
    prefKeys: [],
    aliases: ["Taiwan Strait", "대만해협", "cross-strait", "양안"],
    modes: ["conflict"],
    kind: "bundle",
    bundleLayerIds: [
      "china-taiwan-incidents",
      "island-chains",
      "ais",
      "shipping",
      "military-bases-taiwan",
    ],
    flyHint: { lat: 24.48, lng: 119.5, altitude: 0.98 },
    labelKo: "대만해협",
    labelEn: "Taiwan Strait",
  },
  {
    id: "bundle-energy-sea",
    prefKeys: [],
    aliases: ["energy corridor", "에너지 통로", "oil shipping", "원유 해운", "LNG route"],
    modes: ["conflict", "economy"],
    kind: "bundle",
    bundleLayerIds: ["oil-pipelines", "gas-pipelines", "lng-terminals", "shipping", "ports"],
    flyHint: { lat: 25, lng: 55, altitude: 2.2 },
    labelKo: "에너지·해운 통로",
    labelEn: "Energy sea corridor",
  },
  {
    id: "bundle-bri-belt",
    prefKeys: [],
    aliases: ["Belt and Road", "일대일로", "BRI corridor", "실크로드"],
    modes: ["economy"],
    kind: "bundle",
    bundleLayerIds: ["bri-trade", "strategic-corridors", "ports", "rail"],
    flyHint: { lat: 35, lng: 70, altitude: 2.55 },
    labelKo: "일대일로 벨트",
    labelEn: "BRI belt",
  },
  {
    id: "bundle-korea-missile",
    prefKeys: [],
    aliases: ["Korea missile", "한반도 미사일", "ICBM test", "북한 발사"],
    modes: ["conflict"],
    kind: "bundle",
    bundleLayerIds: ["nk-missile-tests", "military-bases-rok", "missile-test-sites"],
    flyHint: { lat: 38.0, lng: 127.3, altitude: 0.85 },
    labelKo: "한반도 미사일",
    labelEn: "Korea missile watch",
  },
];

export const NEWS_INSIGHT_CATALOG: NewsInsightCatalogEntry[] = [
  ...seedFromLayerItems(),
  ...BUNDLE_ENTRIES,
];

const BY_ID = new Map(NEWS_INSIGHT_CATALOG.map((e) => [e.id, e]));

export function getNewsInsightEntry(id: string): NewsInsightCatalogEntry | undefined {
  return BY_ID.get(id);
}

export function catalogForMode(mode: NewsInsightMode | ViewerMode): NewsInsightCatalogEntry[] {
  const m: NewsInsightMode = mode === "economy" ? "economy" : "conflict";
  return NEWS_INSIGHT_CATALOG.filter((e) => e.modes.includes(m));
}

/** LLM 프롬프트용 압축 목록 */
export function catalogSummaryForPrompt(mode: NewsInsightMode): string {
  return catalogForMode(mode)
    .map((e) => {
      const kind = e.kind;
      const label = e.labelKo ?? e.id;
      const aliases = e.aliases.slice(0, 6).join("|");
      const bundle =
        e.kind === "bundle" && e.bundleLayerIds?.length
          ? ` layers=[${e.bundleLayerIds.join(",")}]`
          : "";
      return `- ${e.id} (${kind}) ${label} ~${aliases}${bundle}`;
    })
    .join("\n");
}

export function isCatalogIdAllowed(id: string, mode: NewsInsightMode): boolean {
  const e = BY_ID.get(id);
  return Boolean(e && e.modes.includes(mode));
}

/** layer / bundle id → LayerPrefs soft patch */
export function patchFromNewsInsightIds(
  ids: string[],
  mode: NewsInsightMode,
): Partial<LayerPrefs> {
  const patch: Partial<LayerPrefs> = {};
  const visit = (id: string) => {
    const e = BY_ID.get(id);
    if (!e || !e.modes.includes(mode)) return;
    if (e.kind === "bundle") {
      for (const lid of e.bundleLayerIds ?? []) visit(lid);
      return;
    }
    for (const key of e.prefKeys) {
      (patch as Record<string, boolean>)[key as string] = true;
    }
  };
  for (const id of ids) visit(id);
  return patch;
}

export function resolveFlyHint(
  layerIds: string[],
  bundleId: string | undefined,
  mode: NewsInsightMode,
): NewsInsightFlyHint | null {
  if (bundleId) {
    const b = BY_ID.get(bundleId);
    if (b?.flyHint && b.modes.includes(mode)) return b.flyHint;
  }
  for (const id of layerIds) {
    const e = BY_ID.get(id);
    if (e?.flyHint && e.modes.includes(mode)) return e.flyHint;
  }
  return null;
}

export function labelForCatalogId(
  id: string,
  lang: "ko" | "en",
): string {
  const e = BY_ID.get(id);
  if (!e) return id;
  if (lang === "en") return e.labelEn ?? e.id;
  return e.labelKo ?? e.labelEn ?? e.id;
}
