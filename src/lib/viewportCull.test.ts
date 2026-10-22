import { describe, expect, it } from "vitest";
import { viewToBbox } from "@/lib/viewportCull";

describe("viewToBbox", () => {
  it("동쪽·서쪽 끝을 ±180으로 자른다 (API 쿼리 범위)", () => {
    const east = viewToBbox({ lat: 37, lng: 130 }, 55);
    expect(east.east).toBe(180);
    expect(east.west).toBe(75);
    const west = viewToBbox({ lat: 10, lng: -150 }, 55);
    expect(west.west).toBe(-180);
    expect(west.east).toBe(-95);
  });

  it("위도도 ±90으로 자른다", () => {
    const b = viewToBbox({ lat: 80, lng: 0 }, 55);
    expect(b.north).toBe(90);
    expect(b.south).toBe(25);
  });

  it("가운데 지역은 그대로", () => {
    expect(viewToBbox({ lat: 20, lng: 45 }, 55)).toEqual({ west: -10, south: -35, east: 100, north: 75 });
  });
});
