import { describe, expect, it } from "vitest";
import { classifyMediaTier, describeMedia } from "@/lib/news/mediaTiers";

describe("도메인 기준 매체 구별", () => {
  it("정부·군 공식 사이트는 이름이 뭐든 당사자(3등급)다", () => {
    expect(classifyMediaTier("Foreign Ministry", "https://www.mofa.go.kr/a")).toBe(3);
    expect(classifyMediaTier("", "https://www.centcom.mil/MEDIA/PRESS-RELEASES/")).toBe(3);
    expect(classifyMediaTier("", "https://www.gov.uk/government/news/x")).toBe(3);
    expect(classifyMediaTier("", "https://en.kremlin.ru/events/president/news/1")).toBe(3);
  });

  it("등록된 매체는 이름이 아니라 도메인으로 잡고 하위 도메인도 잡는다", () => {
    expect(classifyMediaTier("", "https://en.yna.co.kr/view/1")).toBe(1);
    expect(classifyMediaTier("아무 이름", "https://tass.com/world/1")).toBe(3);
    expect(classifyMediaTier("", "https://www.reuters.com/world/x")).toBe(1);
    expect(classifyMediaTier("", "https://www.nbcnews.com/x")).toBe(2);
  });

  it("비슷한 이름의 다른 사이트에 속지 않는다", () => {
    expect(classifyMediaTier("", "https://reuters.com.fake-news.example/x")).toBe(2);
    expect(classifyMediaTier("", "https://nottass.com/x")).toBe(2);
  });

  it("성격 라벨을 풀어 주고, 주소가 없으면 지어내지 않는다", () => {
    expect(describeMedia("TASS", "https://tass.com/x").label).toBe("러시아 국영");
    expect(describeMedia("", "https://www.state.gov/x").label).toBe("미국 정부 1차 원문");
    expect(describeMedia("", "https://www.centcom.mil/x").label).toBe("미국 군 1차 원문");
    expect(describeMedia("", "https://www.nato.int/x").label).toBe("나토 기구 1차 원문");
    expect(describeMedia("Reuters", "https://www.reuters.com/x").label).toBe("통신사");
    expect(describeMedia("TASS", "").label).toBeNull();
  });
});
