import { describe, expect, it } from "vitest";
import { pickMatchedVessel } from "./matchedVessel";

const rows = [
  { incident: { id: "a1" }, status: "confirmed", top: { name: "SOUNION", imo: "9000001" } },
  { incident: { id: "b2" }, status: "likely", top: { name: "TUTOR", imo: null } },
  { incident: { id: "c3" }, status: "ambiguous", top: { name: "X" } },
  { incident: { id: "d4" }, status: "unknown", top: null },
  { incident: { id: "e5" }, status: "likely", top: { name: "  ", imo: null } },
];

describe("pickMatchedVessel", () => {
  it("확인·유력만 이름을 돌려준다", () => {
    expect(pickMatchedVessel(rows, "ukmto:a1")).toEqual({ name: "SOUNION", imo: "9000001", status: "confirmed" });
    expect(pickMatchedVessel(rows, "ukmto:b2")).toEqual({ name: "TUTOR", imo: null, status: "likely" });
  });
  it("후보가 여럿이거나 못 좁힌 사건·이름 없는 후보는 null", () => {
    expect(pickMatchedVessel(rows, "ukmto:c3")).toBeNull();
    expect(pickMatchedVessel(rows, "ukmto:d4")).toBeNull();
    expect(pickMatchedVessel(rows, "ukmto:e5")).toBeNull();
  });
  it("UKMTO 가 아니거나 없는 id 는 null", () => {
    expect(pickMatchedVessel(rows, "liveua:a1")).toBeNull();
    expect(pickMatchedVessel(rows, "ukmto:zzz")).toBeNull();
  });
});
