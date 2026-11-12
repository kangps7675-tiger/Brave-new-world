import { describe, expect, it } from "vitest";
import { localizedDoc, looksEnglish, translateDoc, type Translator } from "./translate";

const fake: Translator = async (text, target) => `[${target}] ${text}`;

describe("공식 문서 번역", () => {
  it("우크라이나어 제목은 한국어·영어로 둘 다 번역한다", async () => {
    const r = await translateDoc({ title: "Андрій Сибіга провів зустріч", summary: "Зустріч відбулася в Парижі." }, fake);
    expect(r).toEqual({
      titleKo: "[ko] Андрій Сибіга провів зустріч",
      titleEn: "[en] Андрій Сибіга провів зустріч",
      summaryKo: "[ko] Зустріч відбулася в Парижі.",
      summaryEn: "[en] Зустріч відбулася в Парижі.",
    });
  });

  it("영어 제목은 영어 칸에 그대로 두고 한국어만 번역하며, 한국어 제목은 반대로", async () => {
    const en = await translateDoc({ title: "Joint Statement on the Strait of Hormuz", summary: "" }, fake);
    expect(en).toMatchObject({ titleEn: "Joint Statement on the Strait of Hormuz", titleKo: "[ko] Joint Statement on the Strait of Hormuz", summaryKo: "", summaryEn: "" });
    const ko = await translateDoc({ title: "한미 외교장관 공동성명", summary: "" }, fake);
    expect(ko).toMatchObject({ titleKo: "한미 외교장관 공동성명", titleEn: "[en] 한미 외교장관 공동성명" });
  });

  it("영어가 아닌 라틴 문자 글(프랑스어)은 영어로 번역 대상이다", () => {
    expect(looksEnglish("Conseil des ministres du 12 novembre")).toBe(false);
    expect(looksEnglish("Foreign Minister meets the ambassador")).toBe(true);
  });

  it("제목 번역이 실패하면 null(재시도), 요약 번역만 실패하면 그 칸만 비운다", async () => {
    const failAll: Translator = async () => null;
    expect(await translateDoc({ title: "Андрій Сибіга", summary: "x" }, failAll)).toBeNull();
    const onlyTitle: Translator = async (text, target) => (text.length < 20 ? `[${target}] ${text}` : null);
    const r = await translateDoc({ title: "Сибіга", summary: "Дуже довге речення, яке не вдається перекласти." }, onlyTitle);
    expect(r).toMatchObject({ titleKo: "[ko] Сибіга", summaryKo: "", summaryEn: "" });
  });

  it("화면은 언어에 맞는 번역을 고르고, 번역이 없으면 원문을 쓴다", () => {
    const doc = { title: "Андрій Сибіга провів зустріч", summary: "원문 요약", titleKo: "안드리 시비하 장관이 회담", titleEn: "Andrii Sybiha held a meeting", summaryKo: "", summaryEn: "" };
    expect(localizedDoc(doc, false)).toEqual({ title: "안드리 시비하 장관이 회담", summary: "", original: "Андрій Сибіга провів зустріч", translated: true });
    expect(localizedDoc(doc, true).title).toBe("Andrii Sybiha held a meeting");
    expect(localizedDoc({ title: "Joint Statement", summary: "" }, true)).toMatchObject({ title: "Joint Statement", original: null, translated: false });
  });
});
