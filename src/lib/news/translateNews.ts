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
  return { ...hero, title };
}

export async function translateNewsStreamPayload(
  payload: NewsStreamPayload,
  lang: LabelLanguage = "ko",
): Promise<NewsStreamPayload> {
  if (lang === "en" || !isKoreanTranslationEnabled()) return payload;

  const verified = await mapPool(payload.verified, translateNewsItem, 6);
  const stateMedia = await mapPool(payload.stateMedia, translateNewsItem, 4);
  const hero = payload.hero ? await translateHero(payload.hero) : null;

  return {
    ...payload,
    hero,
    verified,
    stateMedia,
  };
}

/**
 * ko 캐시가 영문 원문으로 남아 있으면 재번역.
 * 샘플 제목 과반이 이미 한글이면 스킵.
 */
export async function ensureKoreanNewsPayload(
  payload: NewsStreamPayload,
): Promise<NewsStreamPayload> {
  if (!isKoreanTranslationEnabled()) return payload;
  const { isMostlyKorean } = await import("@/lib/koreanTranslate");
  const sample = [
    ...(payload.hero ? [payload.hero.title] : []),
    ...payload.verified.slice(0, 6).map((i) => i.title),
    ...payload.stateMedia.slice(0, 3).map((i) => i.title),
  ].filter(Boolean);
  if (sample.length === 0) return payload;
  const englishHeavy = sample.filter((t) => !isMostlyKorean(t)).length;
  if (englishHeavy === 0) return payload;
  return translateNewsStreamPayload(payload, "ko");
}
