import type { LayerPrefs } from "@/lib/layerPrefs";

/** LayerCategoryPanel item id → LayerPrefs boolean/string key */
export const LAYER_ITEM_PREF_KEYS: Partial<Record<string, keyof LayerPrefs>> = {
  "city-labels": "showCityLabels",
  rail: "showRailGlow",
  ukraine: "showUkraineControl",
  neptun: "showNeptun",
  disputes: "showWarZones",
  "war-zones": "showWarZones",
  "diplomatic-tension": "showDiplomaticTension",
  "conflict-zones": "showConflictZones",
  "arms-embargo": "showArmsEmbargo",
  ucdp: "showUcdpEvents",
  "gdelt-war": "showGdeltWar",
  "gdelt-diplomatic": "showGdeltDiplomatic",
  "gdelt-alliance": "showGdeltAlliance",
  "gdelt-protest": "showGdeltProtests",
  "gdelt-ocean": "showGdeltOceanCompetition",
  "telegram-osint": "showTelegramOsint",
  "tzeva-adom": "showTzevaAdom",
  "newfeeds-iran": "showNewfeedsIranAttacks",
  "ukmto-incidents": "showUkmtoIncidents",
  "escalation-signals": "showEscalationSignals",
  "navarea-warnings": "showNavareaWarnings",
  "military-exercises": "showMilitaryExercises",
  "china-taiwan-incidents": "showChinaTaiwanIncidents",
  "china-japan-incidents": "showChinaJapanIncidents",
  "china-philippines-incidents": "showChinaPhilippinesIncidents",
  "us-china-incidents": "showUsChinaIncidents",
  "weekly-ship-moves": "showWeeklyShipMoves",
  "reef-watch": "showReefWatch",
  "nk-missile-tests": "showNorthKoreaMissileTests",
  "ukraine-strikes-russia": "showUkraineStrikesOnRussia",
  "oil-pipelines": "showOilPipelines",
  "gas-pipelines": "showGasPipelines",
  "lng-terminals": "showLngTerminals",
  "subsea-pipelines": "showSubseaPipelines",
  "gem-coal-plants": "showGemCoalPlants",
  "gem-coal-mines": "showGemCoalMines",
  "gem-coal-terminals": "showGemCoalTerminals",
  "gem-nuclear": "showGemNuclear",
  "gem-solar": "showGemSolar",
  "gem-wind": "showGemWind",
  "gem-hydro": "showGemHydro",
  "gem-geothermal": "showGemGeothermal",
  "gem-bioenergy": "showGemBioenergy",
  "gem-oil-gas-plants": "showGemOilGasPlants",
  "gem-oil-gas-extraction": "showGemOilGasExtraction",
  "gem-iron-ore": "showGemIronOre",
  "gem-cement": "showGemCement",
  "gem-steel": "showGemSteel",
  "gem-chemicals": "showGemChemicals",
  resources: "showResources",
  nuclear: "showNuclearSites",
  shipping: "showShippingLanes",
  "lsib-boundary": "showLsibBoundary",
  "bri-trade": "showBriTradeConnectivity",
  "strategic-corridors": "showStrategicCorridors",
  "us-dfc-supply": "showUsDfcSupplyChain",
  cables: "showSubmarineCables",
  tunnels: "showSubmarineTunnels",
  airports: "showAirports",
  ports: "showPorts",
  ixp: "showInternetExchanges",
  "logistics-risk": "showLogisticsRisk",
  "logistics-stress": "showLogisticsStress",
  "gscpi-gauge": "showGscpiGauge",
  "critical-nodes": "showCriticalNodes",
  ais: "showAis",
  "disguised-vessels": "showDisguisedVessels",
  "military-bases": "showMilitaryBases",
  "military-bases-us": "showMilitaryBases",
  "military-bases-rok": "showRokMilitaryBases",
  "military-bases-japan": "showJapanMilitaryBases",
  "military-bases-philippines": "showPhilippinesMilitaryBases",
  "military-bases-eastern-nato": "showEasternNatoMilitaryBases",
  "missile-silos": "showMissileSilos",
  "strategic-missile-bases": "showStrategicMissileBases",
  "missile-test-sites": "showMissileTestSites",
  "missile-silo-fields": "showMissileSiloFields",
  "military-air": "showMilitaryActivity",
  "air-traffic": "showAirTraffic",
  intel: "showIntelHotspots",
  refugee: "showRefugeeCamps",
  firms: "showFirmsFires",
  cyber: "showCyberIncidents",
  election: "showElectionEvents",
  space: "showSpaceLaunches",
  "recon-satellites": "showReconSatellites",
  "gps-interference": "showGpsInterference",
  economic: "showEconomicCenters",
  "ai-dc": "showAiDataCenters",
  sanctions: "showSanctionsEntities",
  "east-asia-adiz": "showEastAsiaAdiz",
  "island-chains": "showIslandChains",
  "axis-network": "showAxisNetwork",
};

type PrefTreeItem = { id: string; options?: PrefTreeItem[] };

function collectPrefKeys(item: PrefTreeItem, patch: Partial<LayerPrefs>, enabled: boolean) {
  if (item.options?.length) {
    for (const opt of item.options) collectPrefKeys(opt, patch, enabled);
    return;
  }
  const key = LAYER_ITEM_PREF_KEYS[item.id];
  if (key) (patch as Record<string, boolean>)[key] = enabled;
}

export function patchFromCategoryItems(
  items: PrefTreeItem[],
  enabled: boolean,
): Partial<LayerPrefs> {
  const patch: Partial<LayerPrefs> = {};
  for (const item of items) collectPrefKeys(item, patch, enabled);
  return patch;
}

/** 드롭다운 트리에서 리프 item id 목록 */
export function flattenLayerItemIds(items: PrefTreeItem[]): string[] {
  const out: string[] = [];
  const walk = (item: PrefTreeItem) => {
    if (item.options?.length) {
      for (const opt of item.options) walk(opt);
      return;
    }
    out.push(item.id);
  };
  for (const item of items) walk(item);
  return out;
}
