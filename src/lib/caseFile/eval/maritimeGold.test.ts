import { describe, expect, it } from "vitest";
import { loadMaritimeGold } from "@/lib/caseFile/eval/maritimeGold";

describe("maritime gold fixtures", () => {
  it("loads the expected IMO counts", () => {
    expect(loadMaritimeGold("red_sea")).toHaveLength(56);
    expect(loadMaritimeGold("hormuz")).toHaveLength(113);
    expect(loadMaritimeGold("baltic")).toHaveLength(7);
    expect(loadMaritimeGold("black_sea")).toHaveLength(3);
  });

  it("has unique ids and well-formed fields", () => {
    const items = loadMaritimeGold();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (i.dateEnd) expect(i.dateEnd >= i.date).toBe(true);
      if (i.imo) expect(i.imo).toMatch(/^\d{7}$/);
      expect(i.ship.length).toBeGreaterThan(0);
      expect(i.locationText.length).toBeGreaterThan(0);
    }
  });

  it("marks every non-IMO item as reported", () => {
    for (const i of loadMaritimeGold()) {
      if (i.goldSource === "media") expect(i.confidence).toBe("reported");
    }
  });

  it("allows at most one hormuz item without an IMO number", () => {
    const missing = loadMaritimeGold("hormuz").filter((i) => !i.imo);
    expect(missing.length).toBeLessThanOrEqual(1);
  });
});
