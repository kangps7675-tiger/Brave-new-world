import { describe, expect, it } from "vitest";
import { conceptLayersForConflict } from "@/lib/conceptLayers";
import { buildDomainOverviewPrefs } from "@/lib/entryOverview";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import { mergeChromeLayers, stripEconomyGeopoliticsPatch } from "@/lib/viewerChrome";

describe("첫 화면 Compact 장면", () => {
  it("자동 전장은 FIRST_SCREEN_CONFLICT_ON(영토·분쟁·진영 폴리곤)을 켠다", () => {
    const patch = conceptLayersForConflict("auto");
    expect(patch.showUkraineControl).toBe(true);
    expect(patch.showWarZones).toBe(true);
    expect(patch.showAlliedBlocs).toBe(true);
    expect(patch.showIslandChains).toBe(true);
    expect(patch.showEastAsiaAdiz).toBe(true);
    expect(patch.showNeptun).toBeUndefined();
    expect(patch.showConflictEvents).toBeUndefined();
    expect(patch.showMilitaryActivity).toBeUndefined();
  });

  it("지정학 크롬이 영토·분쟁·진영 폴리곤만 강제 ON 한다", () => {
    const next = mergeChromeLayers(DEFAULT_LAYER_PREFS, "conflict");
    expect(next.showUkraineControl).toBe(true);
    expect(next.showWarZones).toBe(true);
    expect(next.showAlliedBlocs).toBe(true);
    expect(next.showIslandChains).toBe(true);
    expect(next.showEastAsiaAdiz).toBe(true);
    expect(next.showNeptun).toBe(false);
    expect(next.showConflictEvents).toBe(false);
    expect(next.showUkraineStrikesOnRussia).toBe(false);
    expect(next.showNewfeedsIranAttacks).toBe(false);
    expect(next.showGdeltWar).toBe(false);
    expect(next.showFirmsFires).toBe(false);
    expect(next.showMilitaryActivity).toBe(false);
    expect(next.showUsCarriers).toBe(false);
    expect(next.showWeeklyShipMoves).toBe(false);
    expect(next.showAis).toBe(false);
    expect(next.showReefWatch).toBe(false);
    expect(next.showMissileSilos).toBe(false);
    expect(next.showAxisNetwork).toBe(false);
    expect(next.showAirTraffic).toBe(false);
    expect(next.showAiDataCenters).toBe(false);
    expect(next.showGeoEconBlocs).toBe(false);
  });

  it("저장된 prefs는 FORCE_OFF 대상이 아니면 덮이지 않는다", () => {
    const saved = {
      ...DEFAULT_LAYER_PREFS,
      showTelegramOsint: true,
      showDiplomaticTension: true,
    };
    const next = mergeChromeLayers(saved, "conflict");
    expect(next.showTelegramOsint).toBe(true);
    expect(next.showDiplomaticTension).toBe(true);
  });

  it("지정학 FORCE_OFF 대상(군사기지)은 저장된 ON도 끈다", () => {
    const saved = { ...DEFAULT_LAYER_PREFS, showMilitaryBases: true };
    const next = mergeChromeLayers(saved, "conflict");
    expect(next.showMilitaryBases).toBe(false);
  });

  it("지정학 크롬이 BRI·DFC를 강제 OFF 한다", () => {
    const saved = {
      ...DEFAULT_LAYER_PREFS,
      showBriTradeConnectivity: true,
      showUsDfcSupplyChain: true,
    };
    const next = mergeChromeLayers(saved, "conflict");
    expect(next.showBriTradeConnectivity).toBe(false);
    expect(next.showUsDfcSupplyChain).toBe(false);
  });

  it("지정학 첫 화면은 폴리곤 히어로만 켠다 (이벤트·항적은 패널)", () => {
    const prefs = buildDomainOverviewPrefs("conflict");
    expect(prefs.showUkraineControl).toBe(true);
    expect(prefs.showWarZones).toBe(true);
    expect(prefs.showAlliedBlocs).toBe(true);
    expect(prefs.showGdeltWar).toBe(false);
    expect(prefs.showConflictEvents).toBe(false);
    const chrome = mergeChromeLayers(DEFAULT_LAYER_PREFS, "conflict");
    expect(chrome.showGdeltWar).toBe(false);
  });

  it("지경학 크롬이 우크라 점령·전선·NEPTUN을 강제 OFF 하고 진영 폴리곤을 켠다", () => {
    const saved = {
      ...DEFAULT_LAYER_PREFS,
      showUkraineControl: true,
      showWarZones: true,
      showNeptun: true,
      showTzevaAdom: true,
    };
    const next = mergeChromeLayers(saved, "economy");
    expect(next.showUkraineControl).toBe(false);
    expect(next.showWarZones).toBe(false);
    expect(next.showNeptun).toBe(false);
    expect(next.showTzevaAdom).toBe(false);
    expect(next.showMilitaryBases).toBe(false);
    expect(next.showMilitaryActivity).toBe(false);
    expect(next.showGeoEconBlocs).toBe(true);
    expect(next.showGscpiGauge).toBe(true);
    expect(next.showLogisticsRisk).toBe(false);
    expect(next.showShippingLanes).toBe(false);
    expect(next.showAis).toBe(false);
    expect(next.showAirTraffic).toBe(false);
    expect(next.showAiDataCenters).toBe(false);
    expect(next.showSesChip).toBe(false);
    expect(next.showSanctionsEvasionCorridors).toBe(false);
    expect(next.showAlliedBlocs).toBe(false);
  });

  it("묻기 패치가 지경학에서 전선·점령을 다시 켜지 못한다", () => {
    const patch = stripEconomyGeopoliticsPatch({
      showUkraineControl: true,
      showWarZones: true,
      showGdeltWar: true,
      showShippingLanes: true,
    });
    expect(patch.showUkraineControl).toBe(false);
    expect(patch.showWarZones).toBe(false);
    expect(patch.showGdeltWar).toBe(false);
    expect(patch.showShippingLanes).toBe(true);
  });
});
