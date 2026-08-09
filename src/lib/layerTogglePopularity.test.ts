import { describe, expect, it } from "vitest";
import { topLayerItemIds } from "@/lib/layerTogglePopularity";

describe("topLayerItemIds", () => {
  it("falls back to seed order when scores are empty", () => {
    const ids = ["a", "b", "c", "d"];
    const top = topLayerItemIds(ids, 3, ["c", "a", "b"]);
    expect(top).toEqual(["c", "a", "b"]);
  });

  it("respects n and candidate membership", () => {
    expect(topLayerItemIds(["x", "y"], 5, ["x"]).length).toBe(2);
    expect(topLayerItemIds([], 3)).toEqual([]);
  });
});
