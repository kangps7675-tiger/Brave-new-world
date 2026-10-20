import { describe, expect, it } from "vitest";
import type { SearchPlace } from "@/data/geoTypes";
import {
  filterObservePlaceLabels,
  getObservePlaceLabelTier,
} from "@/lib/cesiumObservePlaceLod";

function place(
  partial: Partial<SearchPlace> &
    Pick<SearchPlace, "id" | "name" | "lat" | "lng" | "type">,
): SearchPlace {
  return {
    country: partial.country ?? "X",
    population: partial.population ?? null,
    ...partial,
  };
}

describe("cesiumObservePlaceLod", () => {
  it("classifies country before population tier", () => {
    expect(
      getObservePlaceLabelTier(
        place({
          id: "c1",
          name: "Korea",
          lat: 36,
          lng: 128,
          type: "country",
          population: 50_000_000,
        }),
      ),
    ).toBe("country");
  });

  it("shows countries at global zoom and megacities after zoom-in", () => {
    const places = [
      place({
        id: "kr",
        name: "Korea",
        lat: 36.5,
        lng: 127.8,
        type: "country",
        population: 50_000_000,
      }),
      place({
        id: "seoul",
        name: "Seoul",
        lat: 37.5,
        lng: 127,
        type: "city",
        population: 9_000_000,
      }),
      place({
        id: "suwon",
        name: "Suwon",
        lat: 37.26,
        lng: 127.03,
        type: "city",
        population: 1_200_000,
      }),
      place({
        id: "town1",
        name: "Town",
        lat: 37.3,
        lng: 127.1,
        type: "town",
        population: 50_000,
      }),
      place({
        id: "vil1",
        name: "Village",
        lat: 37.31,
        lng: 127.11,
        type: "village",
        population: 8_000,
      }),
    ];
    const view = { lat: 37.5, lng: 127, altitude: 2.2 };

    const global = filterObservePlaceLabels(places, { ...view, altitude: 2.2 }, 2.2);
    expect(global.every((p) => p.type === "country")).toBe(true);

    const continent = filterObservePlaceLabels(places, { ...view, altitude: 1.3 }, 1.3);
    const continentTypes = new Set(continent.map((p) => p.type));
    expect(continentTypes.has("country")).toBe(true);
    expect(continent.some((p) => p.id === "seoul")).toBe(true);
    expect(continent.some((p) => p.id === "town1")).toBe(false);

    const regional = filterObservePlaceLabels(places, { ...view, altitude: 0.9 }, 0.9);
    expect(regional.some((p) => p.id === "suwon")).toBe(true);

    const near = filterObservePlaceLabels(places, { ...view, altitude: 0.4 }, 0.4);
    expect(near.some((p) => p.id === "town1")).toBe(true);
    expect(near.some((p) => p.type === "country")).toBe(false);

    const village = filterObservePlaceLabels(places, { ...view, altitude: 0.15 }, 0.15);
    expect(village.some((p) => p.id === "vil1")).toBe(true);
  });
});
