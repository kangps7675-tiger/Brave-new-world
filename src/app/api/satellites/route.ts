import { publicErrorMessage } from "@/lib/auth/clientIdentity";
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

/**
 * CelesTrak 질의 목록.
 *
 * GROUP=active는 2.7MB·60초라 타임아웃으로 항상 실패했고, GROUP=military는
 * 24기(정찰 분류 1기)뿐이었다. 그래서 작고 빠른 그룹 + 계열 이름 질의로 나눈다.
 * 각 질의는 수 초 내에 끝나고, 결과는 8시간 캐시된다.
 */
const CELESTRAK_QUERIES: Array<{ label: string; params: string }> = [
  { label: "group:military", params: "GROUP=military" },
  { label: "group:resource", params: "GROUP=resource" },
  { label: "name:USA", params: "NAME=USA" },
  { label: "name:COSMOS", params: "NAME=COSMOS" },
  { label: "name:YAOGAN", params: "NAME=YAOGAN" },
  { label: "name:GAOFEN", params: "NAME=GAOFEN" },
  { label: "name:JILIN", params: "NAME=JILIN" },
  { label: "name:CARTOSAT", params: "NAME=CARTOSAT" },
  { label: "name:KOMPSAT", params: "NAME=KOMPSAT" },
  { label: "name:SAR-LUPE", params: "NAME=SAR-LUPE" },
];

/** 한 번에 보내는 질의 수 — CelesTrak에 몰아치지 않도록 */
const QUERY_BATCH = 3;
const MEMORY_TTL_MS = 8 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_SATS = 320;
/** TLE epoch가 이보다 오래되면 제외 — 낙하·폐기 위성의 엉뚱한 좌표 방지 */
const MAX_TLE_AGE_DAYS = 45;

/** 파편·로켓 상단 등은 정찰위성이 아니다 (COSMOS 질의에 대량 섞여 온다) */
const NON_SATELLITE_NAME = /\b(deb|debris|r\/b|rocket body|akm|platform|shroud|coolant)\b/i;

export type { ReconTleSatellite };

type CacheEntry = {
  at: number;
  satellites: ReconTleSatellite[];
  sourceGroups: string[];
  failures: string[];
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

/** TLE line1의 epoch(YYDDD.dddddddd) → 경과 일수. 못 읽으면 null */
function tleAgeDays(line1: string, now: number): number | null {
  const raw = line1.slice(18, 32).trim();
  const yy = Number(raw.slice(0, 2));
  const doy = Number(raw.slice(2));
  if (!Number.isFinite(yy) || !Number.isFinite(doy) || doy <= 0) return null;
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const epochMs = Date.UTC(year, 0, 1) + (doy - 1) * 86_400_000;
  return (now - epochMs) / 86_400_000;
}

async function fetchQuery(params: string): Promise<string> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?${params}&FORMAT=tle`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/plain" },
      next: { revalidate: 28_800 },
    });
    if (!res.ok) {
      throw new Error(`CelesTrak HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 국가별 라운드로빈으로 상한을 맞춘다.
 * COSMOS 질의만 1000기가 넘어 그대로 자르면 러시아만 남는다.
 */
function capByCountry(sats: ReconTleSatellite[], max: number): ReconTleSatellite[] {
  if (sats.length <= max) return sats;
  const byCountry = new Map<string, ReconTleSatellite[]>();
  for (const sat of sats) {
    const bucket = byCountry.get(sat.country);
    if (bucket) bucket.push(sat);
    else byCountry.set(sat.country, [sat]);
  }
  const buckets = Array.from(byCountry.values());
  const out: ReconTleSatellite[] = [];
  for (let round = 0; out.length < max; round += 1) {
    let placed = false;
    for (const bucket of buckets) {
      if (round >= bucket.length) continue;
      out.push(bucket[round]);
      placed = true;
      if (out.length >= max) break;
    }
    if (!placed) break;
  }
  return out;
}

async function loadReconSatellites(): Promise<CacheEntry> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.at < MEMORY_TTL_MS) {
    return memoryCache;
  }

  const byNorad = new Map<string, ReconTleSatellite>();
  const sourceGroups: string[] = [];
  const failures: string[] = [];

  for (let i = 0; i < CELESTRAK_QUERIES.length; i += QUERY_BATCH) {
    const batch = CELESTRAK_QUERIES.slice(i, i + QUERY_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (q) => ({ label: q.label, text: await fetchQuery(q.params) })),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        failures.push(String(result.reason));
        continue;
      }
      const { label, text } = result.value;
      sourceGroups.push(label);
      for (const raw of parseTleText(text)) {
        if (NON_SATELLITE_NAME.test(raw.name)) continue;
        const age = tleAgeDays(raw.line1, now);
        if (age == null || age > MAX_TLE_AGE_DAYS || age < -1) continue;
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
      }
    }
  }

  const satellites = capByCountry(Array.from(byNorad.values()), MAX_SATS);
  // 전부 실패했다면 캐시하지 않는다 — 빈 결과를 8시간 물고 있으면 안 됨
  if (satellites.length === 0 && sourceGroups.length === 0) {
    throw new Error(failures[0] ?? "CelesTrak 응답 없음");
  }
  memoryCache = { at: now, satellites, sourceGroups, failures };
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
        error: publicErrorMessage(error, "위성 TLE 로드 실패"),
        satellites: [],
        count: 0,
      },
      { status: 502, headers: SAT_CDN },
    );
  }
}
