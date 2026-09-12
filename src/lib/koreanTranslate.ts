import type { LabelLanguage } from "@/lib/layerPrefs";

const translationCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 1200;

export function isKoreanTranslationEnabled(): boolean {
  // 한글 UI 뉴스·등불·RSS 번역은 항상 켠다 (env로 끄지 않음).
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
  const latin = (compact.match(/[a-zA-Z]/g) || []).length;
  const hangulRatio = hangul / compact.length;
  const latinRatio = latin / compact.length;
  // 영문이 절반 가까이이면 한글로 보지 않음 (혼용 제목도 번역 대상)
  if (latinRatio >= 0.45) return false;
  return hangulRatio >= 0.28;
}

/** 이미 영문(Latin)이 주를 이루면 재번역하지 않음 */
export function isMostlyEnglish(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return true;
  const latin = (compact.match(/[a-zA-Z]/g) || []).length;
  return latin / compact.length >= 0.45;
}

/**
 * 봇 신원 — **브라우저로 위장하지 말 것.**
 *
 * 이전 값은 `Mozilla/5.0 (compatible; BraveNewWorld/1.0)` 이었다. 브라우저 UA 위장은
 * 단순 약관 위반과 달리 "우회 의도"로 읽혀 분쟁 시 불리하게 평가된다.
 * 자동화 트래픽임을 정직하게 밝히고, 차단당하면 정식 API로 옮기는 게 맞는 순서다.
 *
 * @see docs/copyright-audit-2026-08-01.md — R-2
 */
const TRANSLATE_USER_AGENT = "ConflictViewBot/1.0 (+https://github.com/kangps7675-tiger/Brave-new-world)";

/**
 * ⚠️ `translate_a/single?client=gtx` 는 **공개 API가 아니라 웹 UI 내부 엔드포인트**다.
 *    Google 서비스 약관은 자동화 수단을 통한 접근을 금지한다.
 *    유료화·트래픽 확대 전에 Cloud Translation API 또는 DeepL API로 전환할 것.
 *
 *    또한 이 경로로 **뉴스 제목·본문 스니펫이 제3자에게 전송**된다.
 *    rssParser 의 스니펫 상한(220자)이 이 노출량의 상한이기도 하다.
 *
 * @see docs/commercial-licensing.md — "Google Translate 비공식"
 */
/** 브라우저에서는 CORS·약관 이슈로 서버 프록시만 사용 */
async function fetchTranslationViaApi(
  text: string,
  targetLang: LabelLanguage,
): Promise<string> {
  const res = await fetch("/api/translate-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: [text], lang: targetLang }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return text;
  const data = (await res.json()) as { translations?: unknown };
  const first = Array.isArray(data.translations) ? data.translations[0] : null;
  return typeof first === "string" && first.trim() ? first.trim() : text;
}

async function fetchTranslationDirect(
  text: string,
  targetLang: LabelLanguage,
): Promise<string> {
  const tl = targetLang === "ko" ? "ko" : "en";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": TRANSLATE_USER_AGENT },
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

async function fetchTranslation(text: string, targetLang: LabelLanguage): Promise<string> {
  if (typeof window !== "undefined") {
    return fetchTranslationViaApi(text, targetLang);
  }
  return fetchTranslationDirect(text, targetLang);
}

/** 클라이언트 배치 번역 — useLocalizedTextMap 등 */
export async function translateTextsBatch(
  texts: string[],
  targetLang: LabelLanguage,
): Promise<string[]> {
  if (texts.length === 0) return [];
  if (!isTranslationEnabled()) return texts;
  if (typeof window === "undefined") {
    return mapPool(texts, (t) => translateText(t, targetLang), 6);
  }
  try {
    const res = await fetch("/api/translate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, lang: targetLang }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return texts;
    const data = (await res.json()) as { translations?: unknown };
    if (!Array.isArray(data.translations) || data.translations.length !== texts.length) {
      return texts;
    }
    return data.translations.map((t, i) =>
      typeof t === "string" && t.trim() ? t.trim() : texts[i]!,
    );
  } catch {
    return texts;
  }
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
