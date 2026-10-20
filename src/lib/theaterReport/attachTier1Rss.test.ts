import { describe, expect, it } from "vitest";
import type { NewsStreamItem } from "@/lib/news/types";
import {
  attachTier1RssToRows,
  filterTier1RssForTheater,
} from "@/lib/theaterReport/attachTier1Rss";
import type { TheaterSitrepRow } from "@/lib/theaterReport/types";

function item(partial: Partial<NewsStreamItem> & Pick<NewsStreamItem, "id" | "title" | "link">): NewsStreamItem {
  return {
    source: "Reuters",
    pubDate: new Date().toISOString(),
    theater: "russia-ukraine",
    trustTier: 1,
    ...partial,
  };
}

describe("filterTier1RssForTheater", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  const cutoff = now - 72 * 3600_000;

  it("keeps tier1 ukraine theater items in window", () => {
    const out = filterTier1RssForTheater({
      regionId: "ukraine",
      cutoffMs: cutoff,
      nowMs: now,
      items: [
        item({
          id: "a",
          title: "Fighting near Kharkiv",
          link: "https://www.reuters.com/a",
          pubDate: "2026-10-02T10:00:00Z",
          trustTier: 1,
          theater: "russia-ukraine",
        }),
        item({
          id: "b",
          title: "Fighting near Kharkiv",
          link: "https://www.reuters.com/b",
          pubDate: "2026-10-02T11:00:00Z",
          trustTier: 2,
          theater: "russia-ukraine",
        }),
      ],
    });
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("requires keyword for middle-east iran slot", () => {
    const out = filterTier1RssForTheater({
      regionId: "iran",
      cutoffMs: cutoff,
      nowMs: now,
      items: [
        item({
          id: "y",
          title: "Houthi strike in Red Sea",
          link: "https://www.reuters.com/y",
          pubDate: "2026-10-02T10:00:00Z",
          theater: "middle-east",
        }),
        item({
          id: "i",
          title: "Iran warns on Strait of Hormuz",
          link: "https://www.reuters.com/i",
          pubDate: "2026-10-02T10:00:00Z",
          theater: "middle-east",
        }),
      ],
    });
    expect(out.map((x) => x.id)).toEqual(["i"]);
  });
});

describe("attachTier1RssToRows", () => {
  it("soft-joins by time and token overlap", () => {
    const rows: TheaterSitrepRow[] = [
      {
        id: "row1",
        occurredAt: "2026-10-02T12:00:00Z",
        place: "Kharkiv",
        kind: "drone",
        killed: null,
        wounded: null,
        materialDamage: null,
        title: "Drone strike in Kharkiv",
        sourceUrl: "https://liveuamap.com/1",
        imageUrl: null,
        viaSource: null,
      },
    ];
    const { rows: next, theaterRefs } = attachTier1RssToRows({
      rows,
      rssItems: [
        item({
          id: "rss1",
          title: "Explosion reported in Kharkiv overnight",
          link: "https://www.reuters.com/k",
          pubDate: "2026-10-02T14:00:00Z",
        }),
        item({
          id: "rss2",
          title: "Unrelated market news",
          link: "https://www.reuters.com/m",
          pubDate: "2026-10-02T14:00:00Z",
        }),
      ],
    });
    expect(next[0]?.rssRefs?.map((r) => r.id)).toEqual(["rss1"]);
    expect(theaterRefs.map((r) => r.id)).toEqual(["rss2"]);
  });
});
