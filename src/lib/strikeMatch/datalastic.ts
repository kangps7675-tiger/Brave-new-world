/**
 * Datalastic(유료 AIS) 어댑터 — DATALASTIC_API_KEY 가 있을 때만 동작, 없으면 아무것도 안 한다.
 *
 * 역할: 우리 AIS 이력(무료 수신, 원양 공백 많음)에서 찾은 상위 후보 몇 척만
 *       Datalastic 항적으로 빈 구간을 메우고 IMO·선종을 채운다. 후보 "발견"은 여전히 우리 D1.
 *
 * ⚠️ 응답 형태는 공개 문서 기준 추정 — 키 받은 날 실제 응답 1건으로 반드시 확인할 것.
 *    (필드명이 다르면 pickNum/pickStr 의 후보 키만 고치면 된다)
 *    - GET /api/v0/vessel_history?api-key=&mmsi=&from=YYYY-MM-DD&to=YYYY-MM-DD
 *      → { data: { name, mmsi, imo, type, positions: [{ lat, lon, speed, course, last_position_UTC }] } }
 *    크레딧: 조회 1회 평균 ~5 (기간 길수록 증가) — 그래서 후보 5척 × 사건 1건으로 제한.
 */

import type { TrackPoint, VesselTrack } from "@/lib/strikeMatch/scoreCandidates";

const BASE = "https://api.datalastic.com/api/v0";

function key(): string | null {
  const k = typeof process !== "undefined" ? process.env.DATALASTIC_API_KEY : undefined;
  return k && k.trim() ? k.trim() : null;
}

export function datalasticEnabled(): boolean {
  return key() !== null;
}

function pickNum(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function toIso(o: Record<string, unknown>): string | null {
  const epoch = pickNum(o, "last_position_epoch", "epoch", "timestamp");
  if (epoch !== null) return new Date(epoch < 1e12 ? epoch * 1000 : epoch).toISOString();
  const s = pickStr(o, "last_position_UTC", "utc", "time", "datetime");
  if (!s) return null;
  const t = Date.parse(s.includes("T") || s.endsWith("Z") ? s : `${s.replace(" ", "T")}Z`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** 응답 JSON → 항적 (테스트용 export) */
export function parseVesselHistory(json: unknown): {
  imo: string | null;
  name: string | null;
  points: TrackPoint[];
} {
  const data = ((json as { data?: unknown })?.data ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(data.positions) ? (data.positions as Record<string, unknown>[]) : [];
  const points: TrackPoint[] = [];
  for (const p of raw) {
    const lat = pickNum(p, "lat", "latitude");
    const lng = pickNum(p, "lon", "lng", "longitude");
    const at = toIso(p);
    if (lat === null || lng === null || !at) continue;
    points.push({ lat, lng, sog: pickNum(p, "speed", "sog"), cog: pickNum(p, "course", "cog"), sampledAt: at });
  }
  const imo = pickStr(data, "imo");
  return { imo: imo && imo !== "0" ? imo : null, name: pickStr(data, "name"), points };
}

export async function enrichWithDatalastic(
  tracks: VesselTrack[],
  range: { fromIso: string; toIso: string },
): Promise<{ used: boolean; tracks: VesselTrack[]; errors: string[] }> {
  const k = key();
  if (!k || tracks.length === 0) return { used: false, tracks, errors: [] };
  const errors: string[] = [];
  const out: VesselTrack[] = [];
  await Promise.all(
    tracks.map(async (t) => {
      const url = new URL(`${BASE}/vessel_history`);
      url.searchParams.set("api-key", k);
      url.searchParams.set("mmsi", t.mmsi);
      url.searchParams.set("from", range.fromIso.slice(0, 10));
      url.searchParams.set("to", range.toIso.slice(0, 10));
      try {
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) {
          errors.push(`${t.mmsi} HTTP ${res.status}`);
          out.push(t);
          return;
        }
        const h = parseVesselHistory(await res.json());
        const fromMs = Date.parse(range.fromIso);
        const toMs = Date.parse(range.toIso);
        const extra = h.points.filter((p) => {
          const m = Date.parse(p.sampledAt);
          return m >= fromMs && m <= toMs;
        });
        // 같은 10분대(ISO 앞 15자) 표본이 이미 있으면 우리 기록 우선
        const have = new Set(t.points.map((p) => p.sampledAt.slice(0, 15)));
        out.push({
          ...t,
          imo: t.imo ?? h.imo,
          name: t.name ?? h.name,
          points: [...t.points, ...extra.filter((p) => !have.has(p.sampledAt.slice(0, 15)))],
        });
      } catch (e) {
        errors.push(`${t.mmsi} ${e instanceof Error ? e.message : "fetch failed"}`);
        out.push(t);
      }
    }),
  );
  return { used: true, tracks: out, errors: errors.slice(0, 3) };
}
