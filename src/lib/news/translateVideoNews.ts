/**
 * 동영상 뉴스 제목·요약 번역 (ko). 재생 URL·썸네일은 원문 유지.
 */
import { isKoreanTranslationEnabled, mapPool, translateTextToKorean } from "@/lib/koreanTranslate";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { VideoNewsItem, VideoNewsPayload } from "@/lib/news/videoTypes";

async function translateVideoItem(item: VideoNewsItem): Promise<VideoNewsItem> {
  const title = await translateTextToKorean(item.title);
  const summary = item.summary ? await translateTextToKorean(item.summary) : undefined;
  return { ...item, title, summary };
}

export async function translateVideoNewsPayload(
  payload: VideoNewsPayload,
  lang: LabelLanguage = "ko",
): Promise<VideoNewsPayload> {
  if (lang === "en" || !isKoreanTranslationEnabled()) return payload;
  if (!payload.items.length) return payload;
  const items = await mapPool(payload.items, translateVideoItem, 6);
  return { ...payload, items };
}

/** ko 캐시에 영문 제목이 남아 있으면 재번역 */
export async function ensureKoreanVideoPayload(
  payload: VideoNewsPayload,
): Promise<VideoNewsPayload> {
  if (!isKoreanTranslationEnabled()) return payload;
  const { isMostlyKorean } = await import("@/lib/koreanTranslate");
  const titles = payload.items.map((i) => i.title).filter(Boolean);
  if (titles.length === 0) return payload;
  if (titles.every((t) => isMostlyKorean(t))) return payload;
  return translateVideoNewsPayload(payload, "ko");
}
