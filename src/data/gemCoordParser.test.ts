/**
 * GEM 좌표 파서 회귀 테스트 — 2026-07-31 감사 P0-1.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  이 테스트가 막는 사고
 * ══════════════════════════════════════════════════════════════════════
 *
 * 감사 시점에 GEM 철강·시멘트·철광석·화학 **2,000개 시설이 전부 (0,0)** 에
 * 찍혀 있었다. 이름·국가·용량은 정상인데 좌표만 죽어 있었다.
 *
 *   {"n": "Vale Serra Norte Complex Mine", "la": 0, "ln": 0,
 *    "m": {"country": "Brazil", "capacity": 145000}}
 *
 * 세계 최대급 철광석 광산이 기니만 앞바다에 있었다.
 *
 * ── 원인 ──────────────────────────────────────────────────────────
 *
 *   Number(null) === 0        이고
 *   Number.isFinite(0) === true 다.
 *
 * 그래서 `Number(firstVal(row, ["Latitude", ...]))` 를 isFinite 로 검사하면
 * **컬럼이 아예 없는 시트에서도 {lat:0, lng:0} 이 가드를 통과**하고,
 * 아래의 `Coordinates` 통합 컬럼 파서에 영원히 도달하지 못했다.
 *
 * GEM 트래커는 두 형식이 섞여 있다:
 *   · 석탄발전·태양광·풍력 → `Latitude` / `Longitude` 별도 컬럼
 *   · 철강·시멘트·철광석·화학 → `Coordinates` 통합 컬럼 ("31.2304, 121.4737")
 *
 * 후자 넷이 전멸했다.
 *
 * ── 왜 이 테스트가 필요한가 ────────────────────────────────────────
 *
 * 좌표 오류는 **조용하다.** 예외도 안 나고 지도에 점이 찍히긴 한다.
 * 그리고 GEM 은 릴리스마다 컬럼명이 바뀐다 (파일명에 날짜가 붙는 이유).
 * 다음 릴리스에서 같은 사고가 나지 않도록 실제 시트 형태로 못박는다.
 */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";

const require_ = createRequire(import.meta.url);
// ⚠️ build-gem-trackers.js 가 아니라 gem-coords.js 를 직접 import 한다.
//    전자는 xlsx·파일시스템에 의존해서 단독 테스트가 불가능하다.
//    정확도 핵심 함수는 의존성 없이 검증 가능해야 한다.
const gem = require_(
  path.resolve(__dirname, "..", "..", "scripts", "gem-coords.js"),
) as {
  parseCoords: (row: Record<string, unknown>) => { lat: number; lng: number } | null;
  num: (v: unknown) => number;
  isNullIsland: (lat: number, lng: number) => boolean;
};

const { parseCoords, num, isNullIsland } = gem;

// ─────────────────────────────────────────────────────────────────────
//  근본 원인 — Number(null) === 0
// ─────────────────────────────────────────────────────────────────────

describe("num() — Number() 의 0 함정", () => {
  it("null 은 NaN 이어야 한다 (Number(null) 은 0 이다)", () => {
    expect(Number(null)).toBe(0); // ← 이게 사고의 원인
    expect(Number.isFinite(Number(null))).toBe(true); // ← 그래서 가드를 통과했다
    expect(num(null)).toBeNaN(); // ← 우리 헬퍼는 막는다
  });

  it("undefined·빈 문자열·공백도 NaN", () => {
    expect(num(undefined)).toBeNaN();
    expect(num("")).toBeNaN();
    expect(num("   ")).toBeNaN();
  });

  it("정상 숫자·숫자 문자열은 그대로 통과", () => {
    expect(num(31.2304)).toBeCloseTo(31.2304);
    expect(num("31.2304")).toBeCloseTo(31.2304);
    expect(num("-89.017")).toBeCloseTo(-89.017);
    expect(num(0)).toBe(0); // 진짜 0 은 살려야 한다 — 널섬 판정은 별도
  });

  it("숫자가 아닌 문자열은 NaN", () => {
    expect(num("N/A")).toBeNaN();
    expect(num("unknown")).toBeNaN();
  });
});

