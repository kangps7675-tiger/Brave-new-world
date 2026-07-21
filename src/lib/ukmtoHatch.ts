import type { TransportPath } from "@/data/geoTypes";

/**
 * UKMTO 사건 → 「검은 동그라미 빗금 박스」.
 *
 * 기존 dispute-zone(외곽선)/conflict-hatch(빗금) kind를 그대로 재사용한다.
 * GlobeDashboard의 pathColor 콜백이 `path.accentColor`를 최우선으로 쓰기 때문에
 * (air-raid-focus 포커스 박스와 동일 패턴) 신규 Layer/Source 없이 바로 렌더된다.
 *
 * 원(circle) 모양은 다각형 근사가 아니라 실제 단위원-직선 교차 계산으로 클리핑한다
 * (정규화 좌표 u,v ∈ [-1,1], u²+v²=1인 단위원 안에서 X자 빗금 직선을 교차시킨 뒤
 *  lat/lng로 환산 — 사각 박스 클리핑이었던 disputeHatch.ts의 hatchLines()와 다른 방식).
 */

export type UkmtoHatchIncident = {
  id: string;
  lat: number;
  lng: number;
  incidentTypeName: string;
  pinColour?: string | null;
  place?: string | null;
};

/** /api/ukmto 응답 항목 — 지도 렌더링 + 상세 텍스트 표시에 필요한 필드 전부 */
export type UkmtoIncidentPoint = {
  id: string;
  incidentNumber: number | null;
  incidentTypeName: string;
  pinColour: string | null;
  lat: number;
  lng: number;
  region: string | null;
  place: string | null;
  vesselName: string | null;
  vesselType: string | null;
  detail: string | null;
  utcDateOfIncident: string | null;
};

/** 사건 유형별 기준 강도(0~1) — 1이 가장 진한 검정, 0에 가까울수록 흰색 */
const TYPE_SEVERITY: Record<string, number> = {
  Hijack: 1,
  Boarding: 0.95,
  Attack: 0.85,
  "Suspicious Activity": 0.45,
  Advisory: 0.2,
};

export function ukmtoIncidentSeverity(
  incident: Pick<UkmtoHatchIncident, "incidentTypeName" | "pinColour">,
): number {
  const base = TYPE_SEVERITY[incident.incidentTypeName] ?? 0.5;
  const pinBoost = incident.pinColour === "Red" ? 0.12 : 0;
  return Math.max(0.08, Math.min(1, base + pinBoost));
}

/** 강도 1(검정) → 0(흰색) 그레이스케일 */
function grayColor(severity: number, alpha: number): string {
  const g = Math.round(255 * (1 - severity));
  return `rgba(${g}, ${g}, ${g}, ${alpha})`;
}

/** 반경(도) — air-raid-focus와 비슷한 시·군 스케일 */
const RADIUS_DEG = 0.4;
const CIRCLE_SEGMENTS = 28;

function lngRadiusFor(lat: number): number {
  // 위도 보정 — 고위도일수록 경도 1도 폭이 좁아지므로 화면상 원에 가깝게 늘려줌
  return RADIUS_DEG / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
}

function circleOutlinePoints(lat: number, lng: number): { lat: number; lng: number }[] {
  const lngRadius = lngRadiusFor(lat);
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const theta = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    points.push({
      lat: lat + RADIUS_DEG * Math.sin(theta),
      lng: lng + lngRadius * Math.cos(theta),
    });
  }
  return points;
}

/**
 * 원 내부로 클리핑된 X(크로스) 빗금.
 * 정규화 단위원 좌표(u,v)에서 "/" 는 u-v=c, "\" 는 u+v=c 직선.
 * 둘 다 u²+v²=1 대입 시 2u²-2cu+(c²-1)=0 → u=(c±√(2-c²))/2 로 동일한 형태.
 * |c|>√2 면 원과 안 만나므로 스킵.
 */
function circleHatchSegments(lat: number, lng: number): { lat: number; lng: number }[][] {
  const lngRadius = lngRadiusFor(lat);
  const lines: { lat: number; lng: number }[][] = [];
  const step = 0.36;

  for (let c = -1.42; c <= 1.42; c += step) {
    const disc = 2 - c * c;
    if (disc <= 0.0001) continue;
    const sq = Math.sqrt(disc);

    // "/" 방향: u - v = c
    {
      const u1 = (c + sq) / 2;
      const v1 = u1 - c;
      const u2 = (c - sq) / 2;
      const v2 = u2 - c;
      lines.push([
        { lat: lat + v1 * RADIUS_DEG, lng: lng + u1 * lngRadius },
        { lat: lat + v2 * RADIUS_DEG, lng: lng + u2 * lngRadius },
      ]);
    }
    // "\" 방향: u + v = c
    {
      const u1 = (c + sq) / 2;
      const v1 = c - u1;
      const u2 = (c - sq) / 2;
      const v2 = c - u2;
      lines.push([
        { lat: lat + v1 * RADIUS_DEG, lng: lng + u1 * lngRadius },
        { lat: lat + v2 * RADIUS_DEG, lng: lng + u2 * lngRadius },
      ]);
    }
  }
  return lines;
}

function makePath(
  id: string,
  name: string | null,
  points: { lat: number; lng: number }[],
  kind: TransportPath["kind"],
  accentColor: string,
): TransportPath {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    id,
    kind,
    name,
    scalerank: 1,
    lengthKm: null,
    accentColor,
    bbox: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

export function ukmtoIncidentToHatchPaths(incident: UkmtoHatchIncident): TransportPath[] {
  if (!Number.isFinite(incident.lat) || !Number.isFinite(incident.lng)) return [];
  const severity = ukmtoIncidentSeverity(incident);
  const outlineColor = grayColor(severity, 0.92);
  const hatchColor = grayColor(severity, Math.max(0.35, severity * 0.75));
  const label = incident.place || incident.incidentTypeName;

  const outline = makePath(
    `ukmto-zone-${incident.id}`,
    label,
    circleOutlinePoints(incident.lat, incident.lng),
    "dispute-zone",
    outlineColor,
  );

  const hatches = circleHatchSegments(incident.lat, incident.lng).map((segment, i) =>
    makePath(`ukmto-hatch-${incident.id}-${i}`, label, segment, "conflict-hatch", hatchColor),
  );

  return [outline, ...hatches];
}

export function isUkmtoHatchPath(path: TransportPath): boolean {
  return path.id.startsWith("ukmto-zone-") || path.id.startsWith("ukmto-hatch-");
}
