import { describe, expect, it } from "vitest";
import { classifyRegionalPosture } from "@/lib/liveuamap/regionalPosture";

const base = { body: "", titleKo: "", bodyKo: "", tags: [] as string[], lat: 50, lng: 30 };
describe("classifyRegionalPosture", () => {
  it("휴전 협상은 외교", () => {
    expect(classifyRegionalPosture({ ...base, title: "Ceasefire talks resume in Doha" })?.kind).toBe("diplomacy");
  });
  it("북러 국방협력 문장은 외교", () => {
    expect(classifyRegionalPosture({ ...base, title: "North Korea sends artillery shells to Russia" })?.kind).toBe("diplomacy");
    expect(classifyRegionalPosture({ ...base, title: "북러 국방협력으로 포탄을 보냈다" })?.kind).toBe("diplomacy");
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
  it("훈련은 훈련 칸이고 외교로 합치지 않는다", () => {
    expect(classifyRegionalPosture({ ...base, title: "Naval drills, talks planned" })?.kind).toBe("exercise");
  });
  it("미확인 훈련은 비운다", () => {
    expect(classifyRegionalPosture({ ...base, title: "Unconfirmed naval drills near the strait" })).toBeNull();
  });
  it("산업스파이 체포는 기소 칸이다", () => {
    expect(classifyRegionalPosture({ ...base, title: "Engineer arrested over industrial espionage" })?.kind).toBe("charge");
  });
  it("수역을 닫거나 항의하면 폐쇄 칸이다", () => {
    expect(classifyRegionalPosture({ ...base, title: "Coast guard closes waters for a live-fire" })?.kind).toBe("closure");
    expect(classifyRegionalPosture({ ...base, title: "Japan protests the Chinese drill" })?.kind).toBe("closure");
  });
  it("타격 속보는 타격 쪽이 맡는다", () => {
    expect(classifyRegionalPosture({ ...base, title: "Missile struck and destroyed a depot, sanctions" })).toBeNull();
  });
});
