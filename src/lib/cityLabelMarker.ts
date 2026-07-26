import type { PlaceLabelTier } from "@/lib/placeLabelColors";
import { getPlaceLabelColor } from "@/lib/placeLabelColors";
import { activeBasemapTone } from "@/lib/basemapTone";

export const CITY_LABEL_ROOT_CLASS = "city-label-marker";

export function createCityLabelElement(text: string, tier: PlaceLabelTier): HTMLElement {
  const tone = activeBasemapTone();
  const el = document.createElement("div");
  el.className = CITY_LABEL_ROOT_CLASS;
  el.dataset.tier = tier;
  el.textContent = text;
  el.style.color = getPlaceLabelColor(tier, true, tone);
  el.style.fontSize = tier === "megacity" ? "13px" : "12px";
  return el;
}
