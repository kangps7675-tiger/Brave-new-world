import { describe, expect, it } from "vitest";
import { pickIncidentMmsis } from "@/lib/incidentVessels";

describe("pickIncidentMmsis", () => {
  it("확인·유력은 level 1, 후보 여럿은 level 2(상위 3), unknown은 제외", () => {
    const m = pickIncidentMmsis([
      { status: "confirmed", top: { mmsi: "111" } },
      { status: "likely", top: { mmsi: "222" } },
      { status: "ambiguous", top: { mmsi: "333" }, candidates: [{ mmsi: "333" }, { mmsi: "444" }, { mmsi: "555" }, { mmsi: "666" }] },
      { status: "unknown", top: null, candidates: [{ mmsi: "777" }] },
    ]);
    expect(m.get("111")).toBe(1);
    expect(m.get("222")).toBe(1);
    expect(m.get("333")).toBe(2);
    expect(m.get("555")).toBe(2);
    expect(m.has("666")).toBe(false);
    expect(m.has("777")).toBe(false);
  });
  it("확인된 배는 다른 사건의 후보에 있어도 level 1 유지", () => {
    const m = pickIncidentMmsis([
      { status: "confirmed", top: { mmsi: "1" } },
      { status: "ambiguous", candidates: [{ mmsi: "1" }] },
    ]);
    expect(m.get("1")).toBe(1);
  });
});
