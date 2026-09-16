import { describe, expect, it } from "vitest";
import { buildDomainOverviewPrefs, FIRST_SCREEN_MAX_LAYERS } from "@/lib/entryOverview";
import { countActiveLayers, activeLayerCap } from "@/lib/layerExclusiveCap";

/**
 * 회귀 방지 — 2026-08 "부팅 시 레이어 30개 동시 ON" 버그.
 *
 * 원인: buildDomainOverviewPrefs가 clampPrefsToActiveCap으로 자른 직후
 * 히어로/필수 보강을 다시 강제 ON해서, 클램프가 매번 무효화되고
 * 결과가 항상 정확히 fullModeMaxLayers(30)였다. 저사양 기기에서
 * fetch·addLayer·마커가 한꺼번에 터져 프론트가 죽었다.
 *
 * 이 테스트는 "클램프는 항상 마지막"이라는 불변조건을 지킨다 —
 * 누군가 다시 강제 ON을 클램프 뒤에 붙이면 여기서 실패해야 한다.
 */
describe("buildDomainOverviewPrefs — 첫 화면 레이어 예산", () => {
  it("conflict 모드는 FIRST_SCREEN_MAX_LAYERS를 넘지 않는다", () => {
    const prefs = buildDomainOverviewPrefs("conflict");
    expect(countActiveLayers(prefs)).toBeLessThanOrEqual(FIRST_SCREEN_MAX_LAYERS);
  });

  it("economy 모드는 FIRST_SCREEN_MAX_LAYERS를 넘지 않는다", () => {
    const prefs = buildDomainOverviewPrefs("economy");
    expect(countActiveLayers(prefs)).toBeLessThanOrEqual(FIRST_SCREEN_MAX_LAYERS);
  });

  it("conflict + Ultra-Lite는 min(첫화면예산, ultraLiteMaxLayers)를 넘지 않는다", () => {
    const prefs = buildDomainOverviewPrefs("conflict", { ultraLite: true });
    const budget = Math.min(FIRST_SCREEN_MAX_LAYERS, activeLayerCap(true));
    expect(countActiveLayers(prefs)).toBeLessThanOrEqual(budget);
  });

  it("economy + Ultra-Lite는 min(첫화면예산, ultraLiteMaxLayers)를 넘지 않는다", () => {
    const prefs = buildDomainOverviewPrefs("economy", { ultraLite: true });
    const budget = Math.min(FIRST_SCREEN_MAX_LAYERS, activeLayerCap(true));
    expect(countActiveLayers(prefs)).toBeLessThanOrEqual(budget);
  });

  it("절대 fullModeMaxLayers(=상한 전부)만큼 켜지지 않는다 — 회귀 스모크", () => {
    const conflict = buildDomainOverviewPrefs("conflict");
    const economy = buildDomainOverviewPrefs("economy");
    expect(countActiveLayers(conflict)).toBeLessThan(activeLayerCap(false));
    expect(countActiveLayers(economy)).toBeLessThan(activeLayerCap(false));
  });

  it("conflict 모드 최우선 레이어(전선)는 예산 안에서도 살아남는다", () => {
    const prefs = buildDomainOverviewPrefs("conflict");
    expect(prefs.showUkraineControl || prefs.showWarZones).toBeTruthy();
  });

  it("economy 모드 최우선 레이어(해상 물류)는 예산 안에서도 살아남는다", () => {
    const prefs = buildDomainOverviewPrefs("economy");
    expect(prefs.showAis || prefs.showShippingLanes).toBeTruthy();
  });

  it("지정학 첫 화면은 전선·드론·통합전장·전략군사·군용 항적·FIRMS·ReefWatch·해저관", () => {
    const prefs = buildDomainOverviewPrefs("conflict");
    expect(prefs.showUkraineControl).toBe(true);
    expect(prefs.showWarZones).toBe(true);
    expect(prefs.showNeptun).toBe(true);
    expect(prefs.showConflictEvents).toBe(true);
    expect(prefs.showUkraineStrikesOnRussia).toBe(false);
    expect(prefs.showGdeltWar).toBe(true);
    expect(prefs.showFirmsFires).toBe(true);
    expect(prefs.showMilitaryActivity).toBe(true);
    expect(prefs.showUsCarriers).toBe(true);
    expect(prefs.showWeeklyShipMoves).toBe(true);
    expect(prefs.showAis).toBe(true);
    expect(prefs.showReefWatch).toBe(true);
    expect(prefs.showMissileSilos).toBe(true);
    expect(prefs.showIslandChains).toBe(true);
    expect(prefs.showAxisNetwork).toBe(true);
    expect(prefs.showAlliedBlocs).toBe(true);
    expect(prefs.showSubseaPipelines).toBe(true);
    expect(prefs.showOilPipelines).toBe(true);
    expect(prefs.showGasPipelines).toBe(true);
    expect(prefs.showNewfeedsIranAttacks).toBe(false);
    expect(prefs.showBriTradeConnectivity).toBe(false);
    expect(prefs.showUsDfcSupplyChain).toBe(false);
    expect(prefs.showAirTraffic).toBe(false);
  });

  it("지경학 첫 화면은 초크·항로·에너지·진영·민간항적·DC·해저관", () => {
    const prefs = buildDomainOverviewPrefs("economy");
    expect(prefs.showLogisticsRisk).toBe(true);
    expect(prefs.showShippingLanes).toBe(true);
    expect(prefs.showPorts).toBe(true);
    expect(prefs.showGasPipelines).toBe(true);
    expect(prefs.showLngTerminals).toBe(true);
    expect(prefs.showStrategicCorridors).toBe(true);
    expect(prefs.showGeoEconBlocs).toBe(true);
    expect(prefs.showOilPipelines).toBe(true);
    expect(prefs.showSubseaPipelines).toBe(true);
    expect(prefs.showAis).toBe(true);
    expect(prefs.showAirTraffic).toBe(true);
    expect(prefs.showAiDataCenters).toBe(true);
    expect(prefs.showCriticalNodes).toBe(false);
    expect(prefs.showCrinkInfraRail).toBe(false);
    expect(prefs.showBriTradeConnectivity).toBe(false);
    expect(prefs.showUsDfcSupplyChain).toBe(false);
    expect(prefs.showSesChip).toBe(false);
    expect(prefs.showSanctionsEvasionCorridors).toBe(false);
    expect(prefs.showAlliedBlocs).toBe(false);
  });
});
