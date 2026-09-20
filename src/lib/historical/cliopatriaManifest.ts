/**
 * Cliopatria worldwide polity snapshots (Korea excluded).
 * Files: /data/historical/cliopatria/manifest.json + snapshots/year_<Y>.geojson
 * License: CC BY 4.0 — always credit Seshat / Cliopatria in UI.
 */

export type CliopatriaYearEntry = {
  year: number;
  file: string;
  featureCount: number;
  sizeMB: number;
};

export type CliopatriaManifest = {
  version: number;
  builtAt: string;
  license: string;
  korea: string;
  stats: {
    sourceFeatureRows: number;
    skippedKoreaRows: number;
    uniquePolityNames: number;
  };
  years: CliopatriaYearEntry[];
};

export const CLIOPATRIA_BASE = "/data/historical/cliopatria";

export function cliopatriaSnapshotUrl(year: number): string {
  return `${CLIOPATRIA_BASE}/snapshots/year_${year}.geojson`;
}

export async function fetchCliopatriaManifest(
  init?: RequestInit
): Promise<CliopatriaManifest> {
  const res = await fetch(`${CLIOPATRIA_BASE}/manifest.json`, init);
  if (!res.ok) throw new Error(`Cliopatria manifest ${res.status}`);
  return res.json() as Promise<CliopatriaManifest>;
}

export function wikidataUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  const q = id.startsWith("Q") ? id : `Q${id}`;
  return `https://www.wikidata.org/wiki/${q}`;
}
