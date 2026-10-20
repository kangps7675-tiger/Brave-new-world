import { describe, expect, it } from "vitest";
import {
  isPerimeterIso,
  matchSpilloverSignal,
  natoArticle,
  taiwanStraitWhyItMattersLines,
} from "./allianceDoctrine";

describe("allianceDoctrine", () => {
  it("loads NATO Article 5 text", () => {
    const a5 = natoArticle(5);
    expect(a5?.textEn).toMatch(/armed attack against one or more of them/i);
    expect(a5?.uiTag).toBe("collective-defence");
  });

  it("flags Poland air-raid style spillover without soft news", () => {
    const hit = matchSpilloverSignal(
      "Poland issues air raid alert after drones approach the border",
    );
    expect(hit.hit).toBe(true);
    expect(hit.flank).toBe("atlantic");
  });

  it("rejects soft news even with NATO mention", () => {
    const hit = matchSpilloverSignal("NATO celebrity football gala in Warsaw");
    expect(hit.hit).toBe(false);
  });

  it("knows perimeter ISOs on both flanks", () => {
    expect(isPerimeterIso("POL")).toBe(true);
    expect(isPerimeterIso("JPN")).toBe(true);
    expect(isPerimeterIso("BRA")).toBe(false);
  });

  it("exposes Taiwan Strait trade lines with attribution", () => {
    const lines = taiwanStraitWhyItMattersLines("ko");
    expect(lines.some((l) => l.includes("일본"))).toBe(true);
    expect(lines.some((l) => /CSIS/i.test(l))).toBe(true);
  });
});
