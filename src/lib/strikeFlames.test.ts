import { describe, expect, it } from "vitest";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { flamesFromLiveua, mergeStrikeFlames } from "./strikeFlames";

function ev(partial: Partial<LiveuamapEvent>): LiveuamapEvent {
  return {
    id: "e1",
    regionId: "ukraine",
    title: "Russian drone hit an oil depot",
    body: "A Shahed drone struck the depot.",
    lat: 48.5,
    lng: 35.0,
    publishedAt: "2026-10-19T10:00:00Z",
    tags: [],
    ...partial,
  } as LiveuamapEvent;
}

describe("공습 불꽃", () => {
  it("드론·미사일 피격 속보만 불꽃이 된다", () => {
    const flames = flamesFromLiveua(
      [ev({}), ev({ id: "e2", title: "Press conference in Kyiv", body: "Officials met." })],
      false,
    );
    expect(flames.map((f) => f.id)).toEqual(["e1"]);
    expect(flames[0].origin).toBe("liveuamap");
  });

  it("좌표가 없으면 제외", () => {
    expect(flamesFromLiveua([ev({ lat: Number.NaN })], false)).toHaveLength(0);
  });

  it("같은 사건(가까운 곳·같은 시간대)은 한 번만, 최신순", () => {
    const a = flamesFromLiveua([ev({ id: "a" })], false);
    const b = flamesFromLiveua([ev({ id: "b", lat: 48.51, lng: 35.01 })], false);
    const c = flamesFromLiveua([ev({ id: "c", lat: 33, lng: 44, publishedAt: "2026-10-19T12:00:00Z", regionId: "iran" })], false);
    const merged = mergeStrikeFlames([a, b, c]);
    expect(merged.map((f) => f.id)).toEqual(["c", "a"]);
  });
});
