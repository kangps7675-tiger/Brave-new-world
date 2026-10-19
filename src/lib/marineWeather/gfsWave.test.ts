import { describe, expect, it } from "vitest";
import {
  beaufort,
  byteRangeFor,
  candidateCycles,
  cycleDate,
  parseIdx,
  seaStateKo,
  validTimeIso,
  waveFileUrl,
} from "./gfsWave";
import { MARINE_POINTS } from "./zones";

const IDX = `1:0:d=2026101906:WIND:surface:anl:
2:61234:d=2026101906:WDIR:surface:anl:
3:180000:d=2026101906:HTSGW:surface:anl:
4:260000:d=2026101906:SWELL:1 in sequence:anl:
5:300000:d=2026101906:SWELL:2 in sequence:anl:
`;

describe("gfsWave", () => {
  it("idx 파싱·바이트 범위", () => {
    const e = parseIdx(IDX);
    expect(e).toHaveLength(5);
    expect(byteRangeFor(e, "WDIR", "surface")).toEqual({ start: 61234, end: 179999 });
    expect(byteRangeFor(e, "SWELL", "1 in sequence")).toEqual({ start: 260000, end: 299999 });
    // 마지막 메시지는 파일 끝까지
    expect(byteRangeFor(e, "SWELL", "2 in sequence")).toEqual({ start: 300000, end: null });
    // 레벨 표기가 달라도 같은 변수 첫 메시지로
    expect(byteRangeFor(e, "SWELL", "1 in seq")).toEqual({ start: 260000, end: 299999 });
    expect(byteRangeFor(e, "PERPW", "surface")).toBeNull();
  });

  it("파일 경로 (NODD 버킷)", () => {
    expect(waveFileUrl("https://noaa-gfs-bdp-pds.s3.amazonaws.com/", "2026101906", 12)).toBe(
      "https://noaa-gfs-bdp-pds.s3.amazonaws.com/gfs.20261019/06/wave/gridded/gfswave.t06z.global.0p25.f012.grib2",
    );
  });

  it("사이클 후보: 3시간 전 기준 6시간 내림부터", () => {
    expect(candidateCycles(new Date("2026-10-19T13:40:00Z"))).toEqual(["2026101906", "2026101900", "2026101818"]);
    expect(candidateCycles(new Date("2026-10-19T02:00:00Z"))).toEqual(["2026101818", "2026101812", "2026101806"]);
    expect(cycleDate("2026101906").toISOString()).toBe("2026-10-19T06:00:00.000Z");
    expect(validTimeIso("2026101918", 12)).toBe("2026-10-20T06:00:00.000Z");
  });

  it("해상 상태·보퍼트", () => {
    expect(seaStateKo(null)).toBeNull();
    expect(seaStateKo(0.8)).toBe("약한 파도");
    expect(seaStateKo(3)).toBe("높은 파도");
    expect(beaufort(0.2)).toBe(0);
    expect(beaufort(12)).toBe(6);
    expect(beaufort(40)).toBe(12);
  });

  it("샘플 지점 id 는 고유, 좌표 범위 정상", () => {
    expect(new Set(MARINE_POINTS.map((p) => p.id)).size).toBe(MARINE_POINTS.length);
    for (const p of MARINE_POINTS) {
      expect(Math.abs(p.lat)).toBeLessThan(80);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
    }
  });
});
