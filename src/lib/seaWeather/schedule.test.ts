import { describe, expect, it } from "vitest";
import { canSpendOnSeaWeather, dueSeaWeatherPoints, isFreshSeaWeather } from "./schedule";

const H = 3_600_000;
const now = Date.parse("2026-10-22T12:00:00.000Z");
const ago = (h: number) => new Date(now - h * H).toISOString();
const ids = ["a", "b", "c", "d", "e", "f"];

describe("dueSeaWeatherPoints", () => {
  it("한 번도 안 받은 지점이 먼저, 한 틱에 최대 4곳", () => {
    expect(dueSeaWeatherPoints(ids, [], now)).toHaveLength(4);
  });

  it("성공한 지점은 6시간 안엔 건드리지 않는다", () => {
    const st = ids.map((id) => ({ pointId: id, checkedAt: ago(5), error: null }));
    expect(dueSeaWeatherPoints(ids, st, now)).toEqual([]);
  });

  it("성공한 지점은 6시간이 지나면 가장 오래된 것부터", () => {
    const st = [
      { pointId: "a", checkedAt: ago(7), error: null },
      { pointId: "b", checkedAt: ago(9), error: null },
      { pointId: "c", checkedAt: ago(1), error: null },
    ];
    expect(dueSeaWeatherPoints(["a", "b", "c"], st, now)).toEqual(["b", "a"]);
  });

  it("실패한 지점은 1시간 뒤 재시도 — 5분마다 두드리지 않는다", () => {
    const st = [{ pointId: "a", checkedAt: ago(0.5), error: "http 429" }];
    expect(dueSeaWeatherPoints(["a"], st, now)).toEqual([]);
    const st2 = [{ pointId: "a", checkedAt: ago(1.1), error: "http 429" }];
    expect(dueSeaWeatherPoints(["a"], st2, now)).toEqual(["a"]);
  });
});

describe("예산·신선도", () => {
  it("사건 예약분은 건드리지 않는다", () => {
    expect(canSpendOnSeaWeather(10_999, 15_000, 4_000)).toBe(true);
    expect(canSpendOnSeaWeather(11_000, 15_000, 4_000)).toBe(false);
  });

  it("12시간 넘은 값은 '현재'로 내보내지 않는다", () => {
    expect(isFreshSeaWeather(ago(3), null, now)).toBe(true);
    expect(isFreshSeaWeather(ago(13), null, now)).toBe(false);
    expect(isFreshSeaWeather(null, ago(2), now)).toBe(true);
    expect(isFreshSeaWeather(null, null, now)).toBe(false);
  });
});
