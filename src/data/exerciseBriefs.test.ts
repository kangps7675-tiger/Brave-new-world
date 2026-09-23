import { describe, expect, it } from "vitest";
import { CURATED_EXERCISES } from "./exerciseBriefs";
import { safeArticleUrl } from "@/lib/missileTrack";

describe("curated exercise briefs", () => {
  it("have unique ids and valid coordinates", () => {
    const ids = CURATED_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ex of CURATED_EXERCISES) {
      expect(ex.lat).toBeGreaterThanOrEqual(-90);
      expect(ex.lat).toBeLessThanOrEqual(90);
      expect(ex.lng).toBeGreaterThanOrEqual(-180);
      expect(ex.lng).toBeLessThanOrEqual(180);
      expect(ex.actors.length).toBeGreaterThan(0);
      expect(ex.sources.length).toBeGreaterThan(0);
      for (const src of ex.sources) {
        if (src.url) expect(safeArticleUrl(src.url)).toBeTruthy();
      }
    }
  });

  it("marks curated events active so they render as markers/hatches on the map", () => {
    for (const ex of CURATED_EXERCISES) {
      expect(ex.active).toBe(true);
    }
  });

  it("covers distinct actor categories", () => {
    const trilateral = CURATED_EXERCISES.find((e) => e.id.includes("freedom-edge"));
    const taiwan = CURATED_EXERCISES.find((e) => e.id.includes("han-kuang"));
    expect(trilateral?.actors.sort()).toEqual(["jp", "rok", "us"].sort());
    expect(taiwan?.actors).toEqual(["tw"]);
  });
});
