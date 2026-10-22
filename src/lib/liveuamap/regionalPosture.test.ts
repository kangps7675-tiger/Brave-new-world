import { describe, expect, it } from "vitest";
import { classifyRegionalPosture } from "@/lib/liveuamap/regionalPosture";

const base = { body: "", titleKo: "", bodyKo: "", tags: [] as string[], lat: 50, lng: 30 };
describe("classifyRegionalPosture", () => {
  it("휴전 협상은 외교", () => {
    expect(classifyRegionalPosture({ ...base, title: "Ceasefire talks resume in Doha" })?.kind).toBe("diplomacy");
  });
  it("대사 소환도 외교", () => {
    expect(classifyRegionalPosture({ ...base, title: "Ambassador summoned over border incident" })?.kind).toBe("diplomacy");
  });
  it("제목에 위협이 있으면 언사", () => {
    expect(classifyRegionalPosture({ ...base, title: "Tehran warns it will retaliate" })?.kind).toBe("rhetoric");
  });
  it("본문에만 있는 언사는 제외", () => {
    expect(classifyRegionalPosture({ ...base, title: "Officials met", body: "He warned of consequences." })).toBeNull();
  });
  it("훈련은 제외", () => {
    expect(classifyRegionalPosture({ ...base, title: "Naval drills, talks planned" })).toBeNull();
  });
  it("타격 속보는 타격 쪽이 맡는다", () => {
    expect(classifyRegionalPosture({ ...base, title: "Missile struck and destroyed a depot, sanctions" })).toBeNull();
  });
});
