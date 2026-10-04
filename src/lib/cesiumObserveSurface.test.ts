import { describe, expect, it } from "vitest";
import {
  imageryAlphaForSurface,
  OBSERVE_PHOTOREAL_IMAGERY_FLOOR,
  createObserveSurfaceController,
} from "@/lib/cesiumObserveSurface";
import { _resetObserveRenderGovernorForTest } from "@/lib/cesiumObserveRenderGovernor";

describe("cesiumObserveSurface", () => {
  it("imageryAlphaForSurface fades photoreal to floor and satellite to 1", () => {
    expect(imageryAlphaForSurface("photoreal", 0)).toBeCloseTo(1, 5);
    expect(imageryAlphaForSurface("photoreal", 1)).toBeCloseTo(
      OBSERVE_PHOTOREAL_IMAGERY_FLOOR,
      5,
    );
    expect(imageryAlphaForSurface("satellite", 0)).toBeCloseTo(
      OBSERVE_PHOTOREAL_IMAGERY_FLOOR,
      5,
    );
    expect(imageryAlphaForSurface("satellite", 1)).toBeCloseTo(1, 5);
  });

  it("generation ignores stale fade completion", () => {
    _resetObserveRenderGovernorForTest();
    const imagery = { alpha: 1, show: true };
    const tileset = {
      show: false,
      isDestroyed: () => false,
    };
    let settling = false;
    const steps: Array<(t: number) => void> = [];
    const ctrl = createObserveSurfaceController({
      viewer: {
        isDestroyed: () => false,
        scene: {
          verticalExaggeration: 1.85,
          globe: { show: true },
          requestRender: () => undefined,
        },
      },
      getImageryLayer: () => imagery,
      getOsmBuildings: () => null,
      getGoogleTileset: () => tileset,
      terrainExaggeration: 1.85,
      onSettlingChange: (v) => {
        settling = v;
      },
      scheduleFade: (step) => {
        steps.push(step);
        return () => undefined;
      },
    });

    ctrl.switchTo("photoreal");
    expect(steps.length).toBe(1);
    ctrl.switchTo("satellite");
    expect(steps.length).toBe(2);
    // 첫 fade 완료는 stale — satellite 최종 alpha 유지
    steps[0](1);
    expect(imagery.alpha).not.toBe(0);
    steps[1](1);
    expect(imagery.alpha).toBeCloseTo(1, 5);
    expect(tileset.show).toBe(false);
    expect(settling).toBe(false);
    ctrl.dispose();
  });
});
