import { describe, expect, it } from "vitest";
import {
  buildSceneUrl,
  isValidAsOfDate,
  parseSceneFromSearch,
} from "@/lib/sceneLink";
import type { LayerPrefs } from "@/lib/layerPrefs";

const prefs = { showWarZones: true, showAis: false } as unknown as LayerPrefs;

describe("sceneLink asOf", () => {
  it("validates YYYY-MM-DD", () => {
    expect(isValidAsOfDate("2026-07-20")).toBe(true);
    expect(isValidAsOfDate("2026-7-20")).toBe(false);
    expect(isValidAsOfDate(null)).toBe(false);
  });

  it("round-trips asOf in URL", () => {
    const url = buildSceneUrl("https://example.com", {
      mode: "conflict",
      lat: 26.58,
      lng: 56.25,
      altitude: 1.2,
      prefs,
      asOf: "2026-07-20",
    });
    expect(url).toContain("asOf=2026-07-20");
    const parsed = parseSceneFromSearch(url.replace("https://example.com/", ""));
    expect(parsed?.asOf).toBe("2026-07-20");
    expect(parsed?.layers).toContain("showWarZones");
  });

  it("omits asOf when missing", () => {
    const url = buildSceneUrl("https://example.com", {
      mode: "economy",
      lat: 0,
      lng: 0,
      altitude: 1,
      prefs,
    });
    expect(url).not.toContain("asOf=");
    const parsed = parseSceneFromSearch(url.replace("https://example.com/", ""));
    expect(parsed?.asOf ?? null).toBeNull();
  });
});
