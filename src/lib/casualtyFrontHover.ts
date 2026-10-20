/**
 * 전선 폴리곤/경로 호버 ↔ HAPI admin1 사상자 마커 매칭.
 */

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`ʹʼ]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Donetska / Donetsk Oblast / Донецьк → 비교용 stem */
export function casualtyAdminStem(raw: string): string {
  return normalizeKey(raw)
    .replace(/\b(oblast|region|province|governorate|strip|district|raion)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ska$/i, "")
    .replace(/skyi$/i, "")
    .replace(/kyi$/i, "")
    .replace(/iya$/i, "ia")
    .replace(/\s+/g, "");
}

export function admin1NamesMatch(a: string, b: string): boolean {
  const sa = casualtyAdminStem(a);
  const sb = casualtyAdminStem(b);
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  if (sa.length >= 4 && sb.length >= 4 && (sa.startsWith(sb) || sb.startsWith(sa))) {
    return true;
  }
  // Donetsk ↔ Donetska stem donetsk / donet
  if (sa.length >= 5 && sb.length >= 5) {
    const short = sa.length <= sb.length ? sa : sb;
    const long = sa.length <= sb.length ? sb : sa;
    if (long.startsWith(short.slice(0, Math.min(5, short.length)))) return true;
  }
  return false;
}

export type CasualtyHoverMatchInput = {
  id: string;
  admin1Name?: string;
  lat: number;
  lng: number;
};

/** 우크라 VIINA adm1 / conflict-zone 중심 → 매칭된 사상자 front id 목록 */
export function matchCasualtyFrontIdsFromHover(
  fronts: readonly CasualtyHoverMatchInput[],
  hover: {
    kind: "ukraine-adm1" | "conflict-zone" | "near-point";
    adm1?: string | null;
    name?: string | null;
    lat?: number;
    lng?: number;
  } | null,
): string[] {
  if (!hover || fronts.length === 0) return [];

  if (hover.kind === "ukraine-adm1" && hover.adm1) {
    return fronts
      .filter((f) => f.admin1Name && admin1NamesMatch(hover.adm1!, f.admin1Name))
      .map((f) => f.id);
  }

  if (hover.kind === "conflict-zone" || hover.kind === "near-point") {
    const lat = hover.lat;
    const lng = hover.lng;
    const name = hover.name || "";
    const byName = fronts.filter(
      (f) =>
        (f.admin1Name && admin1NamesMatch(name, f.admin1Name)) ||
        (f.admin1Name &&
          normalizeKey(name).includes(normalizeKey(f.admin1Name).slice(0, 5))),
    );
    if (byName.length > 0) return byName.map((f) => f.id);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      let best: CasualtyHoverMatchInput | null = null;
      let bestDist = Infinity;
      for (const f of fronts) {
        const d = Math.hypot(f.lat - (lat as number), f.lng - (lng as number));
        if (d < bestDist) {
          bestDist = d;
          best = f;
        }
      }
      // ~3° 안 — admin1 스케일
      if (best && bestDist <= 3.2) return [best.id];
    }
  }

  return [];
}
