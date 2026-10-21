import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADSBX_RAPIDAPI_HOST,
  adsbAuthHeaders,
  adsbLolTrafficUrl,
  adsbxMilUrl,
  civilianTrafficUrl,
  isRapidApiKey,
} from "./adsbClient";
import { fetchAdsbMilitary } from "./adsbWarmFetch";

// 형식만 같은 가짜 키 — 실제 키가 아니다
const RAPID = "0123456789msh0123456789abcdefp0123456jsn0123456789abcdef";
const GATEWAY = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("RapidAPI 키 판별", () => {
  it("RapidAPI 형식만 true", () => {
    expect(isRapidApiKey(RAPID)).toBe(true);
    expect(isRapidApiKey(GATEWAY)).toBe(false);
    expect(isRapidApiKey("")).toBe(false);
    expect(isRapidApiKey(null)).toBe(false);
  });
});

describe("헤더·주소", () => {
  it("RapidAPI 키는 RapidAPI 헤더로만 보낸다 (게이트웨이 헤더 없음)", () => {
    const h = adsbAuthHeaders(RAPID);
    expect(h["x-rapidapi-key"]).toBe(RAPID);
    expect(h["x-rapidapi-host"]).toBe(ADSBX_RAPIDAPI_HOST);
    expect(h["api-auth"]).toBeUndefined();
    expect(h["x-api-key"]).toBeUndefined();
  });

  it("게이트웨이 키는 예전 헤더 그대로", () => {
    const h = adsbAuthHeaders(GATEWAY);
    expect(h["api-auth"]).toBe(GATEWAY);
    expect(h["x-rapidapi-key"]).toBeUndefined();
  });

  it("뷰포트 주소: RapidAPI 호스트 + 끝 슬래시, 반경은 250NM 이하", () => {
    vi.stubEnv("ADSBEXCHANGE_API_KEY", RAPID);
    const r = civilianTrafficUrl(26.6, 56.7, 100);
    expect(r.source).toBe("adsbx");
    expect(r.url).toBe(`https://${ADSBX_RAPIDAPI_HOST}/v2/lat/26.6/lon/56.7/dist/100/`);
    expect(civilianTrafficUrl(26.6, 56.7, 900).url).toContain("/dist/250/");
  });

  it("게이트웨이 키·키 없음은 예전 주소", () => {
    vi.stubEnv("ADSBEXCHANGE_API_KEY", GATEWAY);
    expect(civilianTrafficUrl(1, 2, 100).url).toContain("gateway.adsbexchange.com");
    vi.stubEnv("ADSBEXCHANGE_API_KEY", "");
    vi.stubEnv("ADSB_API_KEY", "");
    vi.stubEnv("ADSBX_API_KEY", "");
    expect(civilianTrafficUrl(1, 2, 100).source).toBe("adsb.lol");
    expect(adsbLolTrafficUrl(1, 2, 100).url).toBe("https://api.adsb.lol/v2/lat/1/lon/2/dist/100");
  });

  it("군용기 주소", () => {
    expect(adsbxMilUrl(RAPID)).toBe(`https://${ADSBX_RAPIDAPI_HOST}/v2/mil/`);
    expect(adsbxMilUrl(GATEWAY)).toContain("gateway.adsbexchange.com");
    expect(adsbxMilUrl(null)).toBeNull();
  });
});

describe("군용기 조회 폴백", () => {
  it("RapidAPI 호출이 403 이면 adsb.lol 로 내려가 항공기를 돌려준다", async () => {
    vi.stubEnv("ADSBEXCHANGE_API_KEY", RAPID);
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        if (String(url).includes("rapidapi")) return new Response("forbidden", { status: 403 });
        return new Response(
          JSON.stringify({ ac: [{ hex: "af351f", t: "F35", lat: 25.77, lon: 56.75, dbFlags: 1, alt_baro: 20000, gs: 488 }] }),
          { status: 200 },
        );
      }),
    );
    const r = await fetchAdsbMilitary(50);
    expect(calls[0]).toContain("rapidapi");
    expect(calls[1]).toContain("api.adsb.lol");
    expect(r.provider).toBe("adsb.lol");
    expect(r.aircraft.length).toBeGreaterThan(0);
  });

  it("둘 다 실패하면 빈 배열 + 마지막 오류", async () => {
    vi.stubEnv("ADSBEXCHANGE_API_KEY", RAPID);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    const r = await fetchAdsbMilitary(50);
    expect(r.aircraft).toEqual([]);
    expect(r.error).toContain("HTTP 500");
  });
});
