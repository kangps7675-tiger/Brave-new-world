import type { Post2020Conflict } from "@/data/post2020Conflicts";
import type { LayerPrefs } from "@/lib/layerPrefs";

/** 개전 펄스 단독 모드 — boolean 레이어 전부 OFF (labelLanguage 유지) */
export function buildConflictOnsetSoloPrefs(base: LayerPrefs): LayerPrefs {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof LayerPrefs)[]) {
    if (typeof next[key] === "boolean" && key !== "labelLanguage") {
      (next as Record<string, boolean | string>)[key as string] = false;
    }
  }
  return next;
}

export function conflictOnsetPulseMarker(
  conflict: Post2020Conflict,
  lang: "ko" | "en",
): {
  markerId: string;
  displayKind: "conflict-onset-pulse";
  id: string;
  lat: number;
  lng: number;
  label: string;
} {
  return {
    markerId: `conflict-onset-${conflict.id}`,
    displayKind: "conflict-onset-pulse",
    id: conflict.id,
    lat: conflict.lat,
    lng: conflict.lng,
    label: lang === "en" ? conflict.nameEn : conflict.nameKo,
  };
}
