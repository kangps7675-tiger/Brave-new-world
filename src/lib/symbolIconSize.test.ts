import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// MapLibre는 ["zoom"]을 최상위 step/interpolate 입력 밖(예: ["*", scale, [interpolate zoom]])에 두면
// 레이어를 거부한다 — 항공기·선박 symbol 레이어가 통째로 안 그려졌던 회귀를 막는다.
describe("MapGlobeView symbol icon-size", () => {
  const src = readFileSync("src/components/MapGlobeView.tsx", "utf8");
  it("icon-size는 최상위 interpolate(zoom)로 시작한다", () => {
    const blocks = src.match(/"icon-size": \[\s*"[^"]+"/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    for (const b of blocks) expect(b).toMatch(/"interpolate"/);
  });
});
