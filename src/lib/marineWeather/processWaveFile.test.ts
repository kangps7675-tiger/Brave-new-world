import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { processWaveFile, processWaveFileFiltered } from "./processWaveFile";
import { MARINE_POINTS } from "./zones";

/**
 * gfswave-mini: ecCodes 로 만든 2° 전구 격자 3개 메시지(HTSGW·PERPW·WIND, 5.3 패킹 + 비트맵)를 이어붙인 파일과 .idx.
 *  HTSGW = 1 + 0.02·|위도|, PERPW = 6 + 0.005·경도, WIND = 5 + 0.1·|위도|  (격자점 기준)
 *  아라비아 반도 근처(44~54E, 16~30N)는 결측("육지").
 * 실제 NOAA 파일과 같은 방식(.idx → Range 요청 → 디코딩 → 지점 샘플)이 끝까지 도는지 본다.
 */
const DIR = join(__dirname, "__fixtures__");
const FILE = new Uint8Array(readFileSync(join(DIR, "gfswave-mini.grib2")));
const IDX = readFileSync(join(DIR, "gfswave-mini.grib2.idx"), "utf8");

function fakeFetch(opts: { missing?: boolean } = {}) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (opts.missing) return new Response("NoSuchKey", { status: 404 });
    if (url.endsWith(".idx")) return new Response(IDX);
    const range = new Headers(init?.headers).get("Range") ?? "";
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (!m) return new Response(FILE);
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) + 1 : FILE.length;
    return new Response(FILE.slice(start, end), { status: 206 });
  }) as typeof fetch;
  return { impl, calls };
}

describe("processWaveFile", () => {
  it("idx → Range → 디코딩 → 지점별 행", async () => {
    const { impl, calls } = fakeFetch();
    const out = await processWaveFile("2026101900", 6, { base: "https://x.test", grid: "global.0p25", fetchImpl: impl });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") return;
    expect(out.fields).toEqual(["hs_m", "period_s", "wind_ms"]);
    // 파일에 없는 변수는 에러 목록에만 남고 전체를 막지 않는다
    expect(out.errors.some((e) => e.startsWith("DIRPW"))).toBe(true);
    // idx 1번 + 있는 변수 3개만 Range 요청
    expect(calls.filter((c) => c.endsWith(".idx"))).toHaveLength(1);
    expect(calls).toHaveLength(4);

    expect(out.rows.length).toBe(MARINE_POINTS.length);
    for (const r of out.rows) {
      expect(r.valid_time).toBe("2026-10-19T06:00:00.000Z");
      expect(r.hs_m).toBeCloseTo(1 + 0.02 * Math.abs(r.grid_lat), 1);
      expect(r.wind_ms).toBeCloseTo(5 + 0.1 * Math.abs(r.grid_lat), 1);
      const lng360 = r.grid_lng < 0 ? r.grid_lng + 360 : r.grid_lng;
      expect(r.period_s).toBeCloseTo(6 + 0.005 * lng360, 1);
      expect(r.dir_deg).toBeNull();
    }
    // 호르무즈 해협 지점(26.6N 56.7E)은 가장 가까운 격자(26N 56E)가 바다 → offset 0
    const hz = out.rows.find((r) => r.point_id === "hormuz-strait")!;
    expect(hz.grid_lat).toBe(26);
    expect(hz.grid_lng).toBe(56);
    // 페르시아만 중부(27N 51.5E)는 "육지" 블록 안 → 옆 바다 격자로 옮겨지고 offset 이 남는다
    const pg = out.rows.find((r) => r.point_id === "persian-gulf-central")!;
    expect(pg.offset_cells).toBeGreaterThan(0);
  });

  it("파일이 아직 안 올라왔으면 not-published", async () => {
    const { impl } = fakeFetch({ missing: true });
    const out = await processWaveFile("2026101900", 6, { base: "https://x.test", grid: "global.0p25", fetchImpl: impl });
    expect(out.kind).toBe("not-published");
  });
});

describe("processWaveFileFiltered (NOMADS grib_filter, 실제 홍해 상자 응답)", () => {
  const REAL = new Uint8Array(readFileSync(join(DIR, "nomads-filter-redsea-htsgw.grib2")));

  it("홍해 지점만 값이 채워지고 URL 이 상자·변수를 담는다", async () => {
    const urls: string[] = [];
    const impl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      // 홍해 상자 + HTSGW 만 실제 응답, 나머지는 "아직 없음"
      return url.includes("var_HTSGW") && url.includes("leftlon=37.65") ? new Response(REAL) : new Response("nope", { status: 404 });
    }) as typeof fetch;
    const out = await processWaveFileFiltered("2026101900", 6, { fetchImpl: impl });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") return;
    const south = out.rows.find((r) => r.point_id === "red-sea-south")!;
    expect(south.hs_m).toBeGreaterThan(0.3);
    expect(south.hs_m).toBeLessThan(2);
    expect(south.period_s).toBeNull();
    expect(urls.some((u) => u.includes("var_SWELL") && u.includes("lev_1_in_sequence=on"))).toBe(true);
  });

  it("전부 404 면 not-published", async () => {
    const impl = (async () => new Response("x", { status: 404 })) as typeof fetch;
    expect((await processWaveFileFiltered("2026101900", 6, { fetchImpl: impl })).kind).toBe("not-published");
  });
});
