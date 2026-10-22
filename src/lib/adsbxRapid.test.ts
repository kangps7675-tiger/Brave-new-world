import { describe, expect, it } from "vitest";
import { isRapidApiKey } from "./adsbClient";
import {
  DENSIFY_DEFAULT_MONTHLY_CAP,
  DENSIFY_POINTS,
  RAPID_HOST,
  dueDensifyPoints,
  isRapidKey,
  monthFraction,
  rapidHeaders,
  rapidLatLonUrl,
} from "./adsbxRapid";

const RAPID = "0123456789msh0123456789abcdefp0123456jsn0123456789abcdef";
const GATEWAY = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const mid = new Date("2026-10-16T12:00:00.000Z"); // 달의 약 48%
const ago = (min: number, now = mid) => new Date(now.getTime() - min * 60_000).toISOString();

describe("키·URL", () => {
  it("adsbClient.isRapidApiKey 와 판별이 같다", () => {
    for (const k of [RAPID, GATEWAY, "", "abc"]) expect(isRapidKey(k)).toBe(isRapidApiKey(k));
  });
  it("반경은 250NM 으로 제한되고 RapidAPI 호스트만 쓴다", () => {
    expect(rapidLatLonUrl(26.4, 56.4, 1000)).toBe(`https://${RAPID_HOST}/v2/lat/26.4/lon/56.4/dist/250/`);
    expect(rapidHeaders(RAPID)["x-rapidapi-host"]).toBe(RAPID_HOST);
    expect(Object.keys(rapidHeaders(RAPID))).not.toContain("x-api-key");
  });
});

describe("dueDensifyPoints", () => {
  it("처음엔 3곳 모두 부른다", () => {
    expect(dueDensifyPoints({}, 0, DENSIFY_DEFAULT_MONTHLY_CAP, mid)).toHaveLength(3);
  });

  it("20분이 안 된 지점은 건너뛴다", () => {
    const last = { hormuz: ago(5), "bab-el-mandeb": ago(25), "red-sea-north": ago(10) };
    expect(dueDensifyPoints(last, 0, 6500, mid).map((p) => p.id)).toEqual(["bab-el-mandeb"]);
  });

  it("월 상한에 닿으면 아무것도 부르지 않는다", () => {
    expect(dueDensifyPoints({}, 6500, 6500, mid)).toEqual([]);
  });

  it("남은 호출이 지점 수보다 적으면 그만큼만 (월말)", () => {
    const end = new Date("2026-10-31T23:59:00.000Z");
    expect(dueDensifyPoints({}, 6499, 6500, end)).toHaveLength(1);
  });

  it("달 중순에 상한 근처까지 이미 썼으면 페이스 규칙으로 멈춘다", () => {
    expect(dueDensifyPoints({}, 6499, 6500, mid)).toEqual([]);
  });

  it("달 초에 시간 경과보다 앞서 쓰지 않는다 (페이스)", () => {
    const early = new Date("2026-10-01T01:00:00.000Z");
    expect(monthFraction(early)).toBeLessThan(0.01);
    // 허용 = ceil(6500*0.0013)+30 = 39
    expect(dueDensifyPoints({}, 38, 6500, early)).toHaveLength(1);
    expect(dueDensifyPoints({}, 39, 6500, early)).toEqual([]);
  });

  it("지점 3곳 × 20분 갱신이 월 상한 기본값 안에 든다", () => {
    const callsPerMonth = DENSIFY_POINTS.length * (60 / 20) * 24 * 30;
    expect(callsPerMonth).toBeLessThanOrEqual(DENSIFY_DEFAULT_MONTHLY_CAP + 100);
    expect(DENSIFY_DEFAULT_MONTHLY_CAP).toBeLessThanOrEqual(8_000); // 1만 중 웹 조회용을 남긴다
  });
});
