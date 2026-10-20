/**
 * OpenHistoricalMap — live vector tiles for 역사 toggle (detail under polity fills).
 * Do NOT download planet PBF (Glacier). Use hosted vtiles + date filter.
 *
 * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse
 * @see https://github.com/OpenHistoricalMap/maplibre-gl-dates
 */

import type { Map as MapLibreMap } from "maplibre-gl";

/** Official OHM historic stylesheet (MapLibre style spec v8). */
export const OHM_STYLE_URL =
  "https://www.openhistoricalmap.org/map-styles/main/main.json";

/** General OHM vector tileset template. */
export const OHM_VECTOR_TILES =
  "https://vtiles.openhistoricalmap.org/maps/ohm/{z}/{x}/{y}.pbf";

export const OHM_ATTRIBUTION =
  '<a href="https://www.openhistoricalmap.org/">OpenHistoricalMap</a> contributors';

export const OHM_SOURCE_ID = "ohm";

/**
 * Convert Cliopatria / scrubber year (BCE negative) to OHM filter date string.
 * OHM uses proleptic Gregorian; year 0 does not exist → map 0 → "1" (1 CE).
 */
export function yearToOhmFilterDate(year: number): string {
  if (!Number.isFinite(year)) return new Date().toISOString().slice(0, 10);
  if (year === 0) return "0001";
  if (year > 0) return String(Math.trunc(year)).padStart(4, "0");
  // BCE: OHM / plugin accept negative years in ISO-like form
  const abs = Math.trunc(Math.abs(year));
  return `-${String(abs).padStart(4, "0")}`;
}

/**
 * Apply OHM date filter on a MapLibre map that already has OHM layers loaded.
 * Side-effect: registers Map.prototype.filterByDate when using the plugin's
 * browser path; we call the exported function directly for SSR safety.
 */
export async function applyOhmDateFilter(
  map: MapLibreMap,
  year: number
): Promise<void> {
  const date = yearToOhmFilterDate(year);
  // CJS package — dynamic import for Next bundler
  const mod = (await import("@openhistoricalmap/maplibre-gl-dates")) as {
    filterByDate?: (map: MapLibreMap, date: string | Date) => void;
    default?: { filterByDate: (map: MapLibreMap, date: string | Date) => void };
  };
  const filterByDate = mod.filterByDate ?? mod.default?.filterByDate;
  if (!filterByDate) {
    throw new Error("@openhistoricalmap/maplibre-gl-dates: filterByDate missing");
  }
  filterByDate(map, date);
}

export type OhmLayerConfig = {
  id: "ohm";
  role: "historic_osm_detail";
  mount: "history_toggle_only";
  styleUrl: string;
  tiles: string;
  attribution: string;
  dateFilterPackage: "@openhistoricalmap/maplibre-gl-dates";
  notes: string[];
};

export const OHM_LAYER_CONFIG: OhmLayerConfig = {
  id: "ohm",
  role: "historic_osm_detail",
  mount: "history_toggle_only",
  styleUrl: OHM_STYLE_URL,
  tiles: OHM_VECTOR_TILES,
  attribution: OHM_ATTRIBUTION,
  dateFilterPackage: "@openhistoricalmap/maplibre-gl-dates",
  notes: [
    "Planet dumps on s3://planet.openhistoricalmap.org are often Glacier — do not bake into repo.",
    "Always filterByDate when scrubbing year, else all eras overlay at once.",
    "Paint only on 역사 toggle; under Cliopatria/basemaps fills as detail.",
  ],
};