describe("isNullIsland()", () => {
  it("(0,0) 만 널섬", () => {
    expect(isNullIsland(0, 0)).toBe(true);
    expect(isNullIsland(0, 1)).toBe(false);
    expect(isNullIsland(1, 0)).toBe(false);
    expect(isNullIsland(31.23, 121.47)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
//  실제 GEM 시트 형태
// ─────────────────────────────────────────────────────────────────────

describe("parseCoords — 별도 위경도 컬럼 (석탄발전·태양광·풍력)", () => {
  it("Latitude / Longitude", () => {
    expect(parseCoords({ Latitude: 33.8339, Longitude: 116.8311 })).toEqual({
      lat: 33.8339,
      lng: 116.8311,
    });
  });

  it("문자열로 들어와도 처리한다 (xlsx 는 종종 문자열로 준다)", () => {
    expect(parseCoords({ Latitude: "33.8339", Longitude: "116.8311" })).toEqual({
      lat: 33.8339,
      lng: 116.8311,
    });
  });

  it("소문자·축약 컬럼명도 받는다", () => {
    expect(parseCoords({ lat: 48.86, lon: 2.35, latitude: 48.86, longitude: 2.35 })).toEqual(
      { lat: 48.86, lng: 2.35 },
    );
  });

  it("남반구·서반구 음수 좌표", () => {
    expect(parseCoords({ Latitude: -23.55, Longitude: -46.63 })).toEqual({
      lat: -23.55,
      lng: -46.63,
    });
  });
});

describe("parseCoords — 통합 Coordinates 컬럼 (철강·시멘트·철광석·화학)", () => {
  // ★ 여기가 2,000건을 죽인 지점이다
  it("쉼표 구분 문자열을 파싱한다", () => {
    expect(parseCoords({ Coordinates: "31.2304, 121.4737" })).toEqual({
      lat: 31.2304,
      lng: 121.4737,
    });
  });

  it("공백·세미콜론 구분도 받는다", () => {
    expect(parseCoords({ Coordinates: "31.2304 121.4737" })).toEqual({
      lat: 31.2304,
      lng: 121.4737,
    });
    expect(parseCoords({ Coordinate: "31.2304; 121.4737" })).toEqual({
      lat: 31.2304,
      lng: 121.4737,
    });
  });

  it("음수 좌표", () => {
    expect(parseCoords({ Coordinates: "-6.0, -49.9" })).toEqual({ lat: -6.0, lng: -49.9 });
  });

  it("위경도가 뒤집혀 있으면 자동 교정한다 (|a| > 90)", () => {
    // "121.4737, 31.2304" 는 lng,lat 순서다
    expect(parseCoords({ Coordinates: "121.4737, 31.2304" })).toEqual({
      lat: 31.2304,
      lng: 121.4737,
    });
  });

  it("Lat/Long · Location 별칭도 받는다", () => {
    expect(parseCoords({ "Lat/Long": "35.31, -101.57" })).toEqual({
      lat: 35.31,
      lng: -101.57,
    });
    expect(parseCoords({ Location: "25.1924, 66.7488" })).toEqual({
      lat: 25.1924,
      lng: 66.7488,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
//  회귀 방지 — 여기가 핵심
// ─────────────────────────────────────────────────────────────────────

describe("parseCoords — 널섬 회귀 방지 (P0-1)", () => {
  it("★ 좌표 컬럼이 아예 없으면 null 이다 (예전엔 {0,0} 을 돌려줬다)", () => {
    const row = {
      "Plant name (English)": "Aba Iron and Steel Payas plant",
      "Country/area": "Türkiye",
      "Operating status": "operating",
      // 좌표 컬럼 없음 — 바로 이 상황에서 {lat:0, lng:0} 이 나왔다
    };
    expect(parseCoords(row)).toBeNull();
  });

  it("★ 좌표 컬럼이 빈 문자열이어도 null", () => {
    expect(parseCoords({ Latitude: "", Longitude: "" })).toBeNull();
    expect(parseCoords({ Latitude: "   ", Longitude: "   " })).toBeNull();
  });

  it("★ 좌표 컬럼이 null 이어도 null (xlsx defval:null)", () => {
    expect(parseCoords({ Latitude: null, Longitude: null })).toBeNull();
  });

  it("★ 명시적 (0,0) 도 결측으로 본다 — GEM 에 이 좌표인 시설은 없다", () => {
    expect(parseCoords({ Latitude: 0, Longitude: 0 })).toBeNull();
    expect(parseCoords({ Coordinates: "0, 0" })).toBeNull();
  });

  it("★ 별도 컬럼이 비었으면 통합 컬럼으로 폴백한다", () => {
    // 이 폴백에 도달하지 못한 것이 사고의 직접 원인이다
    const row = {
      Latitude: null,
      Longitude: null,
      Coordinates: "-6.0, -49.9",
    };
    expect(parseCoords(row)).toEqual({ lat: -6.0, lng: -49.9 });
  });

  it("실제 사고 레코드 — Vale Serra Norte (브라질 철광석)", () => {
    // 감사 당시 이 레코드가 (0,0) 이었다
    const row = {
      "Asset name (English)": "Vale Serra Norte Complex Mine",
      "Country/Area": "Brazil",
      "Operating status": "operating",
      "Design capacity (ttpa)": 145000,
      Coordinates: "-6.05, -50.16",
    };
    const c = parseCoords(row);
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(-6.05);
    expect(c!.lng).toBeCloseTo(-50.16);
    // 파라 주 카라자스 — 기니만이 아니다
    expect(Math.abs(c!.lat) + Math.abs(c!.lng)).toBeGreaterThan(1);
  });
});

describe("parseCoords — 잘못된 입력", () => {
  it("숫자가 아닌 값은 null", () => {
    expect(parseCoords({ Latitude: "N/A", Longitude: "N/A" })).toBeNull();
    expect(parseCoords({ Coordinates: "unknown" })).toBeNull();
    expect(parseCoords({ Coordinates: "see notes" })).toBeNull();
  });

  it("범위를 벗어난 조합은 null", () => {
    // 둘 다 90 을 넘으면 어느 쪽도 위도가 될 수 없다
    expect(parseCoords({ Coordinates: "200, 300" })).toBeNull();
  });

  it("빈 행은 null", () => {
    expect(parseCoords({})).toBeNull();
  });
});
