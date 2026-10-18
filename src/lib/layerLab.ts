import { LAB_UI } from "@/lib/labFlag";
import type { LayerPrefs } from "@/lib/layerPrefs";

/**
 * 실험실(lab) 레이어 — 해운·전쟁위험 담당자의 사건 확인에 증거·맥락으로 쓰이지 않는 레이어.
 * 코드는 남기고 화면 노출만 막는다(`NEXT_PUBLIC_LAB=1`이면 풀림). 분류: docs/layer-triage-2026-10-14.md
 *
 * 문서의 실험실 96개 중 아래는 일부러 뺐다.
 * - showConflictTheater* 13개: 전장별 사건 핀(useIncidentMarkers)을 가르는 스위치라 끄면 핀이 사라진다.
 * - showUsCarriers: 해상 사건 맥락으로 쓰므로 맥락 등급으로 올림.
 * - showAlliedBlocs · showAxisNetwork: 지정학 프리셋(동맹 블록·CRINK 축)에 필요해 맥락 등급으로 올림.
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
  "showWeeklyShipMoves",
] as const satisfies readonly (keyof LayerPrefs)[];

const LAB_SET: ReadonlySet<string> = new Set(LAB_LAYER_KEYS);

export function isLabLayerKey(key: string): boolean {
  return LAB_SET.has(key);
}

/** 실험실 레이어는 강제 OFF. 바뀔 게 없으면 원본을 그대로 돌려준다. */
export function enforceLabTier(prefs: LayerPrefs, lab: boolean = LAB_UI): LayerPrefs {
  if (lab) return prefs;
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
  "oil-pipelines", "gas-pipelines", "lng-terminals", "nuclear", "critical-nodes", "east-asia-adiz",
]);

export function isLabPanelItem(id: string, lab: boolean = LAB_UI): boolean {
  return !lab && LAB_PANEL_ITEM_IDS.has(id);
}
