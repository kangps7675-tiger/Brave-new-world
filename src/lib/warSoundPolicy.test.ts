import { describe, expect, it } from "vitest";
import { isWarCombatSound } from "@/lib/warSoundPolicy";

describe("warSoundPolicy", () => {
  it("blocks combat, siren, and explosion cues", () => {
    expect(isWarCombatSound("frontline-gunfire")).toBe(true);
    expect(isWarCombatSound("frontline-artillery-shot")).toBe(true);
    expect(isWarCombatSound("tzeva-red-alert")).toBe(true);
    expect(isWarCombatSound("neptun-air-alert")).toBe(true);
    expect(isWarCombatSound("neptun-impact")).toBe(true);
  });

  it("keeps breaking-flash and lamp parchment cues", () => {
    expect(isWarCombatSound("hero-breaking")).toBe(false);
    expect(isWarCombatSound("breaking-dark-bed")).toBe(false);
    expect(isWarCombatSound("economy-lamp-cheer")).toBe(false);
    expect(isWarCombatSound("parchment-unfold")).toBe(false);
    expect(isWarCombatSound("parchment-fold")).toBe(false);
  });
});
