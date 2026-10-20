/**
 * L2 고리 — 심층 중 한 줄 주장 ↔ 레이어 씬(최대 3).
 */

import type { LayerPatch } from "@/lib/eventBriefingSession";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type DeepDiveTrustTag =
  | "established"
  | "reported"
  | "claimed"
  | "estimated";

export type DeepDiveRing = {
  id: string;
  titleKo: string;
  titleEn: string;
  blurbKo: string;
  blurbEn: string;
  tag: DeepDiveTrustTag;
  layers: LayerPatch;
  camera?: { lat: number; lng: number; altitude: number };
};

export function ringTitle(ring: DeepDiveRing, lang: LabelLanguage): string {
  return lang === "en" ? ring.titleEn : ring.titleKo;
}

export function ringBlurb(ring: DeepDiveRing, lang: LabelLanguage): string {
  return lang === "en" ? ring.blurbEn : ring.blurbKo;
}

export function trustTagLabel(tag: DeepDiveTrustTag, lang: LabelLanguage): string {
  if (lang === "en") {
    switch (tag) {
      case "established":
        return "Established";
      case "reported":
        return "Reported";
      case "claimed":
        return "Claimed";
      case "estimated":
        return "Estimated";
    }
  }
  switch (tag) {
    case "established":
      return "확립";
    case "reported":
      return "보도";
    case "claimed":
      return "당사자 주장";
    case "estimated":
      return "추정";
  }
}
