import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import { findMaritimePath } from "@/lib/maritime/pathfind";
import { maritimeRouteToTransportPath } from "@/lib/maritime/routePaths";
import type { MaritimeGraph } from "@/lib/maritime/types";
import { NO_STORE_HEADERS, publicCacheHeaders, CDN_CACHE } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH_PATHS = [
  path.join(process.cwd(), "public", "data", "crink", "maritime-graph.json"),
  path.join(process.cwd(), "scripts", "data", "maritime-graph.json"),
];

function loadGraph(): MaritimeGraph | null {
  for (const p of GRAPH_PATHS) {
    if (!fs.existsSync(p)) continue;
    try {
      return JSON.parse(fs.readFileSync(p, "utf8")) as MaritimeGraph;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** GET /api/maritime/route?from=port1114&to=port339 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fromId = url.searchParams.get("from")?.trim();
  const toId = url.searchParams.get("to")?.trim();
  if (!fromId || !toId) {
    return NextResponse.json(
      { error: "from and to query params required (PortWatch portid or choke id)" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const graph = loadGraph();
  if (!graph?.nodes || !graph.adjacency) {
    return NextResponse.json(
      { error: "maritime graph not built — run npm run maritime:build" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const route = findMaritimePath(graph, fromId, toId);
    if (!route) {
      return NextResponse.json(
        { error: "no path found", fromId, toId },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    const transportPath = maritimeRouteToTransportPath(route, graph, { fromId, toId });
    return NextResponse.json(
      {
        fromId,
        toId,
        route,
        path: transportPath,
      },
      { headers: publicCacheHeaders(CDN_CACHE.portwatch) },
    );
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "maritime route failed") },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
