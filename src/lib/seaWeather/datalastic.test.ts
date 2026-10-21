import { describe, expect, it } from "vitest";
import { fetchSeaWeather, kmhToKnots, parseSeaWeather, seaWeatherPoint } from "./datalastic";

/** 2026-10-21 Datalastic 실제 응답(홍해 12.6, 43.3) — 값은 그대로, 불필요한 필드만 줄임 */
const REAL = {
  data: {
    location: { type: "Feature", geometry: { type: "Point", coordinates: [43.3, 12.6] }, properties: {} },
    weather: {
      latitude: 12.625,
      longitude: 43.25,
      current: {
        time: "2026-10-21T10:45",
        wind_speed_10m: 18.3,
        wind_direction_10m: 128,
        wind_gusts_10m: 16.1,
        cloud_cover: 100,
        visibility: 24140.0,
        pressure_msl: 1011.1,
        wave_height: 0.5,
        wave_period: 3.4,
        swell_wave_height: 0.34,
        sea_surface_temperature: 28.4,
        ocean_current_velocity: 2.0,
      },
    },
  },
  meta: { success: true },
};

describe("parseSeaWeather", () => {
  it("실제 응답을 읽는다", () => {
    const w = parseSeaWeather(REAL);
    expect(w).not.toBeNull();
    expect(w!.waveHeightM).toBe(0.5);
    expect(w!.windKmh).toBe(18.3);
    expect(w!.visibilityKm).toBeCloseTo(24.14, 2);
    expect(w!.seaTempC).toBe(28.4);
    expect(w!.at).toBe("2026-10-21T10:45:00.000Z");
    expect(w!.gridLat).toBe(12.625);
  });

  it("success=false / 형태 불일치 / 핵심값 없음은 null — 숫자를 지어내지 않는다", () => {
    expect(parseSeaWeather({ meta: { success: false } })).toBeNull();
    expect(parseSeaWeather({ data: {} })).toBeNull();
    expect(parseSeaWeather(null)).toBeNull();
    expect(parseSeaWeather({ data: { weather: { current: { time: "2026-10-21T10:45", cloud_cover: 10 } } }, meta: { success: true } })).toBeNull();
  });

  it("null 값(weather_code 등)은 무시", () => {
    const w = parseSeaWeather({ data: { weather: { current: { wave_height: 1.2, wind_speed_10m: null, weather_code: null } } } });
    expect(w!.waveHeightM).toBe(1.2);
    expect(w!.windKmh).toBeNull();
  });
});

describe("fetchSeaWeather", () => {
  it("키가 없으면 호출하지 않는다", async () => {
    let called = false;
    const r = await fetchSeaWeather(12.6, 43.3, {
      apiKey: "",
      fetchImpl: (async () => {
        called = true;
        return new Response("{}");
      }) as typeof fetch,
    });
    expect(r).toEqual({ ok: false, reason: "no-key" });
    expect(called).toBe(false);
  });

  it("정상 응답", async () => {
    const r = await fetchSeaWeather(12.6, 43.3, {
      apiKey: "k",
      fetchImpl: (async (url: string) => {
        expect(url).toContain("/weather?");
        expect(url).toContain("lat=12.6&lon=43.3");
        return new Response(JSON.stringify(REAL), { status: 200 });
      }) as unknown as typeof fetch,
    });
    expect(r.ok).toBe(true);
  });

  it("HTTP 오류·네트워크 오류·모양 불일치를 구분", async () => {
    const mk = (impl: () => Promise<Response>) => fetchSeaWeather(1, 1, { apiKey: "k", fetchImpl: impl as unknown as typeof fetch });
    expect(await mk(async () => new Response("no", { status: 429 }))).toEqual({ ok: false, reason: "http", status: 429 });
    expect(await mk(async () => new Response("{}", { status: 200 }))).toEqual({ ok: false, reason: "shape" });
    expect(await mk(async () => Promise.reject(new Error("x")))).toEqual({ ok: false, reason: "network" });
  });
});

describe("지점·단위", () => {
  it("모든 해역에 대표 지점이 있다", () => {
    for (const r of ["red-sea", "hormuz", "black-sea", "taiwan-strait", "malacca"] as const) {
      expect(seaWeatherPoint(r)).not.toBeNull();
    }
  });
  it("km/h → 노트", () => {
    expect(kmhToKnots(18.52)).toBeCloseTo(10, 5);
  });
});
