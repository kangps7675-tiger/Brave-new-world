/**
 * EvidenceTier 시각 구분 테스트.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 이 테스트가 ArmyInform 선행조건인가
 * ══════════════════════════════════════════════════════════════════════
 *
 * 우크라이나 국방부 매체의 타격 좌표(`claimed`)를 FIRMS 위성 탐지(`observed`)와
 * **같은 모양으로** 그리면 교전 당사자의 주장이 관측과 동급이 된다.
 * 그 순간 제품의 인식론이 무너진다.
 *
 * 이 테스트가 "관측과 주장은 반드시 다르게 보인다"를 잠근다.
 */
import { describe, expect, it } from "vitest";
import {
  applyTierOpacity,
  EVIDENCE_TIER_LEGEND,
  tierAriaSuffix,
  tierBorderCss,
  tierBorderStyle,
  tierLineDash,
} from "@/lib/evidenceTierMarker";
import { EVIDENCE_TIERS, isEvidenceTierShippable } from "@/lib/evidenceTier";

describe("관측 vs 주장 — 반드시 다르게 보여야 한다", () => {
  it("★ observed 와 claimed 는 테두리 모양이 다르다", () => {
    // 이게 무너지면 ArmyInform 을 붙이면 안 된다
    expect(tierBorderStyle("observed")).not.toBe(tierBorderStyle("claimed"));
  });

  it("★ observed 와 unverified 도 다르다", () => {
    expect(tierBorderStyle("observed")).not.toBe(tierBorderStyle("unverified"));
  });

  it("관측·보도는 실선", () => {
    expect(tierBorderStyle("observed")).toBe("solid");
    expect(tierBorderStyle("reported")).toBe("solid");
  });

  it("주장·추정은 파선", () => {
    expect(tierBorderStyle("claimed")).toBe("dashed");
    expect(tierBorderStyle("model")).toBe("dashed");
  });

  it("미확인은 점선", () => {
    expect(tierBorderStyle("unverified")).toBe("dotted");
  });
});

describe("tierLineDash — Canvas 용", () => {
  it("실선은 빈 배열", () => {
    expect(tierLineDash("observed")).toEqual([]);
  });

  it("파선·점선은 패턴이 다르다", () => {
    const dashed = tierLineDash("claimed");
    const dotted = tierLineDash("unverified");
    expect(dashed.length).toBeGreaterThan(0);
    expect(dotted.length).toBeGreaterThan(0);
    expect(dashed).not.toEqual(dotted);
  });

  it("scale 이 패턴을 비례 확대한다", () => {
    const base = tierLineDash("claimed", 1);
    const big = tierLineDash("claimed", 2);
    expect(big).toEqual(base.map((n) => n * 2));
  });
});

describe("tierBorderCss", () => {
  it("CSS 한 줄을 만든다", () => {
    expect(tierBorderCss("claimed", 1.5, "rgba(255,160,60,0.9)")).toBe(
      "1.5px dashed rgba(255,160,60,0.9)",
    );
  });

  it("관측은 실선으로", () => {
    expect(tierBorderCss("observed", 2, "#fff")).toBe("2px solid #fff");
  });
});

describe("applyTierOpacity — 확신이 낮을수록 흐리게", () => {
  it("미확인은 관측보다 흐리다", () => {
    const observed = applyTierOpacity("rgba(255, 70, 85, 1)", "observed");
    const unverified = applyTierOpacity("rgba(255, 70, 85, 1)", "unverified");
    const a = Number(/,\s*([\d.]+)\)$/.exec(observed)![1]);
    const b = Number(/,\s*([\d.]+)\)$/.exec(unverified)![1]);
    expect(b).toBeLessThan(a);
  });

  it("기존 알파에 배수를 적용한다", () => {
    // 0.8 × claimed(0.75) = 0.6
    expect(applyTierOpacity("rgba(10, 20, 30, 0.8)", "claimed")).toBe(
      "rgba(10, 20, 30, 0.6)",
    );
  });

  it("알파가 없으면 1 로 본다", () => {
    expect(applyTierOpacity("rgb(10, 20, 30)", "observed")).toBe("rgba(10, 20, 30, 1)");
  });

  it("★ 해석 못 하는 형식은 원본 그대로 — 색을 깨뜨리지 않는다", () => {
    // 구분을 포기할지언정 마커를 망가뜨리면 안 된다
    for (const v of ["#ff0000", "hsl(0, 100%, 50%)", "red", ""]) {
      expect(applyTierOpacity(v, "claimed")).toBe(v);
    }
  });
});

describe("접근성", () => {
  it("모든 tier 에 한국어 라벨이 있다", () => {
    for (const t of EVIDENCE_TIERS) {
      expect(tierAriaSuffix(t, "ko").length).toBeGreaterThan(2);
      expect(tierAriaSuffix(t, "en").length).toBeGreaterThan(2);
    }
  });

  it("주장은 '당사자 주장'으로 읽힌다 — 색각·저시력 사용자에게도 전달", () => {
    expect(tierAriaSuffix("claimed", "ko")).toContain("당사자 주장");
    expect(tierAriaSuffix("claimed", "en")).toContain("claimed by a party");
  });
});

describe("범례", () => {
  it("모양의 뜻을 설명한다 — 안 그러면 구분이 작동하지 않는다", () => {
    expect(EVIDENCE_TIER_LEGEND.length).toBeGreaterThan(3);
    for (const e of EVIDENCE_TIER_LEGEND) {
      expect(e.style).toBe(tierBorderStyle(e.tier));
      expect(e.ko.length).toBeGreaterThan(0);
    }
  });

  it("synthetic 은 범례에 없다 — 프로덕션에 안 나간다", () => {
    const tiers = EVIDENCE_TIER_LEGEND.map((e) => e.tier);
    expect(tiers).not.toContain("synthetic");
    for (const t of tiers) {
      expect(isEvidenceTierShippable(t)).toBe(true);
    }
  });
});
