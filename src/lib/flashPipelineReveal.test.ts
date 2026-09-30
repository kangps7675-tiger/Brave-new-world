import { describe, expect, it } from "vitest";
import {
  incidentSuggestsEnergyPipelines,
  pipelineRevealRestorePatch,
  PIPELINE_REVEAL_ON,
} from "@/lib/flashPipelineReveal";

describe("flashPipelineReveal", () => {
  it("flags middle-east / ukraine theaters", () => {
    expect(incidentSuggestsEnergyPipelines({ theater: "middle-east" })).toBe(true);
    expect(incidentSuggestsEnergyPipelines({ theater: "ukraine" })).toBe(true);
    expect(incidentSuggestsEnergyPipelines({ theater: "taiwan" })).toBe(false);
  });

  it("flags pipeline keywords in copy", () => {
    expect(
      incidentSuggestsEnergyPipelines({
        theater: "global",
        title: "Attack on oil pipeline near Kirkuk",
      }),
    ).toBe(true);
    expect(
      incidentSuggestsEnergyPipelines({
        theater: "global",
        title: "Diplomatic talks resume",
      }),
    ).toBe(false);
  });

  it("restores only previously-off pipeline prefs", () => {
    expect(
      pipelineRevealRestorePatch({
        showOilPipelines: false,
        showGasPipelines: true,
        showSubseaPipelines: false,
      }),
    ).toEqual({
      showOilPipelines: false,
      showSubseaPipelines: false,
    });
    expect(PIPELINE_REVEAL_ON.showOilPipelines).toBe(true);
  });
});
