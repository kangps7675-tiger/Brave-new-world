import { describe, expect, it } from "vitest";
import {
  allowsFrontlineCombatSound,
  resolveActiveWarTheaterAt,
  resolveCombatTheaterAt,
} from "@/lib/theaterCombat";

describe("theaterCombat — war vs tension", () => {
  it("classifies Ukraine and Middle East as active war", () => {
    expect(resolveActiveWarTheaterAt(48.5, 37.8)).toBe("russia-ukraine");
    expect(resolveActiveWarTheaterAt(32.0, 48.0)).toBe("middle-east");
    // Cairo — Egypt included in middle-east box
    expect(resolveActiveWarTheaterAt(30.04, 31.24)).toBe("middle-east");
  });

  it("classifies Taiwan and Korea as tension only (no active war)", () => {
    expect(resolveCombatTheaterAt(23.5, 121.0)).toBe("china-taiwan");
    expect(resolveActiveWarTheaterAt(23.5, 121.0)).toBeNull();
    expect(resolveCombatTheaterAt(38.0, 127.0)).toBe("korea");
    expect(resolveActiveWarTheaterAt(38.0, 127.0)).toBeNull();
  });

  it("allows frontline sound only over active war cameras", () => {
    expect(
      allowsFrontlineCombatSound({ cameraLat: 48.5, cameraLng: 37.8 }),
    ).toBe(true);
    expect(
      allowsFrontlineCombatSound({ cameraLat: 32.0, cameraLng: 48.0 }),
    ).toBe(true);
    expect(
      allowsFrontlineCombatSound({ cameraLat: 23.5, cameraLng: 121.0 }),
    ).toBe(false);
    expect(
      allowsFrontlineCombatSound({ cameraLat: 38.0, cameraLng: 127.0 }),
    ).toBe(false);
  });

  it("ignores tension-region episodes even when in view", () => {
    expect(
      allowsFrontlineCombatSound({
        cameraLat: 38.0,
        cameraLng: 127.0,
        episodeCenter: { lat: 38.0, lng: 127.0 },
        episodeInView: true,
      }),
    ).toBe(false);
    expect(
      allowsFrontlineCombatSound({
        cameraLat: 23.5,
        cameraLng: 121.0,
        episodeCenter: { lat: 24.0, lng: 120.5 },
        episodeInView: true,
      }),
    ).toBe(false);
  });

  it("allows episode shortcut only for active-war episode centers", () => {
    // Camera over Korea, but Ukraine episode visible → still no (camera not in war)
    // Episode in Ukraine + in view while camera elsewhere near enough conceptually:
    // helper only checks episode when episodeInView; camera Korea → false unless episode is war
    expect(
      allowsFrontlineCombatSound({
        cameraLat: 0,
        cameraLng: 0,
        episodeCenter: { lat: 48.5, lng: 37.8 },
        episodeInView: true,
      }),
    ).toBe(true);
    expect(
      allowsFrontlineCombatSound({
        cameraLat: 0,
        cameraLng: 0,
        episodeCenter: { lat: 48.5, lng: 37.8 },
        episodeInView: false,
      }),
    ).toBe(false);
  });
});
