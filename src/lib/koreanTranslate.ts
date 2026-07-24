import type { LabelLanguage } from "@/lib/layerPrefs";

const translationCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 1200;

export function isKoreanTranslationEnabled(): boolean {
  const news = process.env.NEWS_TRANSLATE_KO?.trim().toLowerCase();
  const telegram = process.env.TELEGRAM_TRANSLATE_KO?.trim().toLowerCase();
  const flag = news ?? telegram ?? "true";
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

export function isTranslationEnabled(): boolean {
  return isKoreanTranslationEnabled();
}

/** 이미 한글이 주를 이루면 재번역하지 않음 */
export function isMostlyKorean(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return true;
  const hangul = (compact.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return hangul / compact.length >= 0.28;
}

/** 이미 영문(Latin)이 주를 이루면 재번역하지 않음 */
export function isMostlyEnglish(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return true;
  const latin = (compact.match(/[a-zA-Z]/g) || []).length;
  return latin / compact.length >= 0.45;
}

async function fetchTranslation(text: string, targetLang: LabelLanguage): Promise<string> {
  const tl = targetLang === "ko" ? "ko" : "en";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BraveNewWorld/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) return text;

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return text;

  const translated = (data[0] as Array<[string] | string>)
    .map((part) => (Array.isArray(part) ? part[0] : String(part)))
    .join("");
  return translated.trim() || text;
}

function cacheKey(text: string, targetLang: LabelLanguage): string {
  return `${targetLang}:${text}`;
}

async function translateToTarget(text: string, targetLang: LabelLanguage): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || !isTranslationEnabled()) return text;
  if (targetLang === "ko" && isMostlyKorean(trimmed)) return text;
  if (targetLang === "en" && isMostlyEnglish(trimmed)) return text;

  const key = cacheKey(trimmed, targetLang);
  const cached = translationCache.get(key);
  if (cached) return cached;

  try {
    const translated = await fetchTranslation(trimmed, targetLang);
    translationCache.set(key, translated);
    if (translationCache.size > MAX_CACHE_ENTRIES) {
      const oldest = translationCache.keys().next().value;
      if (oldest) translationCache.delete(oldest);
    }
    return translated;
  } catch {
    return text;
  }
}

export async function translateTextToKorean(text: string): Promise<string> {
  return translateToTarget(text, "ko");
}

export async function translateTextToEnglish(text: string): Promise<string> {
  return translateToTarget(text, "en");
}

export async function translateText(text: string, targetLang: LabelLanguage): Promise<string> {
  return translateToTarget(text, targetLang);
}

export async function mapPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}
