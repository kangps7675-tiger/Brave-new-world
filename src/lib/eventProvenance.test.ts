import { describe, expect, it } from "vitest";
import {
  provenanceBadgeLabel,
  provenanceFromActivation,
} from "@/lib/eventProvenance";

describe("eventProvenance", () => {
  it("seed fallback id", () => {
    expect(
      provenanceFromActivation({
        id: "seed-ed-poland",
        hadSeedMatch: true,
        seedSourceUrl: "https://example.com",
      }),
    ).toBe("seed-fallback");
  });

  it("live with seed source url", () => {
    expect(
      provenanceFromActivation({
        id: "live-ed-1",
        hadSeedMatch: true,
        seedSourceUrl: "https://example.com/wiki",
      }),
    ).toBe("seed-source");
  });

  it("live-only without anchor", () => {
    expect(
      provenanceFromActivation({
        id: "live-ed-2",
        hadSeedMatch: false,
        gdeltSourceUrl: "https://gdelt.example",
      }),
    ).toBe("live-only");
  });

  it("badge labels", () => {
    expect(provenanceBadgeLabel("live-only", "ko")).toContain("라이브");
  });
});
