import { describe, expect, it } from "vitest";
import {
  computeFlashVerdict,
  flashVerdictBasis,
  flashVerdictLabel,
} from "@/lib/news/flashVerdict";

const item = (source: string, trustTier: 1 | 2 | 3, publisher?: string) => ({
  source,
  publisher,
  trustTier,
});

describe("computeFlashVerdict", () => {
  it("1등급 포함 독립 매체 둘 이상이면 확인", () => {
    const v = computeFlashVerdict([item("Reuters", 1), item("Al Jazeera", 2)]);
    expect(v.verdict).toBe("confirmed");
    expect(v.independentCount).toBe(2);
    expect(v.sources).toEqual(["Reuters", "Al Jazeera"]);
  });

  it("같은 매체가 여러 건이면 한 곳으로 센다", () => {
    const v = computeFlashVerdict([
      item("Reuters", 1),
      item("Reuters World", 1, "Reuters"),
      item("reuters", 1),
    ]);
    expect(v.independentCount).toBe(1);
    expect(v.verdict).toBe("likely");
  });

  it("2등급 둘만 있으면 유력 (1등급이 빠져 있다)", () => {
    const v = computeFlashVerdict([item("Al Jazeera", 2), item("Middle East Eye", 2)]);
    expect(v.verdict).toBe("likely");
    expect(v.independentCount).toBe(2);
  });

  it("독립 매체 한 곳이면 유력", () => {
    const v = computeFlashVerdict([item("BBC", 1)]);
    expect(v.verdict).toBe("likely");
    expect(v.partyOnly).toBe(false);
  });

  it("국영·당사자 발표만 있으면 자료 없음 — 많아도 서로 받쳐 주지 않는다", () => {
    const v = computeFlashVerdict([item("TASS", 3), item("RT", 3), item("Xinhua", 3)]);
    expect(v.verdict).toBe("nodata");
    expect(v.independentCount).toBe(0);
    expect(v.partyOnly).toBe(true);
  });

  it("독립 한 곳 + 당사자 발표는 유력이고 당사자 표시가 남는다", () => {
    const v = computeFlashVerdict([item("Reuters", 1), item("TASS", 3)]);
    expect(v.verdict).toBe("likely");
    expect(v.partyOnly).toBe(true);
  });

  it("빈 목록은 자료 없음", () => {
    expect(computeFlashVerdict([]).verdict).toBe("nodata");
  });
});

describe("라벨·근거", () => {
  it("랜딩과 같은 말을 쓴다", () => {
    expect(flashVerdictLabel("confirmed", "ko")).toBe("확인");
    expect(flashVerdictLabel("likely", "ko")).toBe("유력");
    expect(flashVerdictLabel("nodata", "ko")).toBe("자료 없음");
  });

  it("근거 문장에 매체 수와 이름이 들어간다", () => {
    const info = computeFlashVerdict([item("Reuters", 1), item("BBC", 1)]);
    expect(flashVerdictBasis(info, "ko")).toContain("2곳");
    expect(flashVerdictBasis(info, "ko")).toContain("Reuters");
  });
});
