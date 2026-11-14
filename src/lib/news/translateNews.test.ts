import { describe, expect, it } from "vitest";
import { dropUntranslatedHeroes, isUntranslatedForKorean } from "@/lib/news/translateNews";
import type { HeroBreakingItem, NewsStreamPayload } from "@/lib/news/types";

const hero = (title: string, titleKo?: string) => ({ id: title, title, titleKo }) as unknown as HeroBreakingItem;
const payload = (h: HeroBreakingItem | null, flash: HeroBreakingItem[]) =>
  ({ hero: h, flashHeroes: flash, verified: [], stateMedia: [] }) as unknown as NewsStreamPayload;

describe("한국어 머리기사: 번역 안 된 외국어 제외", () => {
  it("히브리어 원문이 한국어 칸에 그대로 남으면 번역 안 된 것으로 본다", () => {
    expect(isUntranslatedForKorean(hero("ליטא: רחפן לא מזוהה", "ליטא: רחפן לא מזוהה"))).toBe(true);
  });

  it("한글 제목과 영문 제목은 그대로 둔다", () => {
    expect(isUntranslatedForKorean(hero("Drone over Lithuania", "리투아니아 상공 드론"))).toBe(false);
    expect(isUntranslatedForKorean(hero("Ukraine strikes refinery"))).toBe(false);
  });

  it("머리기사가 걸리면 번역된 다음 속보로 대신한다", () => {
    const bad = hero("ליטא: רחפן", "ליטא: רחפן");
    const good = hero("Drone over Lithuania", "리투아니아 상공 드론");
    const out = dropUntranslatedHeroes(payload(bad, [bad, good]));
    expect(out.hero).toBe(good);
    expect(out.flashHeroes).toEqual([good]);
  });

  it("대신할 속보가 없으면 머리기사를 비운다", () => {
    const bad = hero("ליטא: רחפן", "ליטא: רחפן");
    expect(dropUntranslatedHeroes(payload(bad, [bad])).hero).toBeNull();
  });

  it("문제가 없으면 같은 객체를 돌려준다", () => {
    const good = hero("Drone over Lithuania", "리투아니아 상공 드론");
    const p = payload(good, [good]);
    expect(dropUntranslatedHeroes(p)).toBe(p);
  });
});
