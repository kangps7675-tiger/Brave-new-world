import { describe, expect, it } from "vitest";
import {
  filterPlaceLabelsForOverlay,
  type CesiumPlaceLabel,
} from "@/lib/cesiumPlaceLabels";

function place(
  partial: Partial<CesiumPlaceLabel> & Pick<CesiumPlaceLabel, "id" | "type">,
): CesiumPlaceLabel {
  return {
    name: partial.name ?? partial.id,
    nameKo: partial.nameKo,
    lat: partial.lat ?? 0,
    lng: partial.lng ?? 0,
    population: partial.population,
    scalerank: partial.scalerank,
    ...partial,
  };
}

describe("filterPlaceLabelsForOverlay", () => {
  it("keeps country entities only when place tiles are on", () => {
    const out = filterPlaceLabelsForOverlay([
      place({ id: "kr", type: "country", name: "Korea" }),
      place({
        id: "seoul",
        type: "city",
        name: "Seoul",
        population: 10_000_000,
        scalerank: 0,
      }),
      place({ id: "town-a", type: "town", name: "Town", population: 50_000 }),
    ]);
    expect(out.map((p) => p.id)).toEqual(["kr"]);
  });
});
