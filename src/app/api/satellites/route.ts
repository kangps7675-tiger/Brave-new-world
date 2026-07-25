import { NextResponse } from "next/server";
import {
  classifyReconSatellite,
} from "@/lib/reconSatellites";
import type { ReconTleSatellite } from "@/lib/reconSatelliteTypes";
import { CDN_CACHE, publicCacheHeaders } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SAT_CDN = publicCacheHeaders(CDN_CACHE.satellites);
const CELESTRAK_GROUPS = ["military", "active"] as const;
const MEMORY_TTL_MS = 8 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 28_000;
const MAX_SATS = 400;

export type { ReconTleSatellite };

type CacheEntry = {
  at: number;
  satellites: ReconTleSatellite[];
  sourceGroups: string[];
};

let memoryCache: CacheEntry | null = null;

function parseTleText(text: string): Array<{ name: string; line1: string; line2: string }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: Array<{ name: string; line1: string; line2: string }> = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!name || !line1?.startsWith("1 ") || !line2?.startsWith("2 ")) {
      // 깨진 줄이면 한 줄씩 맞춰 재동기화
      i -= 2;
      continue;
    }
    out.push({ name, line1, line2 });
  }
  return out;
}

function noradId(line1: string): string {
  return line1.slice(2, 7).trim();
}

async function fetchGroup(group: string): Promise<string> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/plain" },
      next: { revalidate: 28_800 },
    });
    if (!res.ok) {
      throw new Error(`CelesTrak ${group} HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function loadReconSatellites(): Promise<CacheEntry> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.at < MEMORY_TTL_MS) {
    return memoryCache;
  }

  const byNorad = new Map<string, ReconTleSatellite>();
  const sourceGroups: string[] = [];

  for (const group of CELESTRAK_GROUPS) {
    try {
      const text = await fetchGroup(group);
      sourceGroups.push(group);
      for (const raw of parseTleText(text)) {
        const cls = classifyReconSatellite(raw.name);
        if (!cls) continue;
        const id = noradId(raw.line1) || raw.name;
        if (byNorad.has(id)) continue;
        byNorad.set(id, {
          name: raw.name,
          line1: raw.line1,
          line2: raw.line2,
          country: cls.country,
          sensor: cls.sensor,
          familyKo: cls.familyKo,
          familyEn: cls.familyEn,
        });
        if (byNorad.size >= MAX_SATS) break;
      }
    } catch {
      // 한 그룹 실패해도 다른 그룹으로 진행
    }
    if (byNorad.size >= MAX_SATS) break;
  }

  const satellites = Array.from(byNorad.values());
  memoryCache = { at: now, satellites, sourceGroups };
  return memoryCache;
}

export async function GET() {
  try {
    const cached = await loadReconSatellites();
    return NextResponse.json(
      {
        receivedAt: new Date().toISOString(),
        fetchedAt: new Date(cached.at).toISOString(),
        count: cached.satellites.length,
        source: "CelesTrak",
        attribution: "Orbital elements: CelesTrak (T.S. Kelso)",
        sourceGroups: cached.sourceGroups,
        satellites: cached.satellites,
      },
      { headers: SAT_CDN },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "위성 TLE 로드 실패",
        satellites: [],
        count: 0,
      },
      { status: 502, headers: SAT_CDN },
    );
  }
}
