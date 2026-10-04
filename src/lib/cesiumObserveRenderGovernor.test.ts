import { describe, expect, it, beforeEach } from "vitest";
import {
  _resetObserveRenderGovernorForTest,
  holdObserveRender,
  installObserveRenderGovernor,
  observeRequestRender,
  releaseObserveRender,
  uninstallObserveRenderGovernor,
} from "@/lib/cesiumObserveRenderGovernor";

describe("cesiumObserveRenderGovernor", () => {
  beforeEach(() => {
    _resetObserveRenderGovernorForTest();
  });

  it("idles when no holds, continuous when held", () => {
    let requestRenderMode = true;
    let renders = 0;
    const viewer = {
      scene: {
        get requestRenderMode() {
          return requestRenderMode;
        },
        set requestRenderMode(v: boolean) {
          requestRenderMode = v;
        },
        maximumRenderTimeChange: 0,
        requestRender: () => {
          renders += 1;
        },
      },
    };

    installObserveRenderGovernor(viewer);
    expect(viewer.scene.maximumRenderTimeChange).toBe(Number.POSITIVE_INFINITY);
    expect(requestRenderMode).toBe(true);

    holdObserveRender("tracked-entity");
    expect(requestRenderMode).toBe(false);

    releaseObserveRender("tracked-entity");
    expect(requestRenderMode).toBe(true);
    expect(renders).toBeGreaterThanOrEqual(1);

    observeRequestRender();
    uninstallObserveRenderGovernor(viewer);
  });
});
