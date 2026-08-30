import { describe, expect, it } from "vitest";
import { conceptLayersForConflict } from "@/lib/conceptLayers";
import { buildDomainOverviewPrefs } from "@/lib/entryOverview";
import { DEFAULT_LAYER_PREFS } from "@/lib/layerPrefs";
import { mergeChromeLayers } from "@/lib/viewerChrome";

describe("첫 화면 Compact 장면", () => {
  it("자동 전장은 기지·텔레그램을 켜지 않는다", () => {
    const patch = conceptLayersForConflict("auto");
    expect(patch.showUkraineControl).toBe(true);
    expect(patch.showNeptun).toBe(true);
    expect(patch.showMilitaryBases).toBeUndefined();
    expect(patch.showTelegramOsint).toBeUndefined();
  });

  it("지정학 크롬이 한·일·NATO 기지를 강제 ON 하지 않는다", () => {
    const next = mergeChromeLayers(DEFAULT_LAYER_PREFS, "conflict");
    expect(next.showUkraineControl).toBe(true);
    expect(next.showRokMilitaryBases).toBe(false);
    expect(next.showJapanMilitaryBases).toBe(false);
    expect(next.showEasternNatoMilitaryBases).toBe(false);
    expect(next.showTelegramOsint).toBe(false);
  });

  it("저장된 prefs는 기본값 변경으로 덮이지 않는다", () => {
    const saved = { ...DEFAULT_LAYER_PREFS, showTelegramOsint: true, showMilitaryBases: true };
    const next = mergeChromeLayers(saved, "conflict");
    // 크롬 FORCE_ON은 Compact만 켠다. 사용자가 켠 기지는 끄지 않는다.
    expect(next.showMilitaryBases).toBe(true);
    expect(next.showTelegramOsint).toBe(true);
  });

  it("도메인 오버뷰는 저장본이 아니라 장면 칩이다", () => {
    const prefs = buildDomainOverviewPrefs("conflict");
    expect(prefs.showUsCarriers).toBe(true);
    expect(prefs.showMilitaryBases).toBe(false);
  });
});
