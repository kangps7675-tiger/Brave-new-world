import { describe, expect, it } from "vitest";
import { detectPeaceScienceAngle } from "@/lib/peaceScienceAngles";
import {
  findPeaceScienceDyad,
  findPeaceScienceDyadFromFlashActors,
  peaceScienceBackgroundForFlash,
} from "@/lib/peaceScienceInsight";

describe("peaceScienceInsight", () => {
  it("finds dyad regardless of actor order", () => {
    const a = findPeaceScienceDyad("russia", "ukraine");
    const b = findPeaceScienceDyad("ukraine", "russia");
    expect(a?.id).toBe("russia-ukraine");
    expect(b?.id).toBe("russia-ukraine");
  });

  it("matches flash Korean labels", () => {
    const dyad = findPeaceScienceDyadFromFlashActors({
      active: "중국",
      passive: "대만",
      mentioned: ["중국", "대만"],
    });
    expect(dyad?.id).toBe("china-taiwan");
  });

  it("appends angled ELI5 background for geopolitics kinetic flash", () => {
    const p = peaceScienceBackgroundForFlash(
      { active: "India", passive: "Pakistan", mentioned: [] },
      "en",
      { domain: "conflict", text: "Artillery strike across the LoC" },
    );
    expect(p).toMatch(/Historical backdrop/);
    expect(p).toMatch(/land border/i);
    expect(p).toMatch(/military or coercive force/i);
    expect(p).toMatch(/not a forecast/i);
  });

  it("uses market angle on geoeconomics domain", () => {
    const p = peaceScienceBackgroundForFlash(
      { active: "China", passive: "United States", mentioned: [] },
      "en",
      { domain: "economy", text: "Tariff hike hits semiconductor supply chain" },
    );
    expect(p).toMatch(/commodity, finance, or supply-chain/i);
    expect(p).toMatch(/Not advice/i);
  });

  it("returns null outside geopolitics/geoeconomics domain", () => {
    expect(
      peaceScienceBackgroundForFlash(
        { active: "Russia", passive: "Ukraine", mentioned: [] },
        "ko",
        { domain: null, text: "missile strike" },
      ),
    ).toBeNull();
  });

  it("returns null when no dyad matches", () => {
    expect(
      peaceScienceBackgroundForFlash(
        { active: "NATO", passive: null, mentioned: ["NATO"] },
        "ko",
        { domain: "conflict", text: "summit" },
      ),
    ).toBeNull();
  });
});

describe("detectPeaceScienceAngle", () => {
  it("prefers kinetic on conflict when strike language present", () => {
    expect(detectPeaceScienceAngle("missile strike on base", "conflict")).toBe("kinetic");
  });

  it("prefers chokepoint on economy when strait language present", () => {
    expect(detectPeaceScienceAngle("Hormuz tanker traffic slows", "economy")).toBe(
      "chokepoint",
    );
  });
});
