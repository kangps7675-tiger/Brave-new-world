import { describe, expect, it } from "vitest";
import { anchorageAt, groupByHormuzAnchorage } from "./anchorages";

describe("hormuz anchorages", () => {
  it("names Fujairah from the report text and Khasab from the strait lane", () => {
    expect(anchorageAt(26.6, 56.5, "Attack 18nm east of Fujairah")?.id).toBe("fujairah");
    expect(anchorageAt(26.41, 56.52)?.id).toBe("khasab");
    expect(anchorageAt(29.44, 48.89)).toBeNull();
  });

  it("groups in anchorage order and drops empty buckets", () => {
    const groups = groupByHormuzAnchorage([
      { lat: 26.41, lng: 56.52, place: "Strait of Hormuz" },
      { lat: 25.2, lng: 56.5, place: "off Fujairah" },
      { lat: 29.44, lng: 48.89, place: "Northern Arabian Gulf" },
    ]);
    expect(groups.map((g) => g.nameKo)).toEqual(["푸자이라", "하사브", "그 외 걸프·해협"]);
  });
});
