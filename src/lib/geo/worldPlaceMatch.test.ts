import { describe, expect, it } from "vitest";
import { resolveWorldPlace } from "@/lib/geo/worldPlaceMatch";

describe("resolveWorldPlace", () => {
  it("finds the city named in the headline", () => {
    const hit = resolveWorldPlace(["Tear gas fired as thousands protest in Tbilisi"]);
    expect(hit).toMatchObject({ label: "Tbilisi", precision: "city", country: "Georgia" });
    expect(hit!.lat).toBeCloseTo(41.7, 0);
  });

  it("reads a city from the photo caption when the headline has none", () => {
    const hit = resolveWorldPlace([
      "Protesters clash with police over fuel prices",
      "Demonstrators march through the streets of Nairobi on Tuesday",
    ]);
    expect(hit).toMatchObject({ label: "Nairobi", precision: "city", partIndex: 1 });
  });

  it("falls back to the country's representative city, marked as such", () => {
    const hit = resolveWorldPlace(["Nationwide protests erupt in Kenya after tax bill"]);
    expect(hit).toMatchObject({ label: "Nairobi", precision: "country-rep", country: "Kenya" });
  });

  it("understands demonyms and abbreviations", () => {
    expect(resolveWorldPlace(["Serbian students rally against government"])).toMatchObject({
      country: "Serbia",
      precision: "country-rep",
    });
    expect(resolveWorldPlace(["Unrest spreads across the U.S. cities"])).toMatchObject({
      country: "United States of America",
    });
  });

  it("prefers a real city over a government metonym", () => {
    const hit = resolveWorldPlace(["Washington said protests in Lima were violent"]);
    expect(hit).toMatchObject({ label: "Lima", precision: "city" });
  });

  it("uses a metonym city only when nothing else is named", () => {
    const hit = resolveWorldPlace(["Moscow says it will respond"]);
    expect(hit).toMatchObject({ label: "Moscow", precision: "city" });
  });

  it("does not invent a place", () => {
    expect(resolveWorldPlace(["Markets slide as investors weigh rate outlook"])).toBeNull();
    expect(resolveWorldPlace([null, undefined, ""])).toBeNull();
  });

  it("ignores ambiguous everyday words", () => {
    expect(resolveWorldPlace(["Nice weather and a reading of the bill"])).toBeNull();
  });

  it("prefers a city mentioned with a locative preposition", () => {
    const hit = resolveWorldPlace(["Beijing criticises talks as crowds gather near Jakarta"]);
    expect(hit).toMatchObject({ label: "Jakarta", precision: "city" });
  });
});
