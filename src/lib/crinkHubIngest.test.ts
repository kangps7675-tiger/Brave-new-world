import { describe, expect, it } from "vitest";
import { parseHubMonitorFeedXml, attachHubGeoToRow } from "./crinkHubIngest";
import type { CrinkSourceDef } from "@/data/crinkSourceRegistry";
import type { ReferenceMonitorRow } from "./referenceMonitor";

const SOURCE: CrinkSourceDef = {
  id: "38-north",
  label: "38 North",
  labelKo: "38 노스",
  hub: "PRK",
  role: "primary",
  stream: "hub-monitor",
  ingest: "rss",
  feedUrl: "https://www.38north.org/feed/",
  homepage: "https://www.38north.org/",
  blockHosts: ["38north.org"],
  imagePolicy: "never-source-asset",
  commercialUse: "unknown",
  commercialNote: "test",
  tierNeedles: ["38 north"],
};

const FEED = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<item>
  <title>Activity at Yongbyon Nuclear Complex</title>
  <link>https://www.38north.org/2026/04/yongbyon/</link>
  <pubDate>Mon, 13 Apr 2026 12:00:00 +0000</pubDate>
  <description>Satellite imagery of the Yongbyon reactor site.</description>
</item>
</channel></rss>`;

describe("crinkHubIngest", () => {
  it("RSS를 hub 행으로 파싱하고 영변 좌표를 붙인다", () => {
    const rows = parseHubMonitorFeedXml(SOURCE, FEED);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.hub).toBe("PRK");
    expect(rows[0]!.place_id).toBe("yongbyon");
    expect(rows[0]!.lat).toBeCloseTo(39.8, 1);
    expect(rows[0]!.topics_json).toContain("hub:PRK");
  });

  it("attachHubGeoToRow 가 Beyond Parallel 행에 hub를 채운다", () => {
    const base: ReferenceMonitorRow = {
      id: "x",
      source: "csis-beyond-parallel",
      source_label: "CSIS",
      channel: "rss",
      url: "https://beyondparallel.csis.org/yongbyon/",
      title: "Yongbyon update",
      summary: null,
      author: null,
      categories_json: "[]",
      topics_json: '["dprk"]',
      relevance: 3,
      published_at: null,
      updated_at: null,
    };
    const row = attachHubGeoToRow(base, "PRK");
    expect(row.hub).toBe("PRK");
    expect(row.place_id).toBe("yongbyon");
  });
});
