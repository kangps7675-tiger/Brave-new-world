import { describe, expect, it } from "vitest";
import { basemapForViewerMode } from "@/lib/basemapMode";

describe("basemapForViewerMode", () => {
  it("maps conflict, history, and economy to terrain (MapLibre 3D buildings)", () => {
    expect(basemapForViewerMode("conflict")).toBe("terrain");
    expect(basemapForViewerMode("history")).toBe("terrain");
    expect(basemapForViewerMode("economy")).toBe("terrain");
  });

  it("maps live tracks to intel", () => {
    expect(basemapForViewerMode("live")).toBe("intel");
  });

  it("leaves satellite (Cesium) without a MapLibre basemap", () => {
    expect(basemapForViewerMode("satellite")).toBeNull();
  });
});
