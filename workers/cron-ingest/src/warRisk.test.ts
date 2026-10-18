import { describe, expect, it } from "vitest";
import { rowsFromFeed } from "./warRisk";

const XML = `<rss><channel>
<item><title>Middle East shipping insurance costs rise on Hormuz risks: Marsh - S&amp;P Global</title><link>https://news.google.com/rss/articles/A1</link><pubDate>Wed, 22 Jul 2026 10:00:00 GMT</pubDate><description>&lt;a href="x"&gt;Middle East shipping insurance costs rise on Hormuz risks: Marsh&lt;/a&gt;</description><source url="https://spglobal.com">S&amp;P Global</source></item>
<item><title>Strait of Hormuz rates hit 7.5%-10% of hull value - S&amp;P Global</title><link>https://news.google.com/rss/articles/A2</link><pubDate>Wed, 22 Jul 2026 11:00:00 GMT</pubDate><source url="https://spglobal.com">S&amp;P Global</source></item>
<item><title>Oil jumps 4% on Hormuz war risk - Bloomberg</title><link>https://news.google.com/rss/articles/A3</link></item>
</channel></rss>`;

describe("rowsFromFeed", () => {
  it("수치가 있는 기사만 행으로 만든다", async () => {
    const rows = await rowsFromFeed(XML, "test");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      region: "hormuz",
      rate_pct: 7.5,
      rate_high_pct: 10,
      outlet: "S&P Global",
      published_at: "2026-07-22T11:00:00.000Z",
    });
    expect(rows[0].id).toHaveLength(20);
  });
});
