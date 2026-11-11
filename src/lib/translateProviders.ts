import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * 서버 번역 공급자. 공식 API 키가 있으면 그것을 먼저 쓰고, 없거나 실패하면 다음 순서로 넘어간다.
 *   1) DeepL        — DEEPL_API_KEY       (키가 `:fx`로 끝나면 무료 요금제 주소)
 *   2) Google Cloud — GOOGLE_TRANSLATE_API_KEY (Cloud Translation v2, 공식 API)
 *   3) 비공식 gtx   — 키가 둘 다 없을 때만. 약관상 불안하고 막히면 원문이 그대로 나온다.
 *
 * 각 함수는 실패하면 null을 돌려준다(원문을 돌려주지 않는다). 그래야 다음 공급자로 넘어갈 수 있다.
 */

export type TranslateProvider = "deepl" | "google-cloud" | "gtx";

export type TranslateResult = { text: string; provider: TranslateProvider };

type Env = Record<string, string | undefined>;

export function configuredProviders(env: Env = process.env): TranslateProvider[] {
  const out: TranslateProvider[] = [];
  if (env.DEEPL_API_KEY?.trim()) out.push("deepl");
  if (env.GOOGLE_TRANSLATE_API_KEY?.trim()) out.push("google-cloud");
  out.push("gtx");
  return out;
}

async function viaDeepl(
  text: string,
  target: LabelLanguage,
  key: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetchImpl(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [text], target_lang: target === "ko" ? "KO" : "EN-US" }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { translations?: Array<{ text?: unknown }> };
  const out = data.translations?.[0]?.text;
  return typeof out === "string" && out.trim() ? out.trim() : null;
}

async function viaGoogleCloud(
  text: string,
  target: LabelLanguage,
  key: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const res = await fetchImpl(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: target === "ko" ? "ko" : "en", format: "text" }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { translations?: Array<{ translatedText?: unknown }> };
  };
  const out = data.data?.translations?.[0]?.translatedText;
  return typeof out === "string" && out.trim() ? out.trim() : null;
}

async function viaGtx(
  text: string,
  target: LabelLanguage,
  userAgent: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const tl = target === "ko" ? "ko" : "en";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": userAgent },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const out = (data[0] as Array<[string] | string>)
    .map((part) => (Array.isArray(part) ? part[0] : String(part)))
    .join("")
    .trim();
  return out || null;
}

/** 번역이 쓸 만한가. 원문과 같거나, 한국어 목표인데 한글이 전혀 없으면 실패로 본다. */
export function isUsableTranslation(
  source: string,
  out: string,
  target: LabelLanguage,
): boolean {
  const o = out.trim();
  if (!o) return false;
  if (target === "ko") {
    if (o === source.trim()) return false;
    if (!/[가-힯]/.test(o)) return false;
  } else if (o === source.trim()) {
    return false;
  }
  return true;
}

export async function translateWithProviders(
  text: string,
  target: LabelLanguage,
  opts: { env?: Env; fetchImpl?: typeof fetch; userAgent: string },
): Promise<TranslateResult | null> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  for (const provider of configuredProviders(env)) {
    try {
      let out: string | null = null;
      if (provider === "deepl") {
        out = await viaDeepl(text, target, env.DEEPL_API_KEY!.trim(), fetchImpl);
      } else if (provider === "google-cloud") {
        out = await viaGoogleCloud(text, target, env.GOOGLE_TRANSLATE_API_KEY!.trim(), fetchImpl);
      } else {
        out = await viaGtx(text, target, opts.userAgent, fetchImpl);
      }
      if (out && isUsableTranslation(text, out, target)) return { text: out, provider };
    } catch {
      /* 다음 공급자로 */
    }
  }
  return null;
}
