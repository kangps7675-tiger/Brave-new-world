import { describe, expect, it } from "vitest";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import { ngaAreaLabel, ngaSecurityStackItems, stackItemFromNavarea } from "./ngaSecurity";

const NOW = Date.parse("2026-10-19T00:00:00Z");

function feat(over: Partial<NavareaFeaturePoint>): NavareaFeaturePoint {
  return {
    id: "HYDROPAC-26-3002",
    region: "HYDROPAC",
    source: "nga",
    date: "2026-10-16T10:00:00.000Z",
    areaHint: "",
    description:
      "GULF OF OMAN. OMAN. M/V PETRO DOLPHIN SUFFERED SECURITY INCIDENT, ADRIFT IN 24-30.36N 057-27.11E ON 12 OCT. VESSELS ARE ADVISED TO KEEP CLEAR OF THIS POSITION AND TO EXERCISE EXTREME CAUTION.",
    geometryType: "Point",
    radiusNm: null,
    lat: 24.506,
    lng: 57.452,
    geometry: { type: "Point", coordinates: [57.452, 24.506] },
    ...over,
  };
}

describe("NGA 보안 사건 → 선박 사건 스택", () => {
  it("실제 NGA 문구(보안 사건)를 선박명·해역과 함께 올린다", () => {
    const it = stackItemFromNavarea(feat({}), true, NOW)!;
    expect(it).toMatchObject({
      id: "nga:HYDROPAC-26-3002",
      source: "nga",
      vesselName: "PETRO DOLPHIN",
      place: "GULF OF OMAN · OMAN",
    });
    expect(it.title).toBe("보안 사건 · PETRO DOLPHIN");
    expect(it.times?.publishedAt).toBe(Date.parse("2026-10-16T10:00:00.000Z"));
  });

  it("침몰·표류 같은 사고, 훈련 경보는 올리지 않는다", () => {
    expect(stackItemFromNavarea(feat({ description: "M/V CAPE DAO SANK IN 24-21.48N 057-40.65E." }), true, NOW)).toBeNull();
    expect(
      stackItemFromNavarea(feat({ description: "HAZARDOUS OPERATIONS, ROCKET LAUNCHING 191951Z TO 192013Z OCT." }), true, NOW),
    ).toBeNull();
  });

  it("2주가 지난 경보와 NGA가 아닌 출처는 뺀다", () => {
    expect(stackItemFromNavarea(feat({ date: "2026-09-01T00:00:00.000Z" }), true, NOW)).toBeNull();
    expect(stackItemFromNavarea(feat({ source: "jhod" }), true, NOW)).toBeNull();
  });

  it("한 경보가 점 여러 개여도 한 건으로 센다", () => {
    const list = ngaSecurityStackItems([feat({ id: "HYDROPAC-26-3002#1" }), feat({ id: "HYDROPAC-26-3002#2" })], true, NOW);
    expect(list).toHaveLength(1);
  });

  it("해역명은 앞의 대문자 문장 두 개까지", () => {
    expect(ngaAreaLabel("STRAIT OF HORMUZ. OMAN. 1. M/V LIPSI SUFFERED A SECURITY INCIDENT")).toBe("STRAIT OF HORMUZ · OMAN");
    expect(ngaAreaLabel("ARABIAN SEA. DNC 10. FOO")).toBe("ARABIAN SEA");
  });
});
