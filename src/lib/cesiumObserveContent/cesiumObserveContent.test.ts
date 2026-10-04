import { describe, expect, it } from "vitest";
import {
  AUXILIARY_CONTENT_LAYERS,
  KILLER_CONTENT_AXES,
  KILLER_CONTENT_POLICY_ORDER,
  OBSERVE_STAGE_PUBLIC_KEYS,
  createObserveStagePublicApi,
  killerAxesInPolishOrder,
} from "@/lib/cesiumObserveContent";

describe("Killer Content Contract", () => {
  it("locks Stage public surface to camera/settle/governor/cinemaPref", () => {
    expect([...OBSERVE_STAGE_PUBLIC_KEYS]).toEqual([
      "camera",
      "settle",
      "governor",
      "cinemaPref",
    ]);
  });

  it("orders polish Google+LiveUA → AIS → markets", () => {
    expect([...KILLER_CONTENT_POLICY_ORDER]).toEqual([
      "google-liveua",
      "ais-tagging",
      "markets-window",
    ]);
    const ordered = killerAxesInPolishOrder();
    expect(ordered.map((a) => a.polishOrder)).toEqual([1, 2, 3]);
    expect(ordered[0]?.id).toBe("google-liveua");
    expect(ordered[2]?.surface).toBe("html-panel");
  });

  it("keeps markets outside WebGL-only surface", () => {
    expect(KILLER_CONTENT_AXES["markets-window"].surface).toBe("html-panel");
    expect(KILLER_CONTENT_AXES["google-liveua"].paths.length).toBeGreaterThan(0);
    expect(KILLER_CONTENT_AXES["ais-tagging"].paths.length).toBeGreaterThan(0);
  });

  it("lists auxiliary layers behind killer clutter budget", () => {
    expect(AUXILIARY_CONTENT_LAYERS).toContain("firms");
    expect(AUXILIARY_CONTENT_LAYERS).toContain("breaking-flash");
    for (const id of KILLER_CONTENT_POLICY_ORDER) {
      expect(AUXILIARY_CONTENT_LAYERS).not.toContain(id);
    }
  });

  it("createObserveStagePublicApi only exposes the four Stage keys", () => {
    const api = createObserveStagePublicApi({
      camera: {
        flyTo: () => undefined,
        getHeightM: () => 0,
        getCenter: () => null,
      },
      settle: {
        armSettle: () => undefined,
        isSettling: () => false,
      },
    });
    expect(Object.keys(api).sort()).toEqual(
      [...OBSERVE_STAGE_PUBLIC_KEYS].sort(),
    );
    expect(typeof api.governor.requestRender).toBe("function");
    expect(typeof api.cinemaPref.read).toBe("function");
  });
});
