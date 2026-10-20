/** 우크라이나 주(oblast) · 주요 도시 대략 좌표 — NEPTUN 경보명 · 텔레그램 지명 매칭용 */

export type UkraineZoneEntry = { name: string; lat: number; lng: number };

const UKRAINE_ZONES: UkraineZoneEntry[] = [
  { name: "Kyiv", lat: 50.45, lng: 30.52 },
  { name: "Київ", lat: 50.45, lng: 30.52 },
  { name: "Kyiv City", lat: 50.45, lng: 30.52 },
  { name: "Kyiv Oblast", lat: 50.05, lng: 30.5 },
  { name: "Kharkiv", lat: 49.99, lng: 36.23 },
  { name: "Харків", lat: 49.99, lng: 36.23 },
  { name: "Kharkiv Oblast", lat: 49.99, lng: 36.23 },
  { name: "Odesa", lat: 46.48, lng: 30.72 },
  { name: "Odessa", lat: 46.48, lng: 30.72 },
  { name: "Одеса", lat: 46.48, lng: 30.72 },
  { name: "Odesa Oblast", lat: 46.48, lng: 30.72 },
  { name: "Dnipro", lat: 48.46, lng: 35.05 },
  { name: "Dnipropetrovsk", lat: 48.46, lng: 35.05 },
  { name: "Дніпро", lat: 48.46, lng: 35.05 },
  { name: "Zaporizhzhia", lat: 47.84, lng: 35.14 },
  { name: "Zaporizhzhya", lat: 47.84, lng: 35.14 },
  { name: "Запоріжжя", lat: 47.84, lng: 35.14 },
  { name: "Donetsk", lat: 48.02, lng: 37.8 },
  { name: "Донецьк", lat: 48.02, lng: 37.8 },
  { name: "Luhansk", lat: 48.57, lng: 39.31 },
  { name: "Луганськ", lat: 48.57, lng: 39.31 },
  { name: "Sumy", lat: 50.91, lng: 34.8 },
  { name: "Суми", lat: 50.91, lng: 34.8 },
  { name: "Chernihiv", lat: 51.5, lng: 31.29 },
  { name: "Чернігів", lat: 51.5, lng: 31.29 },
  { name: "Kherson", lat: 46.64, lng: 32.62 },
  { name: "Херсон", lat: 46.64, lng: 32.62 },
  { name: "Mykolaiv", lat: 46.97, lng: 31.99 },
  { name: "Миколаїв", lat: 46.97, lng: 31.99 },
  { name: "Poltava", lat: 49.59, lng: 34.55 },
  { name: "Полтава", lat: 49.59, lng: 34.55 },
  { name: "Zhytomyr", lat: 50.25, lng: 28.66 },
  { name: "Житомир", lat: 50.25, lng: 28.66 },
  { name: "Vinnytsia", lat: 49.23, lng: 28.48 },
  { name: "Вінниця", lat: 49.23, lng: 28.48 },
  { name: "Lviv", lat: 49.84, lng: 24.03 },
  { name: "Львів", lat: 49.84, lng: 24.03 },
  { name: "Ivano-Frankivsk", lat: 48.92, lng: 24.71 },
  { name: "Ternopil", lat: 49.55, lng: 25.59 },
  { name: "Rivne", lat: 50.62, lng: 26.23 },
  { name: "Volyn", lat: 50.75, lng: 25.33 },
  { name: "Lutsk", lat: 50.75, lng: 25.33 },
  { name: "Khmelnytskyi", lat: 49.42, lng: 26.99 },
  { name: "Cherkasy", lat: 49.44, lng: 32.06 },
  { name: "Kirovohrad", lat: 48.51, lng: 32.26 },
  { name: "Kropyvnytskyi", lat: 48.51, lng: 32.26 },
  { name: "Chernivtsi", lat: 48.29, lng: 25.94 },
  { name: "Zakarpattia", lat: 48.62, lng: 22.3 },
  { name: "Uzhhorod", lat: 48.62, lng: 22.3 },
  { name: "Crimea", lat: 45.35, lng: 34.0 },
  { name: "Sevastopol", lat: 44.62, lng: 33.52 },
];

const UKRAINE_FALLBACK = { lat: 48.5, lng: 34.0 };

/** 텔레그램 등 지명 사전용 — 복사본 */
export function listUkraineAlertZones(): readonly UkraineZoneEntry[] {
  return UKRAINE_ZONES;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ");
}

/** NEPTUN 경보 name/oblast/key → 좌표 */
export function geocodeUkraineAlertRegion(
  ...parts: Array<string | null | undefined>
): { lat: number; lng: number } {
  const tokens = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .map(normalize);
  if (tokens.length === 0) return UKRAINE_FALLBACK;

  for (const token of tokens) {
    const exact = UKRAINE_ZONES.find((z) => normalize(z.name) === token);
    if (exact) return { lat: exact.lat, lng: exact.lng };
  }
  for (const token of tokens) {
    const partial = UKRAINE_ZONES.find(
      (z) => normalize(z.name).includes(token) || token.includes(normalize(z.name)),
    );
    if (partial) return { lat: partial.lat, lng: partial.lng };
  }
  return UKRAINE_FALLBACK;
}
