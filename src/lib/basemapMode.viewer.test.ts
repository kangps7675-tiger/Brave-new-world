import { describe, expect, it } from "vitest";
import { basemapForViewerMode } from "@/lib/basemapMode";

describe("basemapForViewerMode", () => {
  it("maps conflict, history, economy, and live to intel", () => {
    expect(basemapForViewerMode("conflict")).toBe("intel");
    expect(basemapForViewerMode("history")).toBe("intel");
    expect(basemapForViewerMode("economy")).toBe("intel");
    expect(basemapForViewerMode("live")).toBe("intel");
  });

  it("leaves satellite (Cesium) without a MapLibre basemap", () => {
    expect(basemapForViewerMode("satellite")).toBeNull();
  });
});
