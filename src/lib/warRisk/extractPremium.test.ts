import { describe, expect, it } from "vitest";
import { detectWarRiskRegion, extractWarRiskQuote } from "./extractPremium";

describe("extractWarRiskQuote", () => {
  it("hull value % 를 strong 으로 뽑는다", () => {
    const q = extractWarRiskQuote(
      "Red Sea war risk premiums jump to 1% of ship value after Houthi attack - Reuters",
    );
    expect(q).toMatchObject({ region: "red-sea", ratePct: 1, confidence: "strong", direction: "up" });
    expect(q?.quote).not.toContain("Reuters");
  });

  it("from X% to Y% 를 이전값·현재값으로 뽑는다", () => {
    const q = extractWarRiskQuote(
      "War risk insurance for Gulf voyages has risen from 0.2% to 0.5% of hull value, brokers said.",
    );
    expect(q).toMatchObject({ region: "hormuz", ratePct: 0.5, ratePrevPct: 0.2, direction: "up" });
  });

  it("per cent 표기와 하락 방향", () => {
    const q = extractWarRiskQuote(
      "Black Sea war risk rates eased to 0.75 per cent of a vessel's value as grain corridor held",
    );
    expect(q).toMatchObject({ region: "black-sea", ratePct: 0.75, direction: "down", confidence: "strong" });
  });

  it("항차당 금액과 % 를 같이 뽑는다", () => {
    const q = extractWarRiskQuote(
      "Underwriters now quote 0.7% of hull value for the Red Sea, or about $700,000 per voyage for a $100 million ship.",
    );
    expect(q?.ratePct).toBe(0.7);
    expect(q?.usdPerVoyage).toBe(700000);
  });

  it("항차당 금액만 있어도 뽑는다", () => {
    const q = extractWarRiskQuote(
      "Shipowners pay an extra $1 million per voyage in war risk premiums to cross Hormuz",
    );
    expect(q).toMatchObject({ ratePct: null, usdPerVoyage: 1_000_000, region: "hormuz" });
  });

  it("유가 % 는 보험료로 보지 않는다", () => {
    expect(
      extractWarRiskQuote("Oil rises 3% as Red Sea attacks lift war risk fears for tankers"),
    ).toBeNull();
  });

  it("운임 % 는 보험료로 보지 않는다", () => {
    expect(
      extractWarRiskQuote(
        "Container freight rates up 4% on Red Sea diversions; war risk cover remains tight",
      ),
    ).toBeNull();
  });

  it("전쟁위험 보험 주제가 아니면 아무것도 안 뽑는다", () => {
    expect(extractWarRiskQuote("Premium tanker owner reports 2% rise in quarterly profit")).toBeNull();
  });

  it("15% 초과·세 자리 % 는 버린다", () => {
    expect(
      extractWarRiskQuote("War risk premiums soared 300% in a week for Red Sea transits"),
    ).toBeNull();
    expect(extractWarRiskQuote("War risk premiums up 115% of last year's level")).toBeNull();
    expect(extractWarRiskQuote("War risk now 20% of hull value, broker claims")).toBeNull();
  });

  it("한국어 기사", () => {
    const q = extractWarRiskQuote("홍해 전쟁위험 보험료, 선가의 0.7%까지 급등");
    expect(q).toMatchObject({ region: "red-sea", ratePct: 0.7, confidence: "strong", direction: "up" });
  });
});

describe("detectWarRiskRegion", () => {
  it("먼저 나온 해역을 고른다", () => {
    expect(detectWarRiskRegion("Hormuz tensions spill into Red Sea")).toBe("hormuz");
    expect(detectWarRiskRegion("Insurers watch Taiwan")).toBe("taiwan-strait");
    expect(detectWarRiskRegion("Global marine insurers meet")).toBe("other");
  });
});

describe("Gulf 표기", () => {
  it("그냥 Gulf 는 호르무즈, Gulf of Mexico 는 아님, Gulf of Aden 은 홍해", () => {
    expect(detectWarRiskRegion("Gulf shipping insurers")).toBe("hormuz");
    expect(detectWarRiskRegion("Gulf of Mexico hurricane cover")).toBe("other");
    expect(detectWarRiskRegion("Gulf of Aden attacks")).toBe("red-sea");
  });
});

describe("2026년 실제 보도 문구", () => {
  it("S&P Global 제목 — war risk 단어 없이 hull value 범위", () => {
    const q = extractWarRiskQuote("Strait of Hormuz rates hit 7.5%-10% of hull value");
    expect(q).toMatchObject({ region: "hormuz", ratePct: 7.5, rateHighPct: 10, confidence: "strong", direction: "up" });
  });

  it("범위 → 범위 from-to", () => {
    const q = extractWarRiskQuote(
      "Additional war risk premiums in the region have jumped from 1%-3% of hull value weeks ago to 7.5%-10% currently, Marsh said.",
    );
    expect(q).toMatchObject({ ratePct: 7.5, rateHighPct: 10, ratePrevPct: 3, direction: "up" });
  });

  it("Bab al-Mandab 단일 수치", () => {
    const q = extractWarRiskQuote(
      "Premiums for vessels transiting the Bab al-Mandab Strait currently stand at 0.5% of hull value, according to Baker.",
    );
    expect(q).toMatchObject({ region: "red-sea", ratePct: 0.5, rateHighPct: null, confidence: "strong" });
  });

  it("'a tenth of a vessel's hull value'", () => {
    const q = extractWarRiskQuote(
      "Insurance premiums for vessels transiting the Gulf are still being quoted as high as a tenth of a vessel's hull value",
    );
    expect(q).toMatchObject({ region: "hormuz", ratePct: 10, confidence: "strong" });
  });

  it("'for a single voyage' 금액", () => {
    const q = extractWarRiskQuote(
      "A vessel insured for $100 million could face a war risk premium of about $10 million for a single voyage.",
    );
    expect(q?.usdPerVoyage).toBe(10_000_000);
  });
});
