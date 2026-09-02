import type { LabelLanguage } from "@/lib/layerPrefs";

/** 네온·GDELT 하이브리드 사건 — 출처 추적성 */
export type IncidentProvenance = "seed-source" | "live-only" | "seed-fallback";

export function provenanceFromActivation(params: {
  id: string;
  seedSourceUrl?: string | null;
  gdeltSourceUrl?: string | null;
  hadSeedMatch: boolean;
}): IncidentProvenance {
  if (params.id.startsWith("seed-")) return "seed-fallback";
  if (params.hadSeedMatch && params.seedSourceUrl) return "seed-source";
  if (params.id.startsWith("live-")) return "live-only";
  return "seed-fallback";
}

export function provenanceBadgeLabel(
  provenance: IncidentProvenance,
  lang: LabelLanguage,
): string {
  const en = lang === "en";
  switch (provenance) {
    case "seed-source":
      return en ? "Seed source linked" : "시드 출처 링크";
    case "live-only":
      return en ? "Live match only" : "라이브 매칭만";
    case "seed-fallback":
      return en ? "Anchor only (no live)" : "앵커만 (라이브 없음)";
  }
}

export function provenanceMetaLine(
  provenance: IncidentProvenance,
  lang: LabelLanguage,
  opts?: { seedSourceUrl?: string | null; gdeltSourceUrl?: string | null },
): string | undefined {
  const en = lang === "en";
  if (provenance === "seed-source" && opts?.seedSourceUrl) {
    return en ? "Primary source on seed anchor" : "시드 앵커에 1차 출처 링크";
  }
  if (provenance === "live-only") {
    if (opts?.gdeltSourceUrl) {
      return en ? "GDELT headline match · no curated anchor" : "GDELT 속보 매칭 · 큐레이션 앵커 없음";
    }
    return en ? "Headline match only · no primary source" : "제목 매칭만 · 1차 출처 없음";
  }
  if (provenance === "seed-fallback") {
    return en ? "Static hotspot · no fresh GDELT in 24h" : "정적 핫스팟 · 24h GDELT 없음";
  }
  return undefined;
}

export function provenanceHintLine(
  provenance: IncidentProvenance,
  lang: LabelLanguage,
  url?: string | null,
): string | undefined {
  if (!url) return undefined;
  const en = lang === "en";
  if (provenance === "seed-source") {
    return en ? `Source · ${url}` : `출처 · ${url}`;
  }
  if (provenance === "live-only" && url) {
    return en ? `GDELT · ${url}` : `GDELT · ${url}`;
  }
  return undefined;
}
