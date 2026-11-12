import { describe, expect, it } from "vitest";
import { officialFeedSources, rowsFromOfficialFeed } from "./ingestRows";

const RSS = `<rss><channel>
<item><title>Joint Statement on the Strait of Hormuz</title><link>https://example.gov/a</link><pubDate>Wed, 11 Nov 2026 10:00:00 GMT</pubDate><description>Ministers discussed Hormuz shipping.</description></item>
<item><title>Remarks by the Secretary at a press availability</title><link>https://example.gov/b</link><pubDate>Wed, 11 Nov 2026 11:00:00 GMT</pubDate></item>
</channel></rss>`;

describe("officialDocsIngest", () => {
  it("공동성명만 남기고 발언은 버리며 지명 태그를 붙인다", async () => {
    const rows = await rowsFromOfficialFeed(RSS, { issuerId: "us", url: "https://example.gov/feed", label: "테스트" });
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("joint-statement");
    expect(rows[0].tags).toBe("hormuz");
    expect(rows[0].published_at).toBe("2026-11-11");
    expect(rows[0].id).toHaveLength(20);
  });

  it("등록된 피드와 내장 피드를 합쳐 중복 없이 돌려준다", () => {
    const sources = officialFeedSources();
    expect(sources.length).toBeGreaterThanOrEqual(14);
    expect(sources.filter((s) => s.page).map((s) => s.issuerId).sort()).toEqual(["cn", "fr", "fr", "jp", "kr", "nato", "tw"]);
    expect(new Set(sources.map((s) => s.url)).size).toBe(sources.length);
  });
});
