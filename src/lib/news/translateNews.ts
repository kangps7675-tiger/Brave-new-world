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
  if (lang === "en") {
    // EN: 원문 title/summary만 — KO 필드로 덮지 않음
    return item;
  }
  const titleKo = item.titleKo?.trim()
    ? item.titleKo
    : await translateText(item.title, "ko");
  const bodyKo = item.bodyKo?.trim()
    ? item.bodyKo
    : item.summary
      ? await translateText(item.summary, "ko")
      : undefined;
  return {
    ...item,
    titleKo,
    bodyKo,
    // 하위 호환: 기존 카드가 item.title만 읽는 경로용 (원문은 title에 유지)
  };
}

async function translateHero(
  hero: HeroBreakingItem,
  lang: LabelLanguage,
): Promise<HeroBreakingItem> {
  const base = await translateNewsItem(hero, lang);
  return { ...hero, ...base };
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
    ...(payload.hero ? [payload.hero.titleKo || payload.hero.title] : []),
    ...(payload.flashHeroes ?? []).map((i) => i.titleKo || i.title),
    ...payload.verified.map((i) => i.titleKo || i.title),
    ...payload.stateMedia.map((i) => i.titleKo || i.title),
  ].filter(Boolean);
}

/**
 * ko 캐시가 영문 원문으로 남아 있으면 재번역.
 * titleKo가 없거나 비한글이면 전체 페이로드를 다시 돌린다.
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
 * en 캐시: 원문 title이 한글이면 영문 번역해 title에 두고 titleKo는 보존.
 */
export async function ensureEnglishNewsPayload(
  payload: NewsStreamPayload,
): Promise<NewsStreamPayload> {
  if (!isTranslationEnabled()) return payload;
  const originals = [
    ...(payload.hero ? [payload.hero.title] : []),
    ...(payload.flashHeroes ?? []).map((i) => i.title),
    ...payload.verified.map((i) => i.title),
    ...payload.stateMedia.map((i) => i.title),
  ].filter(Boolean);
  if (originals.length === 0) return payload;
  if (originals.every((t) => isMostlyEnglish(t))) return payload;

  const translateEnItem = async (item: NewsStreamItem): Promise<NewsStreamItem> => {
    if (isMostlyEnglish(item.title)) return item;
    const title = await translateText(item.title, "en");
    const summary = item.summary
      ? isMostlyEnglish(item.summary)
        ? item.summary
        : await translateText(item.summary, "en")
      : undefined;
    return {
      ...item,
      titleKo: item.titleKo || (isMostlyKorean(item.title) ? item.title : item.titleKo),
      bodyKo:
        item.bodyKo ||
        (item.summary && isMostlyKorean(item.summary) ? item.summary : item.bodyKo),
      title,
      summary,
    };
  };

  return {
    ...payload,
    hero: payload.hero ? ((await translateEnItem(payload.hero)) as HeroBreakingItem) : null,
    flashHeroes: payload.flashHeroes?.length
      ? await mapPool(payload.flashHeroes, (item) => translateEnItem(item) as Promise<HeroBreakingItem>, 4)
      : payload.flashHeroes,
    verified: await mapPool(payload.verified, translateEnItem, 6),
    stateMedia: await mapPool(payload.stateMedia, translateEnItem, 4),
  };
}

/** UI 언어에 맞춰 캐시 페이로드 언어를 강제 */
export async function ensureLocalizedNewsPayload(
  payload: NewsStreamPayload,
  lang: LabelLanguage,
): Promise<NewsStreamPayload> {
  return lang === "en" ? ensureEnglishNewsPayload(payload) : ensureKoreanNewsPayload(payload);
}
