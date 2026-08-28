import { describe, expect, it } from "vitest";
import {
  CRINK_PLACES,
  resolveCrinkPlace,
  crinkPlaceById,
} from "./crinkPlaceGazetteer";

describe("crinkPlaceGazetteer", () => {
  it("영변을 제목에서 잡는다", () => {
    const hit = resolveCrinkPlace(
      "Suspected Uranium Enrichment Building at Yongbyon Complete",
      "PRK",
    );
    expect(hit?.placeId).toBe("yongbyon");
    expect(hit?.lat).toBeCloseTo(39.8, 1);
  });

  it("환초 Fiery Cross를 잡는다", () => {
    const hit = resolveCrinkPlace("AMTI imagery of Fiery Cross Reef airstrip", "CHN");
    expect(hit?.placeId).toBe("fiery_cross_reef");
  });

  it("이스파한·나탄즈를 잡는다", () => {
    expect(resolveCrinkPlace("Strike near Isfahan nuclear site", "IRN")?.placeId).toBe(
      "isfahan",
    );
    expect(resolveCrinkPlace("centrifuges at Natanz", "IRN")?.placeId).toBe("natanz");
  });

  it("허브 힌트가 없으면 전 허브에서 매칭", () => {
    expect(resolveCrinkPlace("Pokrovsk front line advances")?.hub).toBe("RUS");
  });

  it("placeById 가 동작한다", () => {
    expect(crinkPlaceById("fordow")?.labelKo).toBe("포르도");
    expect(CRINK_PLACES.length).toBeGreaterThan(8);
  });
});
