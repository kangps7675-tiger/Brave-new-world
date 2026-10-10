import { describe, expect, it } from "vitest";
import {
  peelUrlsFromText,
  splitLiveuaTitleBody,
} from "@/lib/liveuamap/peelTitleUrls";

describe("peelUrlsFromText", () => {
  it("strips urls from title text", () => {
    const r = peelUrlsFromText(
      "Oil depot hit https://liveuamap.com/en/2026/foo",
    );
    expect(r.text).toBe("Oil depot hit");
    expect(r.urls[0]).toContain("liveuamap.com");
  });
});

describe("splitLiveuaTitleBody", () => {
  it("moves title urls into body", () => {
    const r = splitLiveuaTitleBody(
      "Strike near depot https://example.com/a",
      "Strike near depot https://example.com/a",
      "https://liveuamap.com/",
    );
    expect(r.title).toBe("Strike near depot");
    expect(r.body).toContain("Strike near depot");
    expect(r.body).toContain("https://example.com/a");
    expect(r.title).not.toMatch(/https?:\/\//);
    expect(r.sourceUrl).toBe("https://example.com/a");
  });

  it("keeps separate body text and appends peeled url", () => {
    const r = splitLiveuaTitleBody(
      "Clashes https://news.example/x",
      "General Staff reports clashes",
      "https://liveuamap.com/en/item",
    );
    expect(r.title).toBe("Clashes");
    expect(r.body).toContain("General Staff reports clashes");
    expect(r.body).toContain("https://news.example/x");
    expect(r.sourceUrl).toBe("https://liveuamap.com/en/item");
  });
});
