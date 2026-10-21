import { describe, expect, it } from "vitest";
import { balanceWorldSample, CHOKEPOINT_BOXES, inSampleBox } from "@/lib/aisSampling";

const mk = (lat: number, lng: number, i: number) => ({ lat, lng, i });

describe("balanceWorldSample", () => {
  const europe = Array.from({ length: 900 }, (_, i) => mk(54 + (i % 7) * 0.3, 5 + (i % 11) * 0.5, i));
  const hormuz = Array.from({ length: 60 }, (_, i) => mk(25.5 + (i % 5) * 0.1, 55 + (i % 6) * 0.1, 1000 + i));
  const asia = Array.from({ length: 40 }, (_, i) => mk(35, 130 + i * 0.3, 2000 + i));

  it("max 이하면 그대로", () => {
    expect(balanceWorldSample(europe.slice(0, 5), 10)).toHaveLength(5);
  });

  it("유럽이 최신순으로 앞에 있어도 호르무즈에 자리를 배정한다", () => {
    const out = balanceWorldSample([...europe, ...hormuz, ...asia], 200);
    expect(out).toHaveLength(200);
    const hz = CHOKEPOINT_BOXES.find((b) => b.id === "hormuz")!;
    expect(out.filter((p) => inSampleBox(p, hz)).length).toBeGreaterThanOrEqual(14);
    expect(out.some((p) => p.i >= 2000)).toBe(true);
  });

  it("중복 없이 max 개", () => {
    const out = balanceWorldSample([...europe, ...hormuz, ...asia], 300);
    expect(new Set(out).size).toBe(out.length);
    expect(out.length).toBe(300);
  });
});
