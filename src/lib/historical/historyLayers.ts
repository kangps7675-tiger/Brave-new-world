/**
 * History-toggle layers: Cliopatria (fills) + Korea overlay + basemaps + OHM.
 * Mount only when top chrome === 역사.
 */

export type HistoryLayerEntry = {
  id: string;
  role: string;
  license: string;
  base: string;
  manifest: string;
  /** OHM live style (optional) */
  styleUrl?: string;
  /** OHM vector tile template (optional) */
  tiles?: string;
  /** OHM date-filter package id (optional) */
  dateFilter?: string;
};

export type HistoryLayersConfig = {
  version: number;
  mount: string;
  layers: HistoryLayerEntry[];
  renderHint: {
    default: string;
    useBasemapBorderPrecision?: boolean;
    whenPreferCliopatria?: number[];
    ohm?: string;
    korea?: string;
  };
  cliopatriaYears: number[];
  basemapYears: number[];
  koreaYears?: number[];
};

export const HISTORY_LAYERS_URL = "/data/historical/history-layers.json";

export async function fetchHistoryLayersConfig(
  init?: RequestInit
): Promise<HistoryLayersConfig> {
  const res = await fetch(HISTORY_LAYERS_URL, init);
  if (!res.ok) throw new Error(`history-layers ${res.status}`);
  return res.json() as Promise<HistoryLayersConfig>;
}

export function basemapGeoJsonUrl(filename: string): string {
  return `/data/historical/basemaps/${filename.replace(/^\//, "")}`;
}

export function getOhmLayer(
  config: HistoryLayersConfig
): HistoryLayerEntry | undefined {
  return config.layers.find((l) => l.id === "ohm");
}

export function getKoreaLayer(
  config: HistoryLayersConfig
): HistoryLayerEntry | undefined {
  return config.layers.find((l) => l.id === "korea");
}
