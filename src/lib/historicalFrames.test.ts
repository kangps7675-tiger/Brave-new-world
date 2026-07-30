import { describe, expect, it } from "vitest";
import {
  historicalFrameObjectKey,
  isLayerReplayable,
} from "@/lib/historicalFrames";

describe("historicalFrames contract", () => {
  it("builds R2 object keys", () => {
    expect(historicalFrameObjectKey("2026-07-20", "firms-fires")).toBe(
      "frames/2026-07-20/firms-fires.json",
    );
  });

  it("only rank/model layers are replayable in tranche 1", () => {
    expect(isLayerReplayable("daily-ranks")).toBe(true);
    expect(isLayerReplayable("firms-fires")).toBe(false);
    expect(isLayerReplayable("ais")).toBe(false);
  });
});
