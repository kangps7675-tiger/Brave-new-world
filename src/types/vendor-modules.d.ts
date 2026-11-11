declare module "@openhistoricalmap/maplibre-gl-dates" {
  import type { Map as MapLibreMap } from "maplibre-gl";
  export function filterByDate(map: MapLibreMap, date: string | Date): void;
}
