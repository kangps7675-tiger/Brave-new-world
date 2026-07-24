import { describe, expect, it } from "vitest";
import {
  adsbMilQuerySchema,
  adsbTrafficQuerySchema,
  firmsFiresQuerySchema,
  gdeltQuerySchema,
  parseSearchParams,
} from "@/lib/apiQuerySchemas";
import { PRIMARY_LIVE_SOURCES, catalogCaption, getSourceNote } from "@/data/sourceCatalog";

describe("PRIMARY_LIVE_SOURCES", () => {
  it("lists NASA FIRMS, ADS-B, and MarineTraffic", () => {
    const ids = PRIMARY_LIVE_SOURCES.map((s) => s.id);
    expect(ids).toEqual(["nasa-firms", "adsb", "marinetraffic"]);
    expect(PRIMARY_LIVE_SOURCES[0]?.nameKo).toContain("NASA FIRMS");
    expect(PRIMARY_LIVE_SOURCES[1]?.nameKo).toBe("ADS-B");
    expect(PRIMARY_LIVE_SOURCES[2]?.nameKo).toBe("MarineTraffic");
  });
});

describe("sourceCatalog captions", () => {
  it("attributes firms-fires to NASA FIRMS", () => {
    const note = getSourceNote("firms-fires");
    expect(note?.attribution).toBe("NASA FIRMS");
    expect(catalogCaption("firms-fires")).toContain("NASA FIRMS");
  });

  it("attributes ais to MarineTraffic", () => {
    expect(getSourceNote("ais")?.attribution).toContain("MarineTraffic");
  });

  it("attributes military-activity to ADS-B", () => {
    expect(getSourceNote("military-activity")?.attribution).toContain("ADS-B");
  });
});

describe("apiQuerySchemas", () => {
  it("parses firms-fires defaults", () => {
    const params = new URLSearchParams();
    const result = parseSearchParams(params, firmsFiresQuerySchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.days).toBe(1);
      expect(result.data.max).toBe(900);
      expect(result.data.live).toBe(false);
    }
  });

  it("rejects invalid firms days", () => {
    const params = new URLSearchParams({ days: "99" });
    const result = parseSearchParams(params, firmsFiresQuerySchema);
    expect(result.ok).toBe(false);
  });

  it("requires lat/lng for adsb-traffic", () => {
    const missing = parseSearchParams(new URLSearchParams(), adsbTrafficQuerySchema);
    expect(missing.ok).toBe(false);
    const ok = parseSearchParams(
      new URLSearchParams({ lat: "37.5", lng: "127.0", dist: "100" }),
      adsbTrafficQuerySchema,
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.lat).toBe(37.5);
      expect(ok.data.dist).toBe(100);
    }
  });

  it("clamps adsb-mil max default", () => {
    const result = parseSearchParams(new URLSearchParams({ live: "1" }), adsbMilQuerySchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.max).toBe(400);
      expect(result.data.live).toBe(true);
    }
  });

  it("rejects gdelt theme=war with allowed-values message", () => {
    const result = parseSearchParams(
      new URLSearchParams({ theme: "war" }),
      gdeltQuerySchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const themeIssue = result.issues.find((i) => i.path.includes("theme"));
      expect(themeIssue?.message).toContain("허용값: cyber, election");
    }
  });

  it("allows gdelt without theme", () => {
    const result = parseSearchParams(new URLSearchParams(), gdeltQuerySchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.theme).toBeUndefined();
  });
});
