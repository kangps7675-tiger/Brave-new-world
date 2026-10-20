import { describe, expect, it } from "vitest";
import {
  colorForCliopatriaPolity,
  colorForKoreaFamily,
  hashHue,
  hslToHex,
} from "@/lib/historical/polityColors";
import { getViewerChrome } from "@/lib/viewerChrome";

describe("polityColors", () => {
  it("hashHue is stable", () => {
    expect(hashHue("Roman Empire")).toBe(hashHue("Roman Empire"));
    expect(hashHue("a")).not.toBe(hashHue("b"));
  });

  it("hslToHex produces #rrggbb", () => {
    expect(hslToHex(0, 100, 50)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("Korean families in the same ethno band stay warm/near each other", () => {
    const gog = colorForKoreaFamily("goguryeo");
    const bal = colorForKoreaFamily("balhae");
    const sil = colorForKoreaFamily("silla");
    expect(gog.fill).not.toBe(sil.fill);
    expect(gog.fill).not.toBe(bal.fill);
    expect(gog.fill).toMatch(/^#/);
  });

  it("Cliopatria clusters map Chinese/Roman names into distinct bands", () => {
    const tang = colorForCliopatriaPolity({ name: "Tang" });
    const rome = colorForCliopatriaPolity({ name: "Roman Empire" });
    expect(tang.fill).not.toBe(rome.fill);
  });

  it("same Cliopatria name always gets the same fill", () => {
    const a = colorForCliopatriaPolity({ name: "Ottoman Empire", wikidata: "Q12560" });
    const b = colorForCliopatriaPolity({ name: "Ottoman Empire", wikidata: "Q12560" });
    expect(a.fill).toBe(b.fill);
  });
});

describe("history viewer chrome", () => {
  it("forces modern conflict/news/carrier layers off", () => {
    const chrome = getViewerChrome("history");
    expect(chrome.fetchGdelt).toBe(false);
    expect(chrome.forceLayerOn.showUkraineControl).toBeUndefined();
    expect(chrome.forceLayerOff.showUkraineControl).toBe(false);
    expect(chrome.forceLayerOff.showWarZones).toBe(false);
    expect(chrome.forceLayerOff.showGdeltWar).toBe(false);
    expect(chrome.forceLayerOff.showUsCarriers).toBe(false);
    expect(chrome.forceLayerOff.showAis).toBe(false);
    expect(chrome.forceLayerOff.showLsibBoundary).toBe(false);
    expect(chrome.forceLayerOff.showAlliedBlocs).toBe(false);
    expect(chrome.forceLayerOff.showEuropeDroneIncidents).toBe(false);
    expect(chrome.forceLayerOff.showNeptun).toBe(false);
    expect(chrome.forceLayerOff.showNuclearSites).toBe(false);
    expect(chrome.forceLayerOff.showConflictEvents).toBe(false);
  });
});
