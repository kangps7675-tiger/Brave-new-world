const ORG_KO: Record<string, string> = { nato: "나토", eu: "EU", un: "유엔", iaea: "IAEA" };
const ORG_EN: Record<string, string> = { nato: "NATO", eu: "European Union", un: "United Nations", iaea: "IAEA" };

const cache = new Map<string, string>();

function regionName(code: string, locale: "ko" | "en"): string {
  const key = `${locale}:${code}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let name = code.toUpperCase();
  try {
    name = new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? name;
  } catch {
    /* 알 수 없는 코드는 코드 그대로 */
  }
  cache.set(key, name);
  return name;
}

/** ISO 3166-1 alpha-2(소문자) 또는 기구 id("nato", "eu"…)의 한국어 이름. */
export function issuerNameKo(id: string): string {
  return ORG_KO[id] ?? regionName(id, "ko");
}

export function issuerNameEn(id: string): string {
  return ORG_EN[id] ?? regionName(id, "en");
}
