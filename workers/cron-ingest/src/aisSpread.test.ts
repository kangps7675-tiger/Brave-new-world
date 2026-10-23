import { describe, expect, it } from "vitest";
import { spreadByGrid } from "./aisSpread";

describe("spreadByGrid", () => {
  it("한쪽에 몰린 입력에서도 다른 해역을 남긴다", () => {
    const red = Array.from({ length: 100 }, (_, i) => ({ lat: 15 + (i % 3) * 0.01, lng: 42 + i * 0.001 }));
    const far = [{ lat: -30, lng: 20 }, { lat: 35, lng: 140 }];
    const out = spreadByGrid([...red, ...far], 10);
    expect(out).toHaveLength(10);
    expect(out).toContainEqual(far[0]);
    expect(out).toContainEqual(far[1]);
  });
  it("한도 이하면 그대로", () => {
    expect(spreadByGrid([{ lat: 0, lng: 0 }], 5)).toHaveLength(1);
  });
});
