import { describe, expect, it } from "vitest";
import {
  extractTensionZScores,
  formatTensionDriverLine,
  tensionDriverSuffix,
} from "@/lib/tensionDrivers";

const detailWithZ = {
  displayScore: 72,
  components: {
    zScores: {
      mentions: 1.4,
      points: 0.3,
      fireCount: 2.5,
      telegramCount: -0.2,
      airRaidScore: 0.1,
    },
  },
};

describe("tensionDrivers", () => {
  it("extracts nested zScores", () => {
    const z = extractTensionZScores(detailWithZ);
    expect(z?.fireCount).toBe(2.5);
    expect(z?.mentions).toBe(1.4);
  });

  it("formats rising drivers without sigma", () => {
    const line = formatTensionDriverLine(detailWithZ, "ko", { rising: true });
    expect(line).toContain("주요인");
    expect(line).toContain("위성 화재");
    expect(line).toContain("최근 90일 평균보다");
    expect(line).not.toMatch(/σ|z-score|zScore/i);
  });

  it("formats English without jargon", () => {
    const line = formatTensionDriverLine(detailWithZ, "en", { rising: true });
    expect(line).toMatch(/^Mainly:/);
    expect(line).toContain("satellite hotspots");
    expect(line).not.toMatch(/σ|std|z-score/i);
  });

  it("returns null when nothing notable", () => {
    expect(
      formatTensionDriverLine(
        { components: { zScores: { mentions: 0.2, fireCount: 0.1 } } },
        "ko",
      ),
    ).toBeNull();
  });

  it("suffix joins with middot", () => {
    const s = tensionDriverSuffix(detailWithZ, "ko");
    expect(s.startsWith(" · ")).toBe(true);
  });
});
