import { NextResponse } from "next/server";
import { enforceIpRateLimit, RATE_PRESETS } from "@/lib/apiRateLimit";
import { logApiRoute } from "@/lib/apiRouteLog";
import {
  CROSS_STRAIT_SIGNAL_ATTRIBUTION,
  normalizeCrossStraitExercises,
  normalizeCrossStraitIncursions,
  normalizeEscalationIncidents,
  normalizeShipObservations,
  type CrossStraitSignalPayload,
} from "@/lib/crossStraitSignal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_API_BASE = "https://strait-signal.net";
const MAX_RESPONSE_BYTES = 1_500_000;

function apiBase(): string {
  const configured = process.env.CROSS_STRAIT_SIGNAL_API_BASE?.trim();
  if (!configured) return DEFAULT_API_BASE;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_API_BASE;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_API_BASE;
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    throw new Error(`upstream response too large (${declared} bytes)`);
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        throw new Error(`upstream response exceeded ${MAX_RESPONSE_BYTES} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(merged)) as unknown;
}

async function fetchPublicJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GeoWatch/1.0 cross-strait public-data integration",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await readBoundedJson(response);
  } finally {
    clearTimeout(timer);
  }
}

function objectValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

export async function GET(request: Request) {
  const limited = enforceIpRateLimit(request, RATE_PRESETS.crossStrait);
  if (limited) return limited;

  const requests = [
    ["exercises", "/api/military/exercises?with_geo=true&days=365"],
    ["incursions", "/api/military/incursions?days=30"],
    ["articles", "/api/articles/?escalation_only=true&page_size=50"],
  ] as const;
  const settled = await Promise.allSettled(requests.map(([, path]) => fetchPublicJson(path)));
  const values = new Map<string, unknown>();
  const errors: string[] = [];
  settled.forEach((result, index) => {
    const name = requests[index]![0];
    if (result.status === "fulfilled") {
      values.set(name, result.value);
    } else {
      errors.push(`${name}: ${result.reason instanceof Error ? result.reason.message : "fetch failed"}`);
    }
  });

  const exerciseRows = objectValue(values.get("exercises"), "rows");
  const incursionRows = objectValue(values.get("incursions"), "rows");
  const articleRows = objectValue(values.get("articles"), "articles");
  const payload: CrossStraitSignalPayload = {
    exercises: normalizeCrossStraitExercises(exerciseRows),
    incursions: normalizeCrossStraitIncursions(incursionRows),
    escalationIncidents: normalizeEscalationIncidents(articleRows),
    shipObservations: normalizeShipObservations(articleRows),
    fetchedAt: new Date().toISOString(),
    attribution: CROSS_STRAIT_SIGNAL_ATTRIBUTION,
    ...(errors.length ? { errors } : {}),
  };

  if (errors.length) {
    logApiRoute("/api/cross-strait-signal", "warn", "partial_upstream_failure", {
      errors,
    });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      "X-Data-Attribution": "Cross-Strait Signal (GPL-3.0 software; public API data)",
    },
  });
}
