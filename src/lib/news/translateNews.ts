/**
 * RSS·GDELT 뉴스 번역 (ko: 한국어, en: 원문 유지).
 * Telegram OSINT 텍스트는 이 경로에 절대 넣지 않음 — @see src/lib/licensing/telegramOsintPolicy.ts
 */
import { isKoreanTranslationEnabled, mapPool, translateTextToKorean } from "@/lib/koreanTranslate";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { HeroBreakingItem, NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

async function translateNewsItem(item: NewsStreamItem): Promise<NewsStreamItem> {
  const title = await translateTextToKorean(item.title);
  const summary = item.summary ? await translateTextToKorean(item.summary) : undefined;
  return { ...item, title, summary };
}

async function translateHero(hero: HeroBreakingItem): Promise<HeroBreakingItem> {
  const title = await translateTextToKorean(hero.title);
  const summary = hero.summary ? await translateTextToKorean(hero.summary) : undefined;
  return { ...hero, title, summary };
}

export async function translateNewsStreamPayload(
  payload: NewsStreamPayload,
  lang: LabelLanguage = "ko",
): Promise<NewsStreamPayload> {
  if (lang === "en" || !isKoreanTranslationEnabled()) return payload;

  const verified = await mapPool(payload.verified, translateNewsItem, 6);
  const stateMedia = await mapPool(payload.stateMedia, translateNewsItem, 4);
  const hero = payload.hero ? await translateHero(payload.hero) : null;
  const flashHeroes = payload.flashHeroes?.length
    ? await mapPool(payload.flashHeroes, translateHero, 4)
    : payload.flashHeroes;

  return {
    ...payload,
    hero,
    flashHeroes,
    verified,
    stateMedia,
  };
}

/**
 * ko 캐시가 영문 원문으로 남아 있으면 재번역.
 * 제목 하나라도 비한글이면 전체 페이로드를 다시 돌린다
 * (앞쪽 샘플만 한글 RSS인 경우 나머지가 영문으로 남는 구멍 방지).
 */
export async function ensureKoreanNewsPayload(
  payload: NewsStreamPayload,
): Promise<NewsStreamPayload> {
  if (!isKoreanTranslationEnabled()) return payload;
  const { isMostlyKorean } = await import("@/lib/koreanTranslate");
  const titles = [
    ...(payload.hero ? [payload.hero.title] : []),
    ...(payload.flashHeroes ?? []).map((i) => i.title),
    ...payload.verified.map((i) => i.title),
    ...payload.stateMedia.map((i) => i.title),
  ].filter(Boolean);
  if (titles.length === 0) return payload;
  if (titles.every((t) => isMostlyKorean(t))) return payload;
  return translateNewsStreamPayload(payload, "ko");
}
