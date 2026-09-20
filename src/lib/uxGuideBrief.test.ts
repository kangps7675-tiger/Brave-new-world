import { describe, expect, it } from "vitest";
import { buildUxGuideBriefContent } from "@/lib/uxGuideBrief";

describe("buildUxGuideBriefContent", () => {
  it("explains lenses and layer→parchment for amateur adults (ko)", () => {
    const brief = buildUxGuideBriefContent("ko");
    expect(brief.title).toMatch(/화면/);
    const body = brief.paragraphs.join(" ");
    expect(body).toMatch(/레이어|양피지/);
    expect(body).toMatch(/역사/);
    expect(body).toMatch(/라이브/);
    expect(body).toMatch(/지경학/);
    expect(body).toMatch(/공식 경보|참고/);
    expect(brief.ctaLabel).toBe("알겠어요");
  });

  it("explains lenses and layer→parchment for amateur adults (en)", () => {
    const brief = buildUxGuideBriefContent("en");
    expect(brief.title.toLowerCase()).toMatch(/screen|read/);
    const body = brief.paragraphs.join(" ").toLowerCase();
    expect(body).toMatch(/layer|parchment/);
    expect(body).toMatch(/history/);
    expect(body).toMatch(/live/);
    expect(body).toMatch(/geoeconomic|market/);
    expect(body).toMatch(/official alert|reference/);
    expect(brief.ctaLabel).toBe("Got it");
  });
});
