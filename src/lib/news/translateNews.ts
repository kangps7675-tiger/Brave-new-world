/**
 * RSS·GDELT 뉴스 번역 — UI 언어에 맞춤 (ko↔en).
 * Telegram OSINT 텍스트는 이 경로에 절대 넣지 않음 — @see src/lib/licensing/telegramOsintPolicy.ts
 */
import {
  isMostlyEnglish,
  isMostlyKorean,
  isTranslationEnabled,
  mapPool,
  translateText,
} from "@/lib/koreanTranslate";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { HeroBreakingItem, NewsStreamItem, NewsStreamPayload } from "@/lib/news/types";

async function translateNewsItem(
  item: NewsStreamItem,
  lang: LabelLanguage,
): Promise<NewsStreamItem> {
  const title = await translateText(item.title, lang);
  const summary = item.summary ? await translateText(item.summary, lang) : undefined;
  return { ...item, title, summary };
}

async function translateHero(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
): Promise<HeroBreakingItem> {
  const title = await translateText(hero.title, lang);
  const summary = hero.summary ? await translateText(hero.summary, lang) : undefined;
  return { ...hero, title, summary };
}

export async function translateNewsStreamPayload(
  payload: NewsStreamPayload,
  lang: LabelLanguage = "ko",
): Promise<NewsStreamPayload> {
  if (!isTranslationEnabled()) return payload;

  const verified = await mapPool(payload.verified, (item) => translateNewsItem(item, lang), 6);
  const stateMedia = await mapPool(payload.stateMedia, (item) => translateNewsItem(item, lang), 4);
  const hero = payload.hero ? await translateHero(payload.hero, lang) : null;
  const flashHeroes = payload.flashHeroes?.length
    ? await mapPool(payload.flashHeroes, (item) => translateHero(item, lang), 4)
    : payload.flashHeroes;

  return {
    ...payload,
    hero,
    flashHeroes,
    verified,
    stateMedia,
  };
}

function collectTitles(payload: NewsStreamPayload): string[] {
  return [
    ...(payload.hero ? [payload.hero.title] : []),
    ...(payload.flashHeroes ?? []).map((i) => i.title),
    ...payload.verified.map((i) => i.title),
    ...payload.stateMedia.map((i) => i.title),
  ].filter(Boolean);
}

/**
 * ko 캐시가 영문 원문으로 남아 있으면 재번역.
 * 제목 하나라도 비한글이면 전체 페이로드를 다시 돌린다
 * (앞쪽 샘플만 한글 RSS인 경우 나머지가 영문으로 남는 구멍 방지).
 */
export async function ensureKoreanNewsPayload(
  payload: NewsStreamPayload,
): Promise<NewsStreamPayload> {
  if (!isTranslationEnabled()) return payload;
  const titles = collectTitles(payload);
  if (titles.length === 0) return payload;
  if (titles.every((t) => isMostlyKorean(t))) return payload;
  return translateNewsStreamPayload(payload, "ko");
}

/**
 * en 캐시에 한글·비영문 제목이 남아 있으면 영문으로 재번역.
 */
export async function ensureEnglishNewsPayload(
  payload: NewsStreamPayload,
): Promise<NewsStreamPayload> {
  if (!isTranslationEnabled()) return payload;
  const titles = collectTitles(payload);
  if (titles.length === 0) return payload;
  if (titles.every((t) => isMostlyEnglish(t))) return payload;
  return translateNewsStreamPayload(payload, "en");
}

/** UI 언어에 맞춰 캐시 페이로드 언어를 강제 */
export async function ensureLocalizedNewsPayload(
  payload: NewsStreamPayload,
  lang: LabelLanguage,
): Promise<NewsStreamPayload> {
  return lang === "en" ? ensureEnglishNewsPayload(payload) : ensureKoreanNewsPayload(payload);
}
