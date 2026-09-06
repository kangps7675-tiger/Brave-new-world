export type OsmTileRegion = {
  id: string;
  label: string;
  file: string;
  url: string;
  bytes?: number;
  center: [number, number];
  zoom: number;
  bounds?: [number, number, number, number];
};

export type OsmTileManifest = {
  generatedAt: string;
  schema: string;
  regions: OsmTileRegion[];
};

export async function fetchOsmTileManifest(): Promise<OsmTileManifest | null> {
  try {
    const res = await fetch("/tiles/osm/manifest.json", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as OsmTileManifest;
  } catch {
    return null;
  }
}

/** Build a dark OpenMapTiles-compatible style pointing at one PMTiles archive. */
export function buildOsmDarkStyle(pmtilesProtocolUrl: string): Record<string, unknown> {
  return {
    version: 8,
    name: "Brave New World OSM Dark",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: {
        type: "vector",
        url: pmtilesProtocolUrl,
        attribution: "© OpenStreetMap contributors · Planetiler · OpenMapTiles",
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#0b0c10" },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": "#1a3a5c" },
      },
      {
        id: "landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            "wood",
            "#14261c",
            "grass",
            "#1a2a1e",
            "ice",
            "#2a3540",
            "#1a1f28",
          ],
          "fill-opacity": 0.85,
        },
      },
      {
        id: "landuse",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        paint: { "fill-color": "#1e2430", "fill-opacity": 0.55 },
      },
      {
        id: "park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        paint: { "fill-color": "#163022", "fill-opacity": 0.5 },
      },
      {
        id: "boundary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        paint: {
          "line-color": "#3d5a73",
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.4, 8, 1.2],
        },
      },
      {
        id: "transportation",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 6,
        paint: {
          "line-color": "#5a7188",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 14, 2.2],
        },
      },
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": "#2c3544",
          "fill-opacity": 0.75,
          "fill-outline-color": "#1a2028",
        },
      },
      {
        id: "place-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        // 1선·2선 도시 + 국가/주. town/village/suburb/hamlet 제외.
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["city", "country", "state", "continent"]],
        ],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 10, 16],
          "text-font": ["Open Sans Regular"],
        },
        paint: {
          "text-color": "#d8e2ec",
          "text-halo-color": "#0b0c10",
          "text-halo-width": 1.2,
        },
      },
    ],
  };
}
