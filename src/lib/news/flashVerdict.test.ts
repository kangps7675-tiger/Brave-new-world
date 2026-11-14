import { describe, expect, it } from "vitest";
import {
  computeFlashVerdict,
  flashVerdictBasis,
  flashVerdictLabel,
  flashVerdictNote,
} from "@/lib/news/flashVerdict";

const item = (
  source: string,
  trustTier: 1 | 2 | 3,
  publisher?: string,
  text?: { title?: string; summary?: string },
) => ({
  source,
  publisher,
  trustTier,
  ...text,
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

describe("통신사 재전재", () => {
  it("통신사 기사를 받아 쓴 매체는 그 통신사 한 곳으로 센다", () => {
    const v = computeFlashVerdict([
      item("Reuters", 1),
      item("BBC", 1, undefined, { title: "KYIV (Reuters) - Russia launches drones at Odesa" }),
    ]);
    expect(v.independentCount).toBe(1);
    expect(v.verdict).toBe("likely");
    expect(v.sources).toEqual(["Reuters"]);
    expect(v.wireMerged).toBe(1);
  });

  it("통신사 기사가 목록에 없어도, 둘 다 같은 통신사를 인용하면 한 곳이다", () => {
    const v = computeFlashVerdict([
      item("BBC", 1, undefined, { summary: "Drones hit the port, according to Reuters." }),
      item("Al Jazeera", 2, undefined, { summary: "A port official told Reuters that two berths burned." }),
    ]);
    expect(v.independentCount).toBe(1);
    expect(v.verdict).toBe("likely");
    expect(v.sources).toEqual(["Reuters"]);
    expect(v.wireMerged).toBe(2);
  });

  it("통신사와 자체 취재 매체는 서로 다른 곳이다", () => {
    const v = computeFlashVerdict([
      item("Reuters", 1),
      item("Al Jazeera", 2, undefined, { title: "Gaza ceasefire talks resume in Cairo" }),
    ]);
    expect(v.verdict).toBe("confirmed");
    expect(v.independentCount).toBe(2);
    expect(v.wireMerged).toBe(0);
  });

  it("서로 다른 통신사는 별개의 출처다", () => {
    const v = computeFlashVerdict([
      item("Reuters", 1),
      item("AP News", 1),
      item("The Hindu", 2, undefined, { title: "NEW DELHI (PTI) - Talks begin" }),
    ]);
    expect(v.independentCount).toBe(3);
    expect(v.verdict).toBe("confirmed");
  });

  it("(AP)가 지역 약어일 때는 통신사로 보지 않는다", () => {
    const v = computeFlashVerdict([
      item("Reuters", 1),
      item("The Hindu", 2, undefined, { title: "Andhra Pradesh (AP) officials said floods worsened" }),
    ]);
    expect(v.independentCount).toBe(2);
    expect(v.wireMerged).toBe(0);
  });

  it("국영·당사자 매체는 통신사를 인용해도 센 수에 들어가지 않는다", () => {
    const v = computeFlashVerdict([
      item("TASS", 3, undefined, { title: "MOSCOW (Reuters) - Kremlin says talks failed" }),
    ]);
    expect(v.verdict).toBe("nodata");
    expect(v.independentCount).toBe(0);
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

  it("통신사로 합친 매체가 있으면 근거 문장이 그 사실을 말한다", () => {
    const info = computeFlashVerdict([
      item("Reuters", 1),
      item("BBC", 1, undefined, { title: "KYIV (Reuters) - Drones hit Odesa" }),
      item("Al Jazeera", 2),
    ]);
    expect(info.verdict).toBe("confirmed");
    expect(flashVerdictBasis(info, "ko")).toContain("2곳");
    expect(flashVerdictBasis(info, "ko")).toContain("1곳은 그 통신사 한 곳으로 셌습니다");
    expect(flashVerdictBasis(info, "en")).toContain("count as that wire once");
  });

  it("주의 문구는 사실 판정이 아니라고 말한다", () => {
    expect(flashVerdictNote("ko")).toContain("판정은 아닙니다");
    expect(flashVerdictNote("en")).toContain("does not rule on whether it is true");
  });
});
