import { describe, expect, it } from "vitest";
import {
  NEW_PROJECT_LAYER_DATA_LICENSE,
  ODBL_LICENSE_ID,
  PROPRIETARY_LICENSE_ID,
  attributionMentionsOdbl,
  isOwnWorkLicense,
  resolveLayerDataLicense,
} from "@/lib/licensing/odblDataPolicy";

describe("dataLicense policy", () => {
  it("defaults new own-work layers to proprietary, not ODbL", () => {
    expect(NEW_PROJECT_LAYER_DATA_LICENSE).toBe(PROPRIETARY_LICENSE_ID);
    expect(NEW_PROJECT_LAYER_DATA_LICENSE).not.toBe(ODBL_LICENSE_ID);
  });

  it("recognises only proprietary as own work", () => {
    expect(isOwnWorkLicense("proprietary")).toBe(true);
    expect(isOwnWorkLicense("ODbL-1.0")).toBe(false);
    expect(isOwnWorkLicense("upstream")).toBe(false);
    expect(isOwnWorkLicense(undefined)).toBe(false);
  });

  it("reads explicit dataLicense", () => {
    expect(
      resolveLayerDataLicense({
        dataLicense: "CC-BY-4.0",
        commercialUse: "allowed",
      }),
    ).toBe("CC-BY-4.0");
  });

  it("detects inherited ODbL from attribution", () => {
    expect(attributionMentionsOdbl("© OSM contributors · ODbL")).toBe(true);
    expect(
      resolveLayerDataLicense({
        commercialUse: "allowed",
        attribution: "OpenStreetMap · ODbL",
      }),
    ).toBe(ODBL_LICENSE_ID);
  });

  it("does not guess proprietary or ODbL for plain allowed upstream", () => {
    expect(
      resolveLayerDataLicense({
        commercialUse: "allowed",
        attribution: "NASA FIRMS",
      }),
    ).toBe("unknown");
  });

  it("marks contract sources as upstream", () => {
    expect(
      resolveLayerDataLicense({
        commercialUse: "license-required",
        attribution: "MarineTraffic",
      }),
    ).toBe("upstream");
  });
});
