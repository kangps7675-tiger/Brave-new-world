import { describe, expect, it } from "vitest";
import {
  DESK_CHANNEL_STEP_MS,
  DESK_RING_STEP_MS,
  buildCorroborationRings,
  deskVerifyPhase,
  litChannelCount,
  litRingCount,
} from "@/lib/intelContract/deskVerifySequence";

describe("buildCorroborationRings", () => {
  it("point-only when single source", () => {
    expect(
      buildCorroborationRings({
        independenceCount: 1,
        modalities: ["media"],
        channelCount: 1,
      }),
    ).toHaveLength(0);
  });

  it("stacks rings by independence and colors by modality", () => {
    const rings = buildCorroborationRings({
      independenceCount: 3,
      modalities: ["sensor", "media"],
      channelCount: 2,
    });
    expect(rings).toHaveLength(3);
    expect(rings[0]!.appearAtMs).toBe(2 * DESK_CHANNEL_STEP_MS);
    expect(rings[1]!.appearAtMs).toBe(
      2 * DESK_CHANNEL_STEP_MS + DESK_RING_STEP_MS,
    );
    expect(rings[0]!.colorCss).not.toEqual(rings[1]!.colorCss);
  });

  it("collapses rings when disconfirm hits", () => {
    const normal = buildCorroborationRings({
      independenceCount: 2,
      modalities: ["media"],
      channelCount: 1,
    });
    const cooled = buildCorroborationRings({
      independenceCount: 2,
      modalities: ["media"],
      channelCount: 1,
      disconfirmHitCount: 2,
    });
    expect(cooled[0]!.radiusFactor).toBeLessThan(normal[0]!.radiusFactor);
  });
});

describe("sequence timing", () => {
  it("lights channels then rings then locks", () => {
    expect(litChannelCount(0, 3)).toBe(1);
    expect(litChannelCount(DESK_CHANNEL_STEP_MS, 3)).toBe(2);
    const rings = buildCorroborationRings({
      independenceCount: 2,
      modalities: ["media"],
      channelCount: 2,
    });
    expect(litRingCount(0, rings)).toBe(0);
    expect(litRingCount(rings[0]!.appearAtMs, rings)).toBe(1);
    expect(deskVerifyPhase(0, 2, 2)).toBe("channels");
    expect(
      deskVerifyPhase(2 * DESK_CHANNEL_STEP_MS + DESK_RING_STEP_MS, 2, 2),
    ).toBe("rings");
  });
});
