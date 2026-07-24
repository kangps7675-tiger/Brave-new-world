import { NextResponse } from "next/server";
import type { StaticPoint } from "@/data/geoTypes";
import { cachedFetchJson } from "@/lib/apiCache";
import { loadLocalStaticPoints } from "@/lib/localLayerData";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 4 * 60 * 60 * 1000;

const SPARQL = `
SELECT ?item ?itemLabel ?coord WHERE {
  VALUES ?class {
    wd:Q59623407
    wd:Q121500
    wd:Q653317
  }
  ?item wdt:P31/wdt:P279* ?class .
  ?item wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 250
`;

function parseWktPoint(value: unknown): { lat: number; lng: number } | null {
  if (typeof value !== "string") return null;
  const match = value.match(/Point\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function loadAiDataCenters(): Promise<StaticPoint[]> {
  const snapshot = await loadLocalStaticPoints("ai-data-centers.json");
  if (snapshot.length > 0) return snapshot;

  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(SPARQL)}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "BraveNewWorld/1.0 (educational globe; contact local-dev)",
    },
  });
  if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}`);
  const payload = (await response.json()) as {
    results?: { bindings?: Array<Record<string, { value?: string }>> };
  };

  const points: StaticPoint[] = [];
  const seen = new Set<string>();
  const bindings = payload.results?.bindings || [];
  bindings.forEach((row, index) => {
    const coord = parseWktPoint(row.coord?.value);
    if (!coord) return;
    const key = `${coord.lat.toFixed(2)},${coord.lng.toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const id = (row.item?.value || `ai-${index}`).split("/").pop() || `ai-${index}`;
    points.push({
      id: `ai-dc-${id}`,
      kind: "ai-data-center",
      name: row.itemLabel?.value || `Data center ${index}`,
      lat: coord.lat,
      lng: coord.lng,
      tier: 2,
      meta: { source: "wikidata" },
    });
  });
  return points;
}

export async function GET(request: Request) {
  const stub = apiStubResponse("ai-data-centers", request);
  if (stub) return stub;

  try {
    const { data, cached } = await cachedFetchJson("ai-data-centers", TTL_MS, loadAiDataCenters);
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached,
      count: data.length,
      points: data,
      attribution: "Wikidata (CC0) / local build",
    });
  } catch (error) {
    const fallback = await loadLocalStaticPoints("ai-data-centers.json");
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      cached: false,
      count: fallback.length,
      points: fallback,
      attribution: "local build",
      warning: error instanceof Error ? error.message : "ai-data-centers failed",
    });
  }
}
