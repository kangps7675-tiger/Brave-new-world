import zones from "@/data/israel-oref-zones.json";

type ZoneEntry = { name: string; lat: number; lng: number };

/**
 * Pikud HaOref 경보 구역 좌표 사전.
 * 출처: eladnava/pikud-haoref-api cities.json (커뮤니티 미러) + 기존 수동 항목.
 * 매칭 실패 시 가짜 좌표를 만들지 않는다.
 */
const ZONE_LIST = zones as ZoneEntry[];

/** Pikud HaOref 지역명 → 좌표 매칭 방식 */
export type OrefGeocodeMatch = "exact" | "partial" | "token" | "none";

export type OrefGeocodeResult = {
  lat: number | null;
  lng: number | null;
  match: OrefGeocodeMatch;
  /** 사전에 맞은 구역명 (없으면 null) */
  matchedName: string | null;
};

const NO_LOCATION: OrefGeocodeResult = {
  lat: null,
  lng: null,
  match: "none",
  matchedName: null,
};

function withZone(zone: ZoneEntry, match: Exclude<OrefGeocodeMatch, "none">): OrefGeocodeResult {
  return {
    lat: zone.lat,
    lng: zone.lng,
    match,
    matchedName: zone.name,
  };
}

/**
 * Pikud HaOref 히브리 지역명 → 좌표.
 * 사전에서 못 찾으면 가짜 좌표를 만들지 않고 위치 없음(null)을 반환한다.
 * 조사 근거로는 exact만 쓰고, partial/token은 실시간 지도 표시용으로만 쓴다.
 */
export function geocodeOrefRegion(region: string): OrefGeocodeResult {
  const normalized = region.trim();
  if (!normalized) return NO_LOCATION;

  const exact = ZONE_LIST.find((z) => z.name === normalized);
  if (exact) return withZone(exact, "exact");

  const partial = ZONE_LIST.find(
    (z) => normalized.includes(z.name) || z.name.includes(normalized),
  );
  if (partial) return withZone(partial, "partial");

  const token = normalized.split(/[-–]/)[0]?.trim();
  if (token) {
    const byToken = ZONE_LIST.find((z) => z.name.startsWith(token) || token.startsWith(z.name));
    if (byToken) return withZone(byToken, "token");
  }

  return NO_LOCATION;
}

/** 조사 도구 근거로 쓸 수 있는 매칭인지 (정확 일치만) */
export function isEvidenceGradeOrefMatch(match: OrefGeocodeMatch): boolean {
  return match === "exact";
}

/** 지도에 점을 찍을 수 있는 좌표인지 */
export function hasOrefMapCoords(
  result: Pick<OrefGeocodeResult, "lat" | "lng">,
): result is { lat: number; lng: number } {
  return Number.isFinite(result.lat) && Number.isFinite(result.lng);
}
