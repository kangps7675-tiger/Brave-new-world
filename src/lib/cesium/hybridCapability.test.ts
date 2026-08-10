import { describe, expect, it } from "vitest";
import {
  isCesiumHybridHardwareOk,
  isWeakGpuRenderer,
} from "@/lib/cesium/hybridCapability";

describe("isWeakGpuRenderer", () => {
  it("flags Intel UHD 620 class", () => {
    expect(isWeakGpuRenderer("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(
      true,
    );
  });

  it("allows discrete NVIDIA", () => {
    expect(isWeakGpuRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)")).toBe(
      false,
    );
  });
});

describe("isCesiumHybridHardwareOk", () => {
  it("blocks ultraLite", () => {
    expect(isCesiumHybridHardwareOk({ ultraLite: true, gpuRenderer: "NVIDIA GeForce RTX 3060" })).toBe(
      false,
    );
  });

  it("blocks UHD 620 even with 8GB", () => {
    expect(
      isCesiumHybridHardwareOk({
        deviceMemoryGb: 8,
        hardwareConcurrency: 4,
        gpuRenderer: "Intel(R) UHD Graphics 620",
      }),
    ).toBe(false);
  });

  it("allows unknown strong machine", () => {
    expect(
      isCesiumHybridHardwareOk({
        deviceMemoryGb: 16,
        hardwareConcurrency: 8,
        gpuRenderer: "NVIDIA GeForce RTX 3060",
      }),
    ).toBe(true);
  });
});
