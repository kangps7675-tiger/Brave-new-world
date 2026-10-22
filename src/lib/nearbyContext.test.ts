import { describe, expect, it } from "vitest";
import { nearbyPlaces } from "@/lib/nearbyContext";

describe("nearbyPlaces", () => {
  it("호르무즈 근처에서는 호르무즈 해협이 가장 가깝다", () => {
    const r = nearbyPlaces(26.5, 56.3, "ko");
    expect(r[0]?.kind).toBe("choke");
    expect(r[0]?.name).toContain("호르무즈");
  });
  it("망망대해에서는 비어 있다", () => {
    expect(nearbyPlaces(-45, -140, "ko")).toEqual([]);
  });
  it("좌표가 이상하면 빈 배열", () => {
    expect(nearbyPlaces(NaN, 0, "ko")).toEqual([]);
  });
});
