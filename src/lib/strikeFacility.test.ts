import { describe, expect, it } from "vitest";
import { ENERGY_FACILITIES } from "@/data/energyFacilities";
import { strikeFacilityFor, strikeFacilityLabel } from "./strikeFacility";
import { mergeStrikeFlames, type StrikeFlame } from "./strikeFlames";

const flame = (p: Partial<StrikeFlame>): StrikeFlame => ({
  id: "x",
  lat: 0,
  lng: 0,
  title: "",
  body: "",
  kind: "drone",
  region: "",
  publishedAt: "2026-10-21T00:00:00Z",
  origin: "liveuamap",
  source: "Liveuamap",
  ...p,
});

describe("공습 불꽃 → 시설 태그", () => {
  it("시설 반경 안이면 그 시설", () => {
    const t = strikeFacilityFor({ lat: 44.1, lng: 39.09 });
    expect(t?.id).toBe("ru-tuapse");
    expect(strikeFacilityLabel(t!, "ko")).toBe("투압세 정유소·항구 · 수출터미널");
  });

  it("홍해·걸프 해운 시설도 잡는다", () => {
    expect(strikeFacilityFor({ lat: 15.23, lng: 42.7 })?.id).toBe("ye-ras-isa");
    expect(strikeFacilityFor({ lat: 25.13, lng: 56.34 })?.id).toBe("ae-fujairah");
  });

  it("좌표가 조금 빗나가도 본문에 시설 이름이 있고 80km 안이면 그 시설", () => {
    const t = strikeFacilityFor({ lat: 14.6, lng: 43.0, text: "Drone struck fuel tanks at Hodeidah port" });
    expect(t?.id).toBe("ye-hodeidah-port");
  });

  it("이름만 맞고 수백 km 떨어지면 다른 도시 속보라 버린다", () => {
    expect(strikeFacilityFor({ lat: 50.45, lng: 30.52, text: "Kyiv hit; Odesa port also targeted earlier" })).toBeNull();
  });

  it("시설과 무관한 타격은 태그 없음 ('정유' 단어만으로 지어내지 않음)", () => {
    expect(strikeFacilityFor({ lat: 48.0, lng: 37.8, text: "refinery mentioned in passing" })).toBeNull();
  });

  it("mergeStrikeFlames 결과에 시설 태그가 붙는다", () => {
    const out = mergeStrikeFlames([[flame({ id: "a", lat: 26.64, lng: 50.16 }), flame({ id: "b", lat: 48, lng: 37.8 })]]);
    expect(out.find((f) => f.id === "a")?.facility?.id).toBe("sa-ras-tanura");
    expect(out.find((f) => f.id === "b")?.facility).toBeUndefined();
  });

  it("시설 id 중복 없음, 좌표·반경 정상", () => {
    const ids = ENERGY_FACILITIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of ENERGY_FACILITIES) {
      expect(Math.abs(f.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(f.lng)).toBeLessThanOrEqual(180);
      expect(f.radiusKm).toBeGreaterThan(0);
    }
  });
});
