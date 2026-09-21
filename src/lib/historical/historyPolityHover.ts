/**
 * MapLibre history fill layers → PolygonLayerFeature (history-polity).
 */

import type { PolygonLayerFeature } from "@/components/globe/types";

export const HISTORY_POLITY_FILL_LAYER_IDS = [
  "history-cliopatria-fill",
  "history-korea-fill",
] as const;

export type HistoryPolityFillLayerId =
  (typeof HISTORY_POLITY_FILL_LAYER_IDS)[number];

export function isHistoryPolityFillLayerId(
  id: string,
): id is HistoryPolityFillLayerId {
  return (HISTORY_POLITY_FILL_LAYER_IDS as readonly string[]).includes(id);
}

function yearProp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickName(properties: Record<string, unknown>): string {
  for (const key of ["label", "nameKo", "nameEn", "name"] as const) {
    const v = properties[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function historyPolityFromMapProps(
  layerId: string,
  properties: Record<string, unknown> | null | undefined,
): PolygonLayerFeature | null {
  if (!properties || !isHistoryPolityFillLayerId(layerId)) return null;
  const name = pickName(properties);
  if (!name) return null;

  const wiki =
    typeof properties.wikipedia === "string" && properties.wikipedia.trim()
      ? properties.wikipedia.trim()
      : undefined;
  const nameLong =
    typeof properties.nameLong === "string" && properties.nameLong.trim()
      ? properties.nameLong.trim()
      : wiki;

  return {
    polygonLayer: "history-polity",
    name,
    nameLong,
    source: layerId === "history-korea-fill" ? "korea" : "cliopatria",
    fromYear: yearProp(properties.fromYear),
    toYear: yearProp(properties.toYear),
  };
}
