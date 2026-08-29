import type { LayerPrefs } from "@/lib/layerPrefs";

export type SourceCredit = { label: string; url?: string };

/** 공유 출처 상수 — 여러 레이어가 같은 출처를 쓰면 바에서 자동 중복 제거된다 */
const GDELT: SourceCredit = { label: "GDELT", url: "https://www.gdeltproject.org/" };
const GEM: SourceCredit = {
  label: "Global Energy Monitor",
  url: "https://globalenergymonitor.org/",
};
const ADSB: SourceCredit = { label: "ADS-B", url: "https://www.adsbexchange.com/" };
const OSM: SourceCredit = {
  label: "OpenStreetMap",
  url: "https://www.openstreetmap.org/copyright",
};

/**
 * LayerPrefs 불리언 키 → 간결한 출처 크레딧.
 * 상시 노출 바가 짧게 유지되도록 라벨은 짧게, 같은 출처는 상수로 공유해 dedupe한다.
 * 매핑 없는 키(도시라벨·철도 등 기본 표시)는 표기 생략.
 */
const PREF_SOURCE: Partial<Record<keyof LayerPrefs, SourceCredit>> = {
  // 실시간·이벤트
  showFirmsFires: { label: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/" },
  showMilitaryActivity: ADSB,
  showAirTraffic: ADSB,
  showAis: { label: "MarineTraffic · AIS", url: "https://www.marinetraffic.com/" },
  showDisguisedVessels: { label: "AIS_Tracker (OSINT)" },
  showUcdpEvents: { label: "UCDP", url: "https://ucdp.uu.se/" },
  showGdeltWar: GDELT,
  showGdeltDiplomatic: GDELT,
  showGdeltAlliance: GDELT,
  showGdeltProtests: GDELT,
  showGdeltOceanCompetition: GDELT,
  showConflictZones: { label: "Natural Earth · GDELT" },
  showCyberIncidents: GDELT,
  showElectionEvents: GDELT,
  showChinaTaiwanIncidents: GDELT,
  showChinaJapanIncidents: GDELT,
  showChinaPhilippinesIncidents: GDELT,
  showUsChinaIncidents: GDELT,
  showNorthKoreaMissileTests: GDELT,
  showUkraineStrikesOnRussia: GDELT,
  // 우크라이나·중동
  showUkraineControl: { label: "VIINA (ODbL)" },
  showNeptun: { label: "NEPTUN", url: "https://neptun.in.ua/" },
  showTzevaAdom: { label: "Israel Home Front Command" },
  showNewfeedsIranAttacks: { label: "NewFeeds" },
  showUkmtoIncidents: { label: "UKMTO (Royal Navy)" },
  showNavareaWarnings: { label: "NGA · JHOD NAVAREA" },
  showMilitaryExercises: { label: "NAVAREA · open reporting" },
  showTelegramOsint: { label: "Telegram (IRONSIGHT)" },
  showReefWatch: { label: "ReefWatch · OpenSky" },
  // 우주·간섭
  showReconSatellites: { label: "CelesTrak", url: "https://celestrak.org/" },
  showSpaceLaunches: { label: "The Space Devs", url: "https://thespacedevs.com/" },
  showGpsInterference: { label: "GPSJam.org", url: "https://gpsjam.org/" },
  // 물류·경제
  showLogisticsRisk: { label: "IMF PortWatch", url: "https://portwatch.imf.org/" },
  showLogisticsStress: { label: "IMF PortWatch · UKMTO" },
  showGscpiGauge: {
    label: "NY Fed GSCPI",
    url: "https://www.newyorkfed.org/research/policy/gscpi",
  },
  showCriticalNodes: { label: "Critical Node Atlas" },
  showStrategicCorridors: {
    label: "Strategic corridors · BRI WPS8614",
    url: "https://www.worldbank.org/",
  },
  showEconomicCenters: { label: "Wikidata · World Bank" },
  showAiDataCenters: { label: "Wikidata · OSM" },
  showSanctionsEntities: { label: "OFAC · UN · EU · UK" },
  showArmsEmbargo: { label: "UN · EU · UK · US" },
  // 에너지 (GEM)
  showOilPipelines: GEM,
  showGasPipelines: GEM,
  showLngTerminals: GEM,
  showSubseaPipelines: GEM,
  showGemCoalPlants: GEM,
  showGemCoalMines: GEM,
  showGemCoalTerminals: GEM,
  showGemNuclear: GEM,
  showGemSolar: GEM,
  showGemWind: GEM,
  showGemHydro: GEM,
  showGemGeothermal: GEM,
  showGemBioenergy: GEM,
  showGemOilGasPlants: GEM,
  showGemOilGasExtraction: GEM,
  showGemIronOre: GEM,
  showGemCement: GEM,
  showGemSteel: GEM,
  showGemChemicals: GEM,
  // 미사일·핵
  showMissileSilos: { label: "PLARF Silo Study" },
  showStrategicMissileBases: { label: "open-source OOB" },
  showMissileTestSites: { label: "NTI / CNS" },
  // 정적·공개
  showMilitaryBases: OSM,
  showRokMilitaryBases: OSM,
  showJapanMilitaryBases: OSM,
  showTaiwanMilitaryBases: OSM,
  showPhilippinesMilitaryBases: OSM,
  showAustraliaMilitaryBases: OSM,
  showEasternNatoMilitaryBases: OSM,
  showAirports: OSM,
  showPorts: OSM,
  showSubmarineCables: { label: "public datasets" },
  showNuclearSites: { label: "IAEA · NTI" },
  showResources: { label: "USGS" },
  showRefugeeCamps: { label: "UNHCR" },
  // ⚠️ shipped 데이터가 PeeringDB 로 교체될 때까지 표기하지 않는다 (P0-3).
  // `npm run peeringdb:fetch` 실행 후 label 을 "PeeringDB (CC BY 4.0)" 로 되돌릴 것.
  showInternetExchanges: { label: "(출처 미연결)" },
  showShippingLanes: {
    label: "Shipping Lanes · Benden 2022 (CC BY 4.0)",
    url: "https://doi.org/10.5281/zenodo.6361763",
  },
};

/** 현재 켜진 레이어들의 출처 크레딧 (라벨 기준 중복 제거, 정의 순서 유지) */
export function activeSourceCredits(prefs: LayerPrefs | null | undefined): SourceCredit[] {
  if (!prefs) return [];
  const seen = new Set<string>();
  const out: SourceCredit[] = [];
  for (const [key, credit] of Object.entries(PREF_SOURCE)) {
    if (!credit) continue;
    if ((prefs as Record<string, unknown>)[key] === true && !seen.has(credit.label)) {
      seen.add(credit.label);
      out.push(credit);
    }
  }
  return out;
}
