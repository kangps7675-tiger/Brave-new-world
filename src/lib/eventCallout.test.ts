import { describe, expect, it } from "vitest";
import type { StackItem } from "@/lib/incidentStack/build";
import { calloutAgeLabel, calloutFromStackItem, clipCalloutText } from "./eventCallout";

describe("사건 콜아웃", () => {
  it("긴 설명은 문장 끝에서 줄이고 말줄임표를 붙인다", () => {
    const long = `${"가".repeat(120)}다. ${"나".repeat(120)}`;
    const out = clipCalloutText(long, 170);
    expect(out.endsWith("…") || out.endsWith("다.")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(172);
  });

  it("짧은 글은 그대로 두고 공백만 정리한다", () => {
    expect(clipCalloutText("  유조선이\n피격됨  ")).toBe("유조선이 피격됨");
  });

  it("몇 분·시간·일 전으로 표시한다", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(calloutAgeLabel(now - 5 * 60_000, "ko", now)).toBe("5분 전");
    expect(calloutAgeLabel(now - 3 * 3_600_000, "ko", now)).toBe("3시간 전");
    expect(calloutAgeLabel(now - 3 * 86_400_000, "en", now)).toBe("3 d ago");
  });

  it("UKMTO 항목은 출처와 지명을 머리글로 가진다", () => {
    const item: StackItem = {
      id: "u1",
      source: "ukmto",
      at: Date.now() - 2 * 3_600_000,
      title: "공격 · 유조선",
      place: "아덴만",
      lat: 12.9,
      lng: 47.9,
      sea: "gulf_of_aden",
      detail: "Tanker reported attacked by two small craft.",
    };
    const c = calloutFromStackItem(item, "ko");
    expect(c).toMatchObject({ id: "u1", source: "UKMTO", lat: 12.9, lng: 47.9 });
    expect(c.meta).toContain("아덴만");
    expect(c.body).toContain("Tanker");
  });
});
