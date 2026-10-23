import { describe, expect, it } from "vitest";
import { isMajorConfirmedStrike } from "@/lib/liveuamap/majorStrike";

const base = { body: "", titleKo: "", bodyKo: "", tags: [] as string[], lat: 48.5, lng: 35.0 };

describe("isMajorConfirmedStrike", () => {
  it("공항에 드론이 떨어져 불이 난 속보는 큰 타격", () => {
    const r = isMajorConfirmedStrike({ ...base, title: "Drone struck the airport, fire reported" });
    expect(r?.reason).toBe("infrastructure");
  });
  it("사망 보도가 있으면 큰 타격", () => {
    const r = isMajorConfirmedStrike({ ...base, title: "Missile hit a residential area, 5 killed" });
    expect(r?.reason).toBe("casualty");
  });
  it("미사일 + 파손은 큰 타격", () => {
    const r = isMajorConfirmedStrike({ ...base, title: "Missile struck and destroyed a warehouse" });
    expect(r?.kind).toBe("missile");
  });
  it("피해 표현 없는 드론 타격은 제외", () => {
    expect(isMajorConfirmedStrike({ ...base, title: "Drone hit a field" })).toBeNull();
  });
  it("요격·격추는 제외", () => {
    expect(
      isMajorConfirmedStrike({ ...base, title: "Drone shot down near the airport, fire on debris" }),
    ).toBeNull();
  });
  it("무기 단어 없는 속보는 제외", () => {
    expect(isMajorConfirmedStrike({ ...base, title: "Airport destroyed, 3 killed" })).toBeNull();
  });
});
