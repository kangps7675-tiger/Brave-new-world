import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";

let registered = false;

/** Register `pmtiles://` once for MapLibre (browser only). */
export function ensurePmtilesProtocol(): void {
  if (typeof window === "undefined" || registered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
}

/**
 * Absolute http(s) URL → pmtiles:// URL for MapLibre vector source.
 * Relative paths resolve against window.location.origin.
 */
export function toPmtilesUrl(fileUrl: string): string {
  if (fileUrl.startsWith("pmtiles://")) return fileUrl;
  if (typeof window === "undefined") {
    return `pmtiles://${fileUrl.replace(/^\/+/, "")}`;
  }
  const abs = fileUrl.startsWith("http")
    ? fileUrl
    : new URL(fileUrl, window.location.origin).href;
  return `pmtiles://${abs}`;
}
