import { describe, expect, it } from "vitest";
import { neptunPitchDeg, shahedPitchDeg } from "@/lib/cesiumNeptunModels";
import { neptunGltfKindForType } from "@/lib/neptunGltf";
import { SHAHED_DIVE_START } from "@/lib/neptunFlightProfile";
import type { NeptunLiveThreat } from "@/lib/neptun";

function ballisticStub(overrides: Partial<NeptunLiveThreat> = {}): NeptunLiveThreat {
  return {
    id: "t1",
    type: "ballistic",
    title: "test",
    region: "",
    district: "",
    locality: "",
    lat: 48.5,
    lon: 37.5,
    heading: 90,
    confidenceLevel: "medium",
    sourceCount: 1,
    updatedAt: new Date().toISOString(),
    status: "active",
    trail: [],
    predictedLat: 48.5,
    predictedLon: 37.5,
    predictedHeading: 90,
    flying: true,
    ...overrides,
  };
}

describe("neptunGltfKindForType", () => {
  it("maps threat types to mesh kinds", () => {
    expect(neptunGltfKindForType("uav")).toBe("shahed");
    expect(neptunGltfKindForType("recon")).toBe("shahed");
    expect(neptunGltfKindForType("kab")).toBe("glide");
    expect(neptunGltfKindForType("ballistic")).toBe("iskander");
    expect(neptunGltfKindForType("missile")).toBe("cruise");
    expect(neptunGltfKindForType("mig31k")).toBe("jet");
  });
});

describe("shahedPitchDeg", () => {
  it("stays shallow in cruise then nose-dives", () => {
    expect(shahedPitchDeg(0.5)).toBe(-3);
    expect(shahedPitchDeg(SHAHED_DIVE_START)).toBe(-3);
    expect(shahedPitchDeg(0.95)).toBeLessThan(-30);
    expect(shahedPitchDeg(1)).toBeLessThan(-65);
  });
});

describe("neptunPitchDeg", () => {
  it("keeps KAB level; UAV uses shahed cruise attitude", () => {
    expect(neptunPitchDeg(ballisticStub({ type: "kab" }))).toBe(0);
    // empty trail → estimateShahedProgress 0.55 → cruise pitch
    expect(neptunPitchDeg(ballisticStub({ type: "uav" }))).toBe(-3);
  });

  it("pitches ballistic by flight stage (empty trail ≈ late cruise)", () => {
    // estimateBallisticProgress([]) → 0.72 → near-horizontal cruise band
    const pitch = neptunPitchDeg(ballisticStub({ trail: [] }));
    expect(pitch).toBeLessThan(0);
    expect(pitch).toBeGreaterThan(-20);
  });
});
