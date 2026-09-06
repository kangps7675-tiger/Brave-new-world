import { describe, expect, it } from "vitest";
import { conceptLayersForConflict } from "@/lib/conceptLayers";
import { buildDomainOverviewPrefs } from "@/lib/entryOverview";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import { mergeChromeLayers, stripEconomyGeopoliticsPatch } from "@/lib/viewerChrome";

describe("첫 화면 Compact 장면", () => {
  it("자동 전장은 미군·한일대만필호·동유럽 기지와 CRINK OSM·항로를 켠다", () => {
    const patch = conceptLayersForConflict("auto");
    expect(patch.showUkraineControl).toBe(true);
    expect(patch.showNeptun).toBe(true);
    expect(patch.showMilitaryBases).toBe(true);
    expect(patch.showRokMilitaryBases).toBe(true);
    expect(patch.showJapanMilitaryBases).toBe(true);
    expect(patch.showTaiwanMilitaryBases).toBe(true);
    expect(patch.showPhilippinesMilitaryBases).toBe(true);
    expect(patch.showAustraliaMilitaryBases).toBe(true);
    expect(patch.showEasternNatoMilitaryBases).toBe(true);
    expect(patch.showShippingLanes).toBe(true);
    expect(patch.showCrinkInfraRail).toBe(true);
    expect(patch.showTelegramOsint).toBeUndefined();
  });

  it("지정학 크롬이 한·일·대만·필·호·NATO·미군 기지를 켠다", () => {
    const next = mergeChromeLayers(DEFAULT_LAYER_PREFS, "conflict");
    expect(next.showUkraineControl).toBe(true);
    expect(next.showRokMilitaryBases).toBe(true);
    expect(next.showJapanMilitaryBases).toBe(true);
    expect(next.showTaiwanMilitaryBases).toBe(true);
    expect(next.showPhilippinesMilitaryBases).toBe(true);
    expect(next.showAustraliaMilitaryBases).toBe(true);
    expect(next.showEasternNatoMilitaryBases).toBe(true);
    expect(next.showMilitaryBases).toBe(true);
    expect(next.showShippingLanes).toBe(true);
    expect(next.showCrinkInfraRail).toBe(true);
    expect(next.showTelegramOsint).toBe(false);
  });

  it("저장된 prefs는 기본값 변경으로 덮이지 않는다", () => {
    const saved = { ...DEFAULT_LAYER_PREFS, showTelegramOsint: true, showMilitaryBases: true };
    const next = mergeChromeLayers(saved, "conflict");
    // 크롬 FORCE_ON은 Compact만 켠다. 사용자가 켠 기지는 끄지 않는다.
    expect(next.showMilitaryBases).toBe(true);
    expect(next.showTelegramOsint).toBe(true);
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

  it("지정학 첫 화면·크롬이 GDELT war를 켠다 (전쟁소식 빨간 점)", () => {
    const prefs = buildDomainOverviewPrefs("conflict");
    expect(prefs.showGdeltWar).toBe(true);
    expect(prefs.showNewfeedsIranAttacks).toBe(true);
    const chrome = mergeChromeLayers(DEFAULT_LAYER_PREFS, "conflict");
    expect(chrome.showGdeltWar).toBe(true);
  });

  it("지경학 크롬이 우크라 점령·전선·NEPTUN을 강제 OFF 하고 시장 히어로를 켠다", () => {
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
    expect(next.showLogisticsRisk).toBe(true);
    expect(next.showGasPipelines).toBe(true);
    expect(next.showAxisNetwork).toBe(true);
    expect(next.showSesChip).toBe(false);
    expect(next.showSanctionsEvasionCorridors).toBe(false);
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
