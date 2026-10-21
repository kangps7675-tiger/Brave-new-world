import { describe, expect, it } from "vitest";
import { templateWhyMattersText } from "./whyMattersPrompt";

describe("등불 「왜 중요?」 기본 해설", () => {
  it("기사 문장을 그대로 옮기고, 기사에 나온 해협·주제의 사실만 붙인다", () => {
    const text = templateWhyMattersText({
      title: "이란 전쟁으로 세계 석유력의 균형이 미국 쪽으로 기울다",
      excerpt:
        "이란 전쟁으로 세계 석유력의 균형이 미국 쪽으로 기울고, 캐나다와 아르헨티나 같은 국가에서는 구매자가 호르무즈 중단으로 공급 손실을 대체하기 위해 서두르면서 투자와 생산이 급증했습니다.",
      focusLabel: "중동 · 초크 · 호르무즈 · 이란 · 캐나다",
      lang: "ko",
    });
    expect(text).toContain("무슨 일인가요\n이란 전쟁으로 세계 석유력의 균형이");
    expect(text).toContain("호르무즈 해협은");
    expect(text).not.toContain("현지 안보·보급");
    expect(text).not.toContain("중동 · 초크");
  });

  it("맞는 설명이 없으면 지어내지 않는다", () => {
    const text = templateWhyMattersText({ title: "Election results announced", excerpt: "Voters chose a new mayor.", lang: "en" });
    expect(text).toContain("What happened\nVoters chose a new mayor.");
    expect(text).toContain("no ready-made background");
  });
});
