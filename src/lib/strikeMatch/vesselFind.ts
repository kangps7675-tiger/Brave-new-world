/**
 * Datalastic vessel_find(이름 검색) 응답 파서 — 순수 로직.
 *
 * 응답 모양은 2026-10-22 실제 호출(name=EVER GIVEN&fuzzy=0)로 확인했다:
 *   { data: [{ uuid, name, name_ais, mmsi, imo, callsign, country_iso, type, type_specific, gross_tonnage, ... }], meta: { success } }
 *   - 같은 배가 MMSI 가 같은 두 줄로 온다(첫 줄은 type·country 등이 null, 둘째 줄이 상세). → MMSI 로 합치고 값이 있는 쪽을 쓴다.
 *   - name 과 별개로 name_ais(AIS 로 수신한 이름)가 있다. 둘 다 이름 비교에 쓴다.
 *   - 크레딧은 아직 확인 전.
 */

import { validImo } from "../../../workers/cron-ingest/src/vesselIdentity";
import { distanceKm, normalizeShipName, positionAt, type TrackPoint } from "./scoreCandidates";

export type FoundVessel = {
  mmsi: string;
  imo: string | null;
  name: string | null;
  /** AIS 로 수신한 이름 (name 과 다를 수 있다) */
  nameAis: string | null;
  type: string | null;
};

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function pickList(json: unknown): Record<string, unknown>[] {
  const data = (json as { data?: unknown } | null)?.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of ["vessels", "results", "items", "data"]) {
      if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
    }
  }
  return [];
}

export function parseVesselFind(json: unknown): { ok: boolean; vessels: FoundVessel[] } {
  const root = json as { meta?: { success?: unknown } } | null;
  if (!root || root.meta?.success === false) return { ok: false, vessels: [] };
  // 같은 MMSI 가 여러 줄로 오므로 합친다 — 값이 있는 쪽을 쓴다
  const byMmsi = new Map<string, FoundVessel>();
  for (const r of pickList(json)) {
    const mmsi = str(r.mmsi);
    if (!mmsi || !/^\d{9}$/.test(mmsi)) continue;
    const next: FoundVessel = {
      mmsi,
      imo: validImo(r.imo),
      name: str(r.name),
      nameAis: str(r.name_ais),
      type: str(r.type_specific) ?? str(r.type),
    };
    const cur = byMmsi.get(mmsi);
    byMmsi.set(
      mmsi,
      cur
        ? {
            mmsi,
            imo: cur.imo ?? next.imo,
            name: cur.name ?? next.name,
            nameAis: cur.nameAis ?? next.nameAis,
            type: cur.type ?? next.type,
          }
        : next,
    );
  }
  const vessels = [...byMmsi.values()];
  return { ok: true, vessels };
}

/**
 * 검색 결과 중 검증할 선박 — 이름이 정규화 기준으로 같은 것만.
 * 기사에 IMO 가 있으면 IMO 가 같은 것만 (이름이 같은 다른 배를 거른다). 최대 max 척.
 */
export function pickByName(
  found: FoundVessel[],
  claim: { name: string; imo: string | null },
  max = 3,
): FoundVessel[] {
  const want = normalizeShipName(claim.name);
  const same = found.filter((v) => normalizeShipName(v.name) === want || normalizeShipName(v.nameAis) === want);
  const byImo = claim.imo ? same.filter((v) => v.imo === claim.imo) : same;
  const seen = new Set<string>();
  const out: FoundVessel[] = [];
  for (const v of byImo) {
    if (seen.has(v.mmsi)) continue;
    seen.add(v.mmsi);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** 기사 속 이름이 맞다고 볼 거리 — 그 이름의 배가 사건 시각에 사건 지점 이 거리 안에 있었어야 한다 */
export const NAMED_VERIFY_MAX_KM = 100;
/** 위치 표본이 사건 시각과 이보다 멀면(보간이 아닐 때) 검증 자료가 없는 것으로 본다 */
export const NAMED_VERIFY_MAX_OFFSET_MIN = 180;

export type NamedVerdict = {
  status: "verified" | "rejected" | "unresolved";
  distKm: number | null;
  offsetMin: number | null;
};

/**
 * 이름으로 찾은 배의 항적이 사건 시각에 사건 지점 근처였나.
 *  - verified: 근처(NAMED_VERIFY_MAX_KM 이내)
 *  - rejected: 자료가 충분한데 멀리 있었음 → 기사의 이름이 이 사건의 배가 아님
 *  - unresolved: 사건 시각 근처 표본이 없음 → "아니다"가 아니라 "자료가 없다" (나중에 다시)
 */
export function verifyNamedPosition(
  points: TrackPoint[],
  incident: { lat: number; lng: number; atMs: number },
): NamedVerdict {
  const pos = positionAt(points, incident.atMs);
  if (!pos) return { status: "unresolved", distKm: null, offsetMin: null };
  if (pos.basis === "nearest" && pos.offsetMin > NAMED_VERIFY_MAX_OFFSET_MIN) {
    return { status: "unresolved", distKm: null, offsetMin: pos.offsetMin };
  }
  const d = Math.round(distanceKm(incident, pos) * 10) / 10;
  return { status: d <= NAMED_VERIFY_MAX_KM ? "verified" : "rejected", distKm: d, offsetMin: pos.offsetMin };
}
