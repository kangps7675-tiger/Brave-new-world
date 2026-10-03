import { describe, expect, it } from "vitest";
import { resolveRssFlashPlace } from "@/lib/news/rssFlashPlace";

describe("resolveRssFlashPlace", () => {
  it("prefers a city in the title over the theater", () => {
    const place = resolveRssFlashPlace(
      "Missile barrage hits Kyiv",
      "Air defenses engaged across the country",
      "russia-ukraine",
    );
    expect(place?.precision).toBe("city");
    expect(place?.lat).toBeCloseTo(50.45, 1);
    expect(place?.lng).toBeCloseTo(30.52, 1);
  });

  it("reads a Korean city name", () => {
    const place = resolveRssFlashPlace("테헤란을 공습", "이란이 대응을 경고했다", "middle-east");
    expect(place?.precision).toBe("city");
    expect(place?.lat).toBeCloseTo(35.69, 1);
    expect(place?.lng).toBeCloseTo(51.39, 1);
  });

  it("uses a village name from the impact gazetteer", () => {
    const place = resolveRssFlashPlace("Rocket hits Sderot", "", "middle-east");
    expect(place?.precision).toBe("city");
    expect(place?.lat).toBeCloseTo(31.52, 1);
    expect(place?.lng).toBeCloseTo(34.6, 1);
  });

  it("takes a city from the body when the title has none", () => {
    const place = resolveRssFlashPlace(
      "Frontline update",
      "Explosions were reported in Pokrovsk overnight",
      "russia-ukraine",
    );
    expect(place?.label).toMatch(/포크로우스크|Pokrovsk/i);
    expect(place?.lat).toBeCloseTo(48.28, 1);
  });

  it("does not fly to a country centroid when only a country is named", () => {
    expect(
      resolveRssFlashPlace("Iran vows a response", "No city was named", "middle-east"),
    ).toBeNull();
  });

  it("keeps a named strait in the title", () => {
    const place = resolveRssFlashPlace(
      "Tankers pause at the Strait of Hormuz",
      "",
      "middle-east",
    );
    expect(place?.precision).toBe("region");
    expect(place?.lat).toBeCloseTo(26.57, 1);
  });
});
