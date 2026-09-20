import { describe, expect, it } from "vitest";
import { buildNeptunLiveBriefContent } from "@/lib/neptunLiveBrief";

describe("buildNeptunLiveBriefContent", () => {
  it("frames live feed without claiming radar accuracy (ko)", () => {
    const brief = buildNeptunLiveBriefContent("ko");
    expect(brief.kind).toBe("neptun");
    expect(brief.title).toContain("실피드");
    expect(brief.paragraphs.join(" ")).toMatch(/neptun\.in\.ua/i);
    expect(brief.paragraphs.join(" ")).toMatch(/추정|실선|점선/);
    expect(brief.paragraphs.join(" ")).toMatch(/대체하지/);
    expect(brief.ctaLabel).toBe("지도에서 보기");
  });

  it("frames live feed without claiming radar accuracy (en)", () => {
    const brief = buildNeptunLiveBriefContent("en");
    expect(brief.kind).toBe("neptun");
    expect(brief.title.toLowerCase()).toMatch(/live/);
    expect(brief.paragraphs.join(" ").toLowerCase()).toMatch(/not a simulation/);
    expect(brief.paragraphs.join(" ").toLowerCase()).toMatch(/estimated|dashed/);
    expect(brief.ctaLabel).toBe("See the map");
  });
});
