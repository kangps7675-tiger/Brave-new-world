import { describe, expect, it } from "vitest";
import {
  CRINK_SOURCES,
  crinkBlockedImageHosts,
  crinkHubMonitorSources,
  crinkOutboundChips,
  crinkSourcesForHub,
  isCrinkAnalysisUrl,
  isCrinkBlockedImageHost,
} from "./crinkSourceRegistry";

describe("crinkSourceRegistry", () => {
  it("허브별 primary가 있다", () => {
    for (const hub of ["PRK", "CHN", "RUS", "IRN"] as const) {
      const primaries = crinkSourcesForHub(hub).filter((s) => s.role === "primary");
      expect(primaries.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("hub-monitor 소스는 outbound/counterLens가 아니다", () => {
    for (const s of crinkHubMonitorSources()) {
      expect(s.ingest).not.toBe("outbound");
      expect(s.role).not.toBe("counterLens");
    }
  });

  it("SCSPI·DeepState는 아웃바운드/카운터렌즈만", () => {
    const chn = crinkOutboundChips("CHN");
    expect(chn.some((s) => s.id === "scspi")).toBe(true);
    const rus = crinkOutboundChips("RUS");
    expect(rus.some((s) => s.id === "deepstate-map")).toBe(true);
  });

  it("isis-wisconsin id는 IS와 분리된다", () => {
    const row = CRINK_SOURCES.find((s) => s.id === "isis-wisconsin");
    expect(row).toBeTruthy();
    expect(row!.blockHosts).toContain("isis-online.org");
  });

  it("CSIS·38North·ISW 호스트를 이미지 차단한다", () => {
    expect(isCrinkBlockedImageHost("www.38north.org")).toBe(true);
    expect(isCrinkBlockedImageHost("amti.csis.org")).toBe(true);
    expect(isCrinkBlockedImageHost("understandingwar.org")).toBe(true);
    expect(isCrinkBlockedImageHost("reuters.com")).toBe(false);
    expect(isCrinkAnalysisUrl("https://beyondparallel.csis.org/foo/")).toBe(true);
    expect(crinkBlockedImageHosts().size).toBeGreaterThan(5);
  });

  it("모든 소스가 never-source-asset이다", () => {
    for (const s of CRINK_SOURCES) {
      expect(s.imagePolicy).toBe("never-source-asset");
    }
  });
});
