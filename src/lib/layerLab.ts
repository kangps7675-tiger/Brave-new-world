import { LAB_UI } from "@/lib/labFlag";
import type { LayerPrefs } from "@/lib/layerPrefs";

/**
 * 지도 백과 레이어 — 2026-11-10 제품에서 뺐다.
 * 발전소·철도·케이블·사일로·국경선처럼 속보와 맞춰 볼 원본이 아닌 층이다.
 * 데이터 파일은 저장소에서 지웠고, `NEXT_PUBLIC_LAB=1`로도 다시 켜지지 않는다.
 * 대만·북한 미사일 같은 미시 속보 핀 스위치도 체크박스에서는 숨긴다.
 * 소식 자체는 전장 핀(showConflictTheater*)으로 남긴다. 그 스위치는 여기 없다.
 */
export const LAB_LAYER_KEYS = [
  "showAiDataCenters",
  "showAlliedLogisticsCorridors",
  "showArmsEmbargo",
  "showAustraliaMilitaryBases",
  "showBriTradeConnectivity",
  "showChinaJapanIncidents",
  "showChinaPhilippinesIncidents",
  "showChinaTaiwanIncidents",
  "showConflictZones",
  "showCrinkInfraAeroway",
  "showCrinkInfraBorder",
  "showCrinkInfraCheckpoint",
  "showCrinkInfraDams",
  "showCrinkInfraHarbour",
  "showCrinkInfraPipeline",
  "showCrinkInfraPower",
  "showCrinkInfraPowerLine",
  "showCrinkInfraRail",
  "showCrinkInfraRoad",
  "showCstoBloc",
  "showCriticalNodes",
  "showCyberIncidents",
  "showDiplomaticTension",
  "showEastAsiaAdiz",
  "showEasternNatoMilitaryBases",
  "showEconomicCenters",
  "showElectionEvents",
  "showEscalationSignals",
  "showEuropeDroneIncidents",
  "showGasPipelines",
  "showGdeltAlliance",
  "showGdeltDiplomatic",
  "showGdeltOceanCompetition",
  "showGdeltProtests",
  "showGemBioenergy",
  "showGemCement",
  "showGemChemicals",
  "showGemCoalMines",
  "showGemCoalPlants",
  "showGemCoalTerminals",
  "showGemGeothermal",
  "showGemHydro",
  "showGemIronOre",
  "showGemNuclear",
  "showGemOilGasExtraction",
  "showGemOilGasPlants",
  "showGemSolar",
  "showGemSteel",
  "showGemWind",
  "showGeoEconBlocs",
  "showGscpiGauge",
  "showGtaInterventions",
  "showIntelHotspots",
  "showInternetExchanges",
  "showIslandChains",
  "showJapanMilitaryBases",
  "showLngTerminals",
  "showLogisticsRisk",
  "showLogisticsStress",
  "showLsibBoundary",
  "showMissileSiloFields",
  "showMissileSilos",
  "showMissileTestSites",
  "showNorthKoreaMissileTests",
  "showNuclearSites",
  "showOilPipelines",
  "showPhilippinesMilitaryBases",
  "showRailGlow",
  "showReconSatellites",
  "showReefWatch",
  "showRefugeeCamps",
  "showResources",
  "showRokMilitaryBases",
  "showSanctionsEntities",
  "showSanctionsEvasionCorridors",
  "showSesChip",
  "showShippingLanes",
  "showSpaceLaunches",
  "showStrategicCorridors",
  "showStrategicMissileBases",
  "showSubmarineCables",
  "showSubmarineTunnels",
  "showSubseaPipelines",
  "showTaiwanMilitaryBases",
  "showUcdpEvents",
  "showUsChinaIncidents",
  "showUsDfcSupplyChain",
  "showWarZones",
  "showWeeklyShipMoves",
] as const satisfies readonly (keyof LayerPrefs)[];

const LAB_SET: ReadonlySet<string> = new Set(LAB_LAYER_KEYS);

export function isLabLayerKey(key: string): boolean {
  return LAB_SET.has(key);
}

/** 뺀 레이어는 항상 강제 OFF. lab 플래그로 되살리지 않는다. */
export function enforceLabTier(prefs: LayerPrefs, _lab: boolean = LAB_UI): LayerPrefs {
  void _lab;
  const rec = prefs as unknown as Record<string, unknown>;
  if (!LAB_LAYER_KEYS.some((k) => rec[k] === true)) return prefs;
  const next = { ...rec };
  for (const k of LAB_LAYER_KEYS) next[k] = false;
  return next as unknown as LayerPrefs;
}

/**
 * 레이어 패널 항목 id 중 실험실에 해당하는 것. 패널 항목은 여러 pref를 묶거나 이름이 달라
 * pref 키로 바로 환원되지 않아 id로 따로 적는다. (키 이름과 같은 id는 kebab-case 변환으로도 매칭됨)
 */
const LAB_PANEL_ITEM_IDS: ReadonlySet<string> = new Set([
  "china-taiwan-incidents", "china-japan-incidents", "china-philippines-incidents",
  "us-china-incidents", "europe-drone-incidents", "nk-missile-tests", "lsib-boundary",
  "diplomatic-tension", "island-chains", "escalation-signals", "conflict-zones", "arms-embargo",
  "gdelt-diplomatic", "gdelt-ocean", "gdelt-protest", "subsea-pipelines", "resources",
  "gem-resources", "crink-osm-infra", "gta-interventions", "strategic-corridors",
  "allied-logistics-corridors", "sanctions-evasion-corridors", "logistics-stress", "gscpi-gauge",
  "weekly-ship-moves", "reef-watch", "missile-silos", "strategic-missile-bases",
  "missile-test-sites", "missile-silo-fields", "strategic-missile", "recon-satellites",
  "csto-bloc", "geoecon-blocs", "us-dfc-supply", "bri-trade", "ses-gauge", "cables", "tunnels",
  "ixp", "ai-dc", "sanctions", "refugee", "cyber", "election", "space",
  "military-bases-rok", "military-bases-japan", "military-bases-taiwan",
  "military-bases-philippines", "military-bases-australia", "military-bases-eastern-nato",
  "shipping", "logistics-risk", "war-zones", "oil-pipelines", "gas-pipelines", "lng-terminals", "nuclear", "critical-nodes", "east-asia-adiz",
  "rail", "intel", "economic",
]);

export function isLabPanelItem(id: string, _lab: boolean = LAB_UI): boolean {
  void _lab;
  return LAB_PANEL_ITEM_IDS.has(id);
}
