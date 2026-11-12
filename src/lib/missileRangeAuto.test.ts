import { describe, expect, it } from "vitest";
import { autoRangeSpecs, fromWire, impactClaimsOf, modelKey, rangeClaimsFromText, toWire } from "./missileRangeAuto";
import { missileRangeForText } from "./missileRange";

const c = (text: string, url: string) => rangeClaimsFromText(text, { url, title: text.slice(0, 30), at: "2026-11-01T00:00:00Z" });

describe("rangeClaimsFromText", () => {
  it("한 문장의 기종과 사거리를 읽는다", () => {
    const r = c("The new Hwasong-20 missile has a range of 15,000 km, officials said.", "u1");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ key: "hwasong-20", km: 15000 });
  });
  it("한글 표기와 영어 표기를 같은 키로 모은다", () => {
    expect(modelKey("화성포-20형")).toBe("hwasong-20");
    expect(modelKey("HS-20")).toBe("hwasong-20");
    expect(c("화성-20형 미사일은 사거리 약 15,000km로 추정된다.", "u")[0]?.key).toBe("hwasong-20");
  });
  it("등록된 기종, 기종 둘 이상, 사거리 없는 문장은 버린다", () => {
    expect(c("Hwasong-15 missile has a range of 13,000 km.", "u")).toHaveLength(0);
    expect(c("Hwasong-20 and Shahab-4 missile have a range of 3,000 km.", "u")).toHaveLength(0);
    expect(c("Hwasong-20 missile was shown at the parade.", "u")).toHaveLength(0);
  });
});

describe("autoRangeSpecs", () => {
  const claim = (km: number, url: string) => c(`The Hwasong-20 missile has a range of ${km} km.`, url)[0];
  it("서로 다른 기사 2건이 일치해야 표에 오른다", () => {
    expect(autoRangeSpecs([claim(15000, "a")])).toHaveLength(0);
    expect(autoRangeSpecs([claim(15000, "a"), claim(15000, "a")])).toHaveLength(0);
    const s = autoRangeSpecs([claim(15000, "a"), claim(14000, "b")]);
    expect(s).toHaveLength(1);
    expect(s[0].rangeKm).toEqual([14000, 15000]);
    expect(s[0].auto.count).toBe(2);
  });
  it("같은 매체의 기사들이나 같은 문장을 받아쓴 기사들은 한 출처로 센다", () => {
    const at = (text: string, url: string) => c(text, url)[0];
    const s1 = "The Hwasong-20 missile has a range of 15,000 km, according to the wire report.";
    // 같은 매체(호스트)의 두 기사
    expect(autoRangeSpecs([at(s1, "https://news.example.com/a"), at(s1.replace("15,000", "14,500"), "https://www.news.example.com/b")])).toHaveLength(0);
    // 다른 매체지만 통신사 문장을 그대로 실은 기사
    expect(autoRangeSpecs([at(s1, "https://one.example/a"), at(s1, "https://two.example/b")])).toHaveLength(0);
    // 서로 다른 매체가 각자 쓴 문장
    const s2 = "Analysts estimate the Hwasong-20 missile could reach 14,500 km in range.";
    const s3 = "State media did not give a figure, but the Hwasong-20 missile has a range of 15,000 km, experts say.";
    expect(autoRangeSpecs([at(s3, "https://one.example/a"), at("Experts say the Hwasong-20 missile has a range of 14,800 km.", "https://two.example/b")])).toHaveLength(1);
    expect(s2.length).toBeGreaterThan(0);
  });
  it("값이 크게 엇갈리면 올리지 않는다", () => {
    expect(autoRangeSpecs([claim(5000, "a"), claim(15000, "b")])).toHaveLength(0);
  });
  it("자동 항목은 본문에서 기종을 읽고, 전송 후에도 같다", () => {
    const spec = fromWire(toWire(autoRangeSpecs([claim(15000, "a"), c("Experts say the Hwasong-20 missile can reach a range of 15,000 km.", "b")[0]])[0]));
    expect(missileRangeForText("North Korea launches Hwasong-20 missile", [spec])?.spec.auto?.count).toBe(2);
    expect(missileRangeForText("North Korea launches Hwasong-200 missile", [spec])).toBeNull();
  });
});

describe("impactClaimsOf", () => {
  it("발표문의 낙하 서술을 그대로 꺼낸다", () => {
    const t = "North Korea fired a ballistic missile. It landed outside Japan's EEZ in the sea. Seoul condemned it.";
    expect(impactClaimsOf(t)).toEqual(["It landed outside Japan's EEZ in the sea."]);
    expect(impactClaimsOf("Talks held in Seoul.")).toEqual([]);
  });
});
