import type { ConflictEvent } from "@/data/geoTypes";
import { cachedFetchJson } from "@/lib/apiCache";

export type GdeltTheme = "cyber" | "election";

const THEME_QUERIES: Record<GdeltTheme, string> = {
  cyber: "theme:CYBER OR theme:RANSOMWARE OR cyberattack OR ransomware",
  election: "theme:ELECTION OR vote OR referendum OR ballot",
};

const GEO_API = "https://api.gdeltproject.org/api/v2/geo/geo";

type GeoHit = {
  name?: string;
  count?: number;
  lat?: number;
  lng?: number;
  latlong?: string;
};

function parseLatLng(hit: GeoHit): { lat: number; lng: number } | null {
  if (Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lng))) {
    return { lat: Number(hit.lat), lng: Number(hit.lng) };
  }
  if (typeof hit.latlong === "string") {
    const [lat, lng] = hit.latlong.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

export async function fetchGdeltThemeEvents(theme: GdeltTheme): Promise<ConflictEvent[]> {
  const query = THEME_QUERIES[theme];
  const url = `${GEO_API}?query=${encodeURIComponent(query)}&format=geojson&maxpoints=200`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`GDELT Geo HTTP ${response.status}`);

  const payload = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: number[] };
      properties?: GeoHit & { name?: string; count?: number; url?: string };
    }>;
  };

  const events: ConflictEvent[] = [];
  for (const [index, feature] of (payload.features || []).entries()) {
    const coords = feature.geometry?.coordinates;
    let lat = Number(coords?.[1]);
    let lng = Number(coords?.[0]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const parsed = parseLatLng(feature.properties || {});
      if (!parsed) continue;
      lat = parsed.lat;
      lng = parsed.lng;
    }

    const name = feature.properties?.name || `${theme} hotspot ${index}`;
    const count = Number(feature.properties?.count) || 1;
    events.push({
      id: `gdelt-${theme}-${index}-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      globalEventId: `gdelt-${theme}-${index}`,
      eventDate: new Date().toISOString().slice(0, 10),
      country: null,
      lat,
      lng,
      category: theme === "cyber" ? "Strategic developments" : "Protests",
      severity: Math.min(5, Math.max(1, Math.ceil(count / 20))),
      goldsteinScale: theme === "cyber" ? -5 : -1,
      sourceUrl: feature.properties?.url || null,
      title: name,
      createdAt: new Date().toISOString(),
      eventTier: theme === "cyber" ? "diplomatic" : "protest",
      tensionScore: Math.min(100, 30 + count),
      greatPowerScope: null,
    });
  }

  return events;
}

export async function fetchGdeltThemeCached(theme: GdeltTheme) {
  const ttl = theme === "cyber" ? 2 * 60 * 1000 : 2 * 60 * 60 * 1000;
  return cachedFetchJson(`gdelt-theme-${theme}`, ttl, () => fetchGdeltThemeEvents(theme));
}
