import { afterEach, describe, expect, it, vi } from "vitest";
import { caseIdOfStackItem, loadMatchedVessel, matchedVesselOf, resetMatchedVesselCache } from "./matchedVessel";

describe("matchedVesselOf", () => {
  it("확인·유력만 이름을 돌려준다", () => {
    expect(matchedVesselOf({ status: "confirmed", top: { name: "SOUNION", imo: "9000001" } })).toEqual({ name: "SOUNION", imo: "9000001", status: "confirmed" });
    expect(matchedVesselOf({ status: "likely", top: { name: "TUTOR", imo: null } })).toEqual({ name: "TUTOR", imo: null, status: "likely" });
  });
  it("후보가 여럿이거나 못 좁힌 사건·이름 없는 후보는 null", () => {
    expect(matchedVesselOf({ status: "ambiguous", top: { name: "X" } })).toBeNull();
    expect(matchedVesselOf({ status: "unknown", top: null })).toBeNull();
    expect(matchedVesselOf({ status: "likely", top: { name: "  " } })).toBeNull();
    expect(matchedVesselOf(null)).toBeNull();
  });
});

describe("caseIdOfStackItem", () => {
  it("ukmto 항목만 사건 id 를 돌려준다", () => {
    expect(caseIdOfStackItem("ukmto:abc")).toBe("abc");
    expect(caseIdOfStackItem("liveua:abc")).toBeNull();
    expect(caseIdOfStackItem("ukmto:")).toBeNull();
  });
});

describe("loadMatchedVessel", () => {
  afterEach(() => resetMatchedVesselCache());

  it("상세 응답에서 선박을 읽고 같은 사건은 다시 부르지 않는다", async () => {
    const f = vi.fn<(url: string) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ strike: { status: "likely", top: { name: "TUTOR", imo: "9943396" } } })),
    );
    const a = await loadMatchedVessel("c1", f as unknown as typeof fetch);
    const b = await loadMatchedVessel("c1", f as unknown as typeof fetch);
    expect(a).toEqual({ name: "TUTOR", imo: "9943396", status: "likely" });
    expect(b).toEqual(a);
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0]?.[0])).toBe("/api/strikes/c1");
  });

  it("실패하면 null", async () => {
    const f = vi.fn(async () => new Response("x", { status: 500 }));
    expect(await loadMatchedVessel("c2", f as unknown as typeof fetch)).toBeNull();
  });
});
