import { describe, expect, it } from "vitest";
import { assertValidSeedEvents, straitEventSeedSchema } from "@/lib/straitReplay/eventSchema";
import { loadSeedEventsForStrait } from "@/lib/straitReplay/loadSeed";

describe("strait event seed validation", () => {
  it("rejects events without sourceUrls", () => {
    const r = straitEventSeedSchema.safeParse({
      id: "x",
      straitId: "hormuz",
      occurredOn: "2023-05-03",
      lat: 26.55,
      lng: 56.25,
      titleKo: "t",
      titleEn: "t",
      kind: "seizure",
      sourceUrls: [],
      curatedBy: "human",
      reviewed: true,
      isSynthetic: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejects coordinates outside strait bbox", () => {
    const r = straitEventSeedSchema.safeParse({
      id: "x",
      straitId: "hormuz",
      occurredOn: "2023-05-03",
      lat: 0,
      lng: 0,
      titleKo: "t",
      titleEn: "t",
      kind: "seizure",
      sourceUrls: [
        {
          label: "IMF",
          url: "https://portwatch.imf.org/",
          publisher: "IMF",
        },
      ],
      curatedBy: "human",
      reviewed: true,
      isSynthetic: true,
    });
    expect(r.success).toBe(false);
  });

  it("loads hormuz synthetic seeds", () => {
    const events = loadSeedEventsForStrait("hormuz");
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.every((e) => e.isSynthetic)).toBe(true);
    expect(() => assertValidSeedEvents({ events })).not.toThrow();
  });
});
