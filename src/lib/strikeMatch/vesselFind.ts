/**
 * Datalastic vessel_find(이름 검색) 응답 파서 — 순수 로직.
 *
 * ⚠️ 응답 모양은 아직 실제 호출로 확인하지 못했다(문서에 필드 설명 없음). vessel_info / vessel_inradius 가 쓰는 필드
 *    (name, mmsi, imo, type, type_specific, country_iso)가 같다고 보고 배열 위치만 여러 군데를 허용한다.
 *    실제 응답을 확인하면 이 파일의 테스트 픽스처를 실제 값으로 바꿀 것.
 */

import { validImo } from "../../../workers/cron-ingest/src/vesselIdentity";
import { distanceKm, normalizeShipName, positionAt, type TrackPoint } from "./scoreCandidates";

export type FoundVessel = {
  mmsi: string;
  imo: string | null;
  name: string | null;
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
  const vessels: FoundVessel[] = [];
  for (const r of pickList(json)) {
    const mmsi = str(r.mmsi);
    if (!mmsi || !/^\d{9}$/.test(mmsi)) continue;
    vessels.push({ mmsi, imo: validImo(r.imo), name: str(r.name), type: str(r.type) });
  }
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
  const same = found.filter((v) => normalizeShipName(v.name) === want);
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
