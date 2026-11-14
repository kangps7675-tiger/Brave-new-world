import { describe, expect, it } from "vitest";
import { classifyActor, countActors } from "./attackActor";

describe("classifyActor", () => {
  it("문구에 IRGC가 있으면 이란 측", () => {
    expect(classifyActor({ detail: "fired on by two IRGC gunboats" }).actor).toBe("iran");
  });
  it("봉쇄 집행·군 작전 문구는 주체를 못 박지 않고 military", () => {
    const r = classifyActor({ detail: "tanker was subject to interaction as part of ongoing military activity" });
    expect(r.actor).toBe("military");
    expect(r.evidence).toContain("주체를 적지 않음");
  });
  it("명시된 미군은 us", () => {
    expect(classifyActor({ detail: "boarded by US forces" }).actor).toBe("us");
  });
  it("호르무즈의 소형 보트는 해적으로 단정하지 않는다", () => {
    expect(classifyActor({ detail: "approached by small craft", lat: 26.3, lng: 56.4 }).actor).toBe("unknown");
  });
  it("아덴만의 소형 보트는 해적 수법(추정)", () => {
    expect(classifyActor({ detail: "two skiffs approached", lat: 12.5, lng: 48 }).actor).toBe("pirates");
  });
  it("아무 단서가 없으면 미상, 그리고 'status' 같은 단어에 걸리지 않는다", () => {
    expect(classifyActor({ detail: "status unknown, struck by projectile" }).actor).toBe("unknown");
    expect(countActors([{ detail: "IRGC" }, { detail: "x" }]).iran).toBe(1);
  });
});
