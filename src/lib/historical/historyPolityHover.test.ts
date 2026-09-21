import { describe, expect, it } from "vitest";
import {
  historyPolityFromMapProps,
  isHistoryPolityFillLayerId,
} from "@/lib/historical/historyPolityHover";

describe("historyPolityHover", () => {
  it("recognizes history fill layer ids", () => {
    expect(isHistoryPolityFillLayerId("history-cliopatria-fill")).toBe(true);
    expect(isHistoryPolityFillLayerId("history-korea-fill")).toBe(true);
    expect(isHistoryPolityFillLayerId("map-polygons-fill")).toBe(false);
  });

  it("builds cliopatria polity from map props", () => {
    const item = historyPolityFromMapProps("history-cliopatria-fill", {
      name: "Zhou Dynasty",
      label: "Zhou Dynasty",
      fromYear: -1000,
      toYear: -801,
      wikipedia: "Zhou dynasty",
    });
    expect(item).toMatchObject({
      polygonLayer: "history-polity",
      name: "Zhou Dynasty",
      source: "cliopatria",
      fromYear: -1000,
      toYear: -801,
      nameLong: "Zhou dynasty",
    });
  });

  it("prefers Korean label for korea overlay", () => {
    const item = historyPolityFromMapProps("history-korea-fill", {
      nameEn: "Balhae",
      nameKo: "발해",
      label: "발해",
    });
    expect(item).toMatchObject({
      polygonLayer: "history-polity",
      name: "발해",
      source: "korea",
    });
  });

  it("returns null without a name", () => {
    expect(
      historyPolityFromMapProps("history-cliopatria-fill", { fill: "#fff" }),
    ).toBeNull();
  });
});
