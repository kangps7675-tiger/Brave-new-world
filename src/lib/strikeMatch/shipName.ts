/**
 * 경보·기사 본문에서 선명 뽑기 — 확실한 표기만.
 * "MV Tutor", "M/V TUTOR", "the tanker 'Sounion'", "Liberian-flagged MV Eternity C" 같은 형태.
 * 애매하면 null (엉뚱한 이름으로 '확인' 판정이 나면 오보).
 */

const STOP = new Set([
  "THE", "A", "AN", "VESSEL", "SHIP", "TANKER", "MASTER", "CREW", "UKMTO", "REPORT", "REPORTS",
  "MERCHANT", "CARGO", "BULK", "CARRIER", "CONTAINER", "AUTHORITIES", "WAS", "HAS", "IS", "IN",
  "AT", "ON", "OF", "NM", "NAUTICAL", "MILES", "WEST", "EAST", "NORTH", "SOUTH", "OFF",
]);

const PREFIXED =
  /\b(?:M\/V|M\/T|MV|MT|SS)\.?\s+["'“‘]?([A-Z][A-Za-z0-9-]*(?:\s+[A-Z0-9][A-Za-z0-9-]*){0,3})/;
const QUOTED =
  /\b(?:vessel|ship|tanker|carrier|freighter|bulker|containership)\s+(?:named\s+)?["“‘']([A-Z][A-Za-z0-9 -]{2,30})["”’']/i;

function clean(raw: string): string | null {
  const words = raw.trim().split(/\s+/);
  // 뒤에 붙은 일반 단어 잘라내기 ("MV Tutor was hit" → "Tutor")
  while (words.length && STOP.has(words[words.length - 1]!.toUpperCase())) words.pop();
  const lowerTail = words.findIndex((w, i) => i > 0 && /^[a-z]/.test(w));
  const kept = lowerTail > 0 ? words.slice(0, lowerTail) : words;
  const name = kept.join(" ").replace(/[.,;:]+$/, "");
  if (name.length < 3 || STOP.has(name.toUpperCase())) return null;
  return name;
}

export function extractShipName(text: string | null | undefined): string | null {
  if (!text) return null;
  const p = PREFIXED.exec(text);
  if (p) {
    const n = clean(p[1]!);
    if (n) return n;
  }
  const q = QUOTED.exec(text);
  if (q) return clean(q[1]!);
  return null;
}
