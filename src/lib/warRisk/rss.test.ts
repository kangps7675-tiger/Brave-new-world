import { describe, expect, it } from "vitest";
import { parseRssItems, splitGoogleNewsTitle } from "./rss";

const GN = `<?xml version="1.0"?><rss><channel><title>x</title>
<item><title>Red Sea war risk premiums hit 1% of ship value - Reuters</title>
<link>https://news.google.com/rss/articles/abc?oc=5</link>
<pubDate>Fri, 16 Oct 2026 08:00:00 GMT</pubDate>
<description>&lt;a href="https://news.google.com/x"&gt;Red Sea war risk premiums hit 1% of ship value&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Reuters&lt;/font&gt;</description>
<source url="https://www.reuters.com">Reuters</source></item>
<item><title><![CDATA[Insurers & owners weigh Hormuz]]></title><link>https://gcaptain.com/a</link>
<description><![CDATA[<p>Premiums rose to 0.5% of hull value.</p>]]></description></item>
<item><title>no link</title></item>
</channel></rss>`;

describe("parseRssItems", () => {
  it("Google News·일반 피드 item 을 읽는다", () => {
    const items = parseRssItems(GN);
    expect(items).toHaveLength(2);
    expect(items[0].source).toBe("Reuters");
    expect(items[0].description).toContain("1% of ship value");
    expect(items[0].description).not.toContain("<");
    expect(items[1].title).toBe("Insurers & owners weigh Hormuz");
    expect(items[1].description).toBe("Premiums rose to 0.5% of hull value.");
    expect(items[1].pubDate).toBeNull();
  });

  it("제목에서 매체명을 뗀다", () => {
    expect(splitGoogleNewsTitle("A - B - Lloyd's List")).toEqual({ headline: "A - B", outlet: "Lloyd's List" });
    expect(splitGoogleNewsTitle("No outlet")).toEqual({ headline: "No outlet", outlet: null });
  });
});
