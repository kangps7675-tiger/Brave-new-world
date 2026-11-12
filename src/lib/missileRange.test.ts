import { describe, expect, it } from "vitest";
import { missileRangeForText, rangeShape, missileRangeGeoJson, formatRangeKm } from "./missileRange";

const RAD = Math.PI / 180;
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lng2 - lng1) * RAD) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
}

describe("missileRangeForText", () => {
  it("발사 글에서 기종을 읽는다(영어·한글)", () => {
    expect(missileRangeForText("North Korea launches Hwasong-18 ICBM into the sea")?.spec.id).toBe("hwasong-18");
    expect(missileRangeForText("북한 화성-12형 중거리탄도미사일 발사")?.spec.id).toBe("hwasong-12");
    expect(missileRangeForText("Iran test-fires Khorramshahr missile")?.spec.id).toBe("khorramshahr");
  });
  it("비슷한 이름은 다른 기종으로 읽지 않는다", () => {
    expect(missileRangeForText("China launches DF-51 test")).toBeNull();
    expect(missileRangeForText("North Korea fires Hwasong-1 variant")).toBeNull();
    expect(missileRangeForText("China fires DF-5 test")?.spec.id).toBe("df-5");
  });
  it("발사 글이 아니면(표적 위치가 될 수 있는 타격 글 등) 읽지 않는다", () => {
    expect(missileRangeForText("Kinzhal missile struck an oil depot in Dnipro")).toBeNull();
    expect(missileRangeForText("Analysis of the Hwasong-18")).toBeNull();
  });
  it("여러 기종이면 먼저 나온 것", () => {
    expect(missileRangeForText("Iran fired Sejjil and Zolfaghar missiles")?.spec.id).toBe("sejjil");
  });
});

describe("rangeShape", () => {
  it("극을 안 품는 원: 모든 점이 중심에서 반지름만큼 떨어져 있고 닫혀 있다", () => {
    const { boundary, fill } = rangeShape(39, 125.7, 1200);
    for (const [px, py] of boundary.slice(0, -1)) expect(Math.abs(haversine(39, 125.7, py, px) - 1200)).toBeLessThan(2);
    expect(boundary[0]).toEqual(boundary[boundary.length - 1]);
    expect(fill).toHaveLength(1);
  });
  it("날짜변경선을 넘어도 경도가 끊기지 않는다", () => {
    const { boundary } = rangeShape(60, 178, 2500);
    for (let i = 1; i < boundary.length; i += 1) expect(Math.abs(boundary[i][0] - boundary[i - 1][0])).toBeLessThan(90);
  });
  it("극 하나를 품은 원(북위 39도 8,000km)은 극으로 닫힌 폴리곤", () => {
    const { fill, boundary } = rangeShape(39, 125.7, 8000);
    expect(fill![0].some(([, y]) => y === 90)).toBe(true);
    expect(boundary[0][0]).toBe(-180);
    expect(boundary[boundary.length - 1][0]).toBe(180);
  });
  it("두 극을 품은 원(15,000km)은 세계 전체에서 반대편 구멍을 뺀 모양", () => {
    const { fill, boundary } = rangeShape(39, 125.7, 15000);
    expect(fill).toHaveLength(2);
    // 구멍의 점들은 대척점에서 (반지구 − 15,000km) 떨어져 있다
    const holeKm = Math.PI * 6371.0088 - 15000;
    for (const [px, py] of boundary.slice(0, -1)) expect(Math.abs(haversine(-39, 125.7 + 180, py, px) - holeKm)).toBeLessThan(3);
  });
});

describe("표시 문자열·GeoJSON", () => {
  it("범위와 단일 수치를 구분해 적는다", () => {
    expect(formatRangeKm(missileRangeForText("Hwasong-15 launched")!.spec)).toBe("8,500~13,000km");
    expect(formatRangeKm(missileRangeForText("Hwasong-12 launched")!.spec)).toBe("약 4,500km");
  });
  it("최대 사거리로 칠할 폴리곤과 점선용 경계선을 만든다", () => {
    const fc = missileRangeGeoJson(39, 125.7, missileRangeForText("Hwasong-15 launched")!.spec);
    expect(fc.features.map((f) => f.properties.part)).toEqual(["fill", "line"]);
    expect(fc.features[0].properties.km).toBe(13000);
  });
});
