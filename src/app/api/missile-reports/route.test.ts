import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());
describe("missile report collection", () => {
  it("returns reviewed events when every live feed fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await (await GET()).json();
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.candidates).toEqual([]);
    expect(result.failedFeeds).toBe(3);
  });
  it("deduplicates candidates, rejects unsafe links and preserves review status", async () => {
    const pubDate = new Date().toUTCString();
    const xml = `<rss><channel><item><title>North Korea missile: Pentagon briefing</title><link>https://example.com/news</link><pubDate>${pubDate}</pubDate></item><item><title>North Korea missile: Pentagon</title><link>javascript:alert(1)</link><pubDate>${pubDate}</pubDate></item></channel></rss>`;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(xml)));
    const result = await (await GET()).json();
    expect(result.failedFeeds).toBe(0);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ agencies: ["pentagon"], status: "needs-review" });
    expect(result.candidates[0]).not.toHaveProperty("coordinates");
  });
  it("reports malformed feeds separately from empty search results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>blocked</html>")));
    expect((await (await GET()).json()).failedFeeds).toBe(3);
  });
  it("keeps search provenance separate from confirmed agency mentions", async () => {
    const xml = '<rss><channel><item><title>North Korea launches ballistic missile</title><link>https://example.com/search-hit</link><pubDate>' + new Date().toUTCString() + '</pubDate></item></channel></rss>';
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(xml)));
    const result = await (await GET()).json();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].agencies).toEqual([]);
    expect(result.candidates[0].queriedAgencies).toEqual(["jcs", "jmod", "pentagon"]);
    expect(result.candidates[0].status).toBe("needs-review");
  });
  it("rejects stale articles and avoids caching incomplete collections", async () => {
    const xml = '<rss><channel><item><title>North Korea missile Pentagon</title><link>https://example.com/old</link><pubDate>2020-01-01</pubDate></item></channel></rss>';
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")).mockImplementation(async () => new Response(xml)));
    const response = await GET();
    const result = await response.json();
    expect(result.failedFeeds).toBe(1);
    expect(result.candidates).toEqual([]);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
