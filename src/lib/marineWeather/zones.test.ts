import { describe, expect, it } from "vitest";
import {
  GLOBAL_MARINE_REGIONS,
  MARINE_POINTS,
  MARINE_REGIONS,
  MARINE_REGION_FIELDS,
  RISK_MARINE_POINTS,
  RISK_MARINE_REGIONS,
  isGlobalMarineRegion,
} from "./zones";

describe("marine zones", () => {
  it("지점 id 는 중복이 없고 좌표는 유효하다", () => {
    const ids = MARINE_POINTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of MARINE_POINTS) {
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
    }
  });
  it("전 세계 확대 해역마다 지점이 있고, 요청 수를 줄이려 변수가 제한된다", () => {
    for (const r of GLOBAL_MARINE_REGIONS) {
      expect(MARINE_POINTS.some((p) => p.region === r)).toBe(true);
      expect(MARINE_REGION_FIELDS[r]?.length).toBeLessThanOrEqual(2);
    }
  });
  it("유료 Datalastic 날씨 대상(위험 해역)에는 전 세계 확대 지점이 섞이지 않는다", () => {
    expect(RISK_MARINE_POINTS.some((p) => isGlobalMarineRegion(p.region))).toBe(false);
    expect(RISK_MARINE_POINTS).toHaveLength(22); // 기존 위험 해역 지점 수 — 늘리면 월 크레딧이 는다
    expect(RISK_MARINE_REGIONS).toHaveLength(7);
  });
  it("전 지구를 덮는다: 5대양·극지·주요 내해가 모두 있다", () => {
    for (const r of ["north-atlantic", "south-atlantic", "north-pacific", "south-pacific", "indian-ocean", "arctic", "southern-ocean", "mediterranean", "gulf-of-mexico", "bering-sea"]) {
      expect(MARINE_REGIONS).toContain(r);
    }
  });
});
