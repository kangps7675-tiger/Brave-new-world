import { isMostlyEnglish, isMostlyKorean } from "@/lib/koreanTranslate";

/**
 * 공식 문서 제목·요약을 한국어·영어로 통일한다. 문서를 저장한 뒤 워커가 채우고(번역 호출은 문서당 한 번),
 * 화면은 저장된 번역을 고른다. 번역은 기계 번역이라 원문 제목을 같이 두고 "자동 번역"으로 표시한다.
 */

export type DocTranslation = { titleKo: string; titleEn: string; summaryKo: string; summaryEn: string };
export type Translator = (text: string, target: "ko" | "en") => Promise<string | null>;

const EN_WORDS = /\b(the|of|and|to|in|for|on|with|at|by|a|an|is|are|as|from|new|joint|statement|minister|president|ministry)\b/i;

/** 라틴 문자 글이라도 영어가 아닐 수 있다(프랑스어·독일어·폴란드어 원문). 흔한 영어 단어가 하나라도 있어야 영어로 본다. */
export function looksEnglish(text: string): boolean {
  return isMostlyEnglish(text) && EN_WORDS.test(text);
}

async function side(text: string, target: "ko" | "en", tr: Translator): Promise<string | null> {
  if (!text.trim()) return "";
  if (target === "ko" ? isMostlyKorean(text) : looksEnglish(text)) return text;
  const out = await tr(text, target);
  if (out) return out;
  // 영어 번역이 안 돼도 글이 라틴 문자 위주이면 원문을 그대로 영어 칸에 둔다(번역 실패로 계속 재시도하지 않게)
  return target === "en" && isMostlyEnglish(text) ? text : null;
}

/** 번역 한 건. 제목 번역이 하나라도 실패하면 null(다음 실행에서 다시 시도). 요약이 실패하면 그 칸만 비운다. */
export async function translateDoc(row: { title: string; summary: string }, tr: Translator): Promise<DocTranslation | null> {
  const titleKo = await side(row.title, "ko", tr);
  const titleEn = await side(row.title, "en", tr);
  if (titleKo == null || titleEn == null) return null;
  const summaryKo = (await side(row.summary, "ko", tr)) ?? "";
  const summaryEn = (await side(row.summary, "en", tr)) ?? "";
  return { titleKo, titleEn, summaryKo, summaryEn };
}

export type LocalizableDoc = {
  title: string;
  summary: string;
  titleKo?: string | null;
  titleEn?: string | null;
  summaryKo?: string | null;
  summaryEn?: string | null;
};

/** 화면 언어에 맞는 제목·요약. 제목은 번역이 없으면 원문을 쓰고, 번역을 썼으면 원문 제목을 돌려준다(작게 같이 보여 주려고). */
export function localizedDoc(doc: LocalizableDoc, en: boolean): { title: string; summary: string; original: string | null; translated: boolean } {
  const t = (en ? doc.titleEn : doc.titleKo)?.trim();
  const s = (en ? doc.summaryEn : doc.summaryKo)?.trim();
  const title = t || doc.title;
  // 요약은 해당 언어 판이 있을 때만 쓴다(번역이 없을 때 우크라이나어 원문 요약이 한국어 화면에 섞여 나오지 않게)
  const summary = s || "";
  const translated = title.trim() !== doc.title.trim();
  return { title, summary, original: translated ? doc.title : null, translated };
}
