import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeGrib2Message, gridLatLng, nearestIndex, sampleNearest } from "./grib2";

/**
 * 픽스처는 ecCodes 2.50(python eccodes)로 만들었다: 37x19 정규 위경도(40E~58E, 9N~9S),
 * 북동쪽 60점은 비트맵 결측("육지"). expected.json = 같은 메시지를 ecCodes 가 디코딩한 값.
 * 패킹: simple(5.0) · complex(5.2) · 공간 차분 1·2차(5.3) · 비트맵 없음 · 음수 범위.
 */
const DIR = join(__dirname, "__fixtures__");
const expected = JSON.parse(readFileSync(join(DIR, "expected.json"), "utf8")) as Record<
  string,
  { template: number; Ni: number; Nj: number; values: Array<number | null> }
>;

const load = (name: string) => new Uint8Array(readFileSync(join(DIR, `${name}.grib2`)));

describe("decodeGrib2Message — ecCodes 대조", () => {
  for (const name of Object.keys(expected)) {
    it(name, () => {
      const exp = expected[name];
      const f = decodeGrib2Message(load(name));
      expect(f.drsTemplate).toBe(exp.template);
      expect(f.grid.ni).toBe(exp.Ni);
      expect(f.grid.nj).toBe(exp.Nj);
      expect(f.values.length).toBe(exp.values.length);
      for (let k = 0; k < exp.values.length; k++) {
        const e = exp.values[k];
        if (e === null) expect(Number.isNaN(f.values[k])).toBe(true);
        else expect(Math.abs(f.values[k] - e)).toBeLessThan(1e-3);
      }
    });
  }

  it("격자 메타데이터", () => {
    const { grid, refTime } = decodeGrib2Message(load("csd2"));
    expect(grid.la1).toBeCloseTo(9);
    expect(grid.lo1).toBeCloseTo(40);
    expect(grid.la2).toBeCloseTo(-9);
    expect(grid.di).toBeCloseTo(0.5);
    expect(grid.dj).toBeCloseTo(1);
    expect(refTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("GRIB 아닌 입력·잘린 메시지는 에러", () => {
    expect(() => decodeGrib2Message(new Uint8Array(20))).toThrow(/GRIB header/);
    const b = load("csd2");
    expect(() => decodeGrib2Message(b.slice(0, b.length - 40))).toThrow(/truncated/);
  });

  it("지원 안 하는 패킹(5.40 등)은 조용히 넘어가지 않고 에러", () => {
    const b = load("simple").slice();
    // 섹션 5 위치를 찾아 템플릿 번호를 40 으로 바꾼다
    let pos = 16;
    while (b[pos + 4] !== 5) pos += (b[pos] << 24) | (b[pos + 1] << 16) | (b[pos + 2] << 8) | b[pos + 3];
    b[pos + 9] = 0;
    b[pos + 10] = 40;
    expect(() => decodeGrib2Message(b)).toThrow(/5\.40 not supported/);
  });
});

describe("격자 샘플링", () => {
  const field = decodeGrib2Message(load("csd2"));
  const exp = expected.csd2.values;

  it("가장 가까운 격자", () => {
    const c = nearestIndex(field.grid, 0.4, 50.2)!;
    expect(c).toEqual({ i: 20, j: 9 });
    expect(gridLatLng(field.grid, c.i, c.j)).toEqual({ lat: 0, lng: 50 });
    const s = sampleNearest(field, 0.4, 50.2)!;
    expect(s.value).toBeCloseTo(exp[9 * 37 + 20]!, 3);
    expect(s.offsetCells).toBe(0);
  });

  it("결측(육지) 격자면 가까운 바다 격자로", () => {
    // (5N, 45.5E) 는 육지 블록 가장자리 — 남쪽 4N 은 바다
    const s = sampleNearest(field, 5, 45.5)!;
    expect(s).not.toBeNull();
    expect(s.offsetCells).toBeGreaterThan(0);
    expect(Number.isFinite(s.value)).toBe(true);
  });

  it("반경 안에 바다가 없으면 null, 격자 밖도 null", () => {
    expect(sampleNearest(field, 8, 41, 1)).toBeNull();
    expect(sampleNearest(field, 30, 50)).toBeNull();
  });

  it("전구 격자는 경도 0/360 경계를 넘어 감싼다", () => {
    const g = { ni: 1440, nj: 721, la1: 90, lo1: 0, la2: -90, lo2: 359.75, di: 0.25, dj: 0.25, scanMode: 0 };
    expect(nearestIndex(g, 12.6, 43.35)).toEqual({ i: 173, j: 310 });
    expect(nearestIndex(g, 0, -0.1)).toEqual({ i: 0, j: 360 });
    expect(nearestIndex(g, 0, -0.2)).toEqual({ i: 1439, j: 360 });
    expect(gridLatLng(g, 1439, 360)).toEqual({ lat: 0, lng: -0.25 });
  });
});
