import { describe, expect, it } from "vitest";
import {
  CONFLICT_LAMP_ACTIVE_FRONT_MIN,
  CONFLICT_LAMP_EAST_ASIA_MIN,
  pickConflictLampNews,
  type LampFeaturedNews,
} from "@/lib/news/periodicBriefing";

function item(partial: {
  id: string;
  title: string;
  theater: string;
  summary?: string;
}) {
  return {
    id: partial.id,
    title: partial.title,
    summary:
      partial.summary ??
      "Military strike and missile deployment reported near the front line with security implications.",
    link: `https://example.com/world/${partial.id}-military-strike-report-2026-08-01`,
    imageUrl: "https://cdn.example.com/images/large-photo-desk.jpg",
    publisher: "Test Wire",
    source: "Test Wire",
    trustTier: 1 as const,
    theater: partial.theater,
    pubDate: new Date().toISOString(),
  };
}

describe("pickConflictLampNews — front parity quotas", () => {
  it("reserves equal slots for ME, Ukraine, and East Asia", () => {
    const items = [
      // East Asia noise that would otherwise dominate score
      ...Array.from({ length: 8 }, (_, i) =>
        item({
          id: `apac-${i}`,
          title: `PLA Taiwan Strait exercise ${i} nuclear escalation red line`,
          theater: "china-taiwan",
          summary:
            "PLA missile drills and invasion signaling near Taiwan Strait with nuclear red line rhetoric and carrier strike group.",
        }),
      ),
      item({
        id: "me-1",
        title: "Iran missile strike near Natanz IRGC",
        theater: "middle-east",
      }),
      item({
        id: "me-2",
        title: "IDF airstrike Gaza after rocket fire",
        theater: "middle-east",
      }),
      item({
        id: "ua-1",
        title: "Ukraine front artillery barrage near Donetsk",
        theater: "russia-ukraine",
      }),
      item({
        id: "ua-2",
        title: "Russia drone strike on Kyiv infrastructure",
        theater: "russia-ukraine",
      }),
      item({
        id: "kr-1",
        title: "North Korea ICBM launch over Korean Peninsula",
        theater: "korea",
      }),
      item({
        id: "jp-1",
        title: "Japan SDF Indo-Pacific drill with AUKUS partners",
        theater: "japan",
        summary:
          "Japan Self-Defense Force joint military exercise with AUKUS in the Indo-Pacific near Okinawa.",
      }),
      item({
        id: "eg-1",
        title: "Egypt Suez Canal navy escort after Red Sea attack",
        theater: "middle-east",
      }),
    ];

    const picked = pickConflictLampNews(items, 10, "en");
    const count = (pred: (n: LampFeaturedNews) => boolean) =>
      picked.filter(pred).length;

    expect(count((n) => n.theater === "middle-east")).toBeGreaterThanOrEqual(
      CONFLICT_LAMP_ACTIVE_FRONT_MIN,
    );
    expect(count((n) => n.theater === "russia-ukraine")).toBeGreaterThanOrEqual(
      CONFLICT_LAMP_ACTIVE_FRONT_MIN,
    );
    expect(
      count(
        (n) =>
          n.theater === "china-taiwan" ||
          n.theater === "korea" ||
          n.theater === "japan",
      ),
    ).toBeGreaterThanOrEqual(CONFLICT_LAMP_EAST_ASIA_MIN);
  });
});
