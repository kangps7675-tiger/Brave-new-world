import {
  AXIS_HUB_META,
  AXIS_NODES,
  AXIS_RELATION_COLORS,
  edgesForHub,
  type AxisEdge,
  type AxisHubId,
} from "@/data/axisNetwork";
import type { TransportPath, TransportPathPoint } from "@/data/geoTypes";
import {
  colorForGroupId,
  corridorLegPointsForPair,
  legModeLabelKo,
} from "@/lib/strategicCorridorPaths";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function toCart(lat: number, lng: number) {
  const φ = lat * DEG2RAD;
  const λ = lng * DEG2RAD;
  const cosφ = Math.cos(φ);
  return {
    x: cosφ * Math.cos(λ),
    y: cosφ * Math.sin(λ),
    z: Math.sin(φ),
  };
}

function fromCart(x: number, y: number, z: number) {
  const hyp = Math.hypot(x, y);
  return {
    lat: Math.atan2(z, hyp) * RAD2DEG,
    lng: Math.atan2(y, x) * RAD2DEG,
  };
}

/** 대권 호 샘플 (고도를 살짝 올려 글로브에서 구분) */
export function greatCircleArc(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  segments = 28,
  peakAlt = 0.12,
): TransportPathPoint[] {
  const a = toCart(lat1, lng1);
  const b = toCart(lat2, lng2);
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return [
      { lat: lat1, lng: lng1, alt: 0 },
      { lat: lat2, lng: lng2, alt: 0 },
    ];
  }
  const sinOmega = Math.sin(omega);
  const points: TransportPathPoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const s0 = Math.sin((1 - t) * omega) / sinOmega;
    const s1 = Math.sin(t * omega) / sinOmega;
    const x = s0 * a.x + s1 * b.x;
    const y = s0 * a.y + s1 * b.y;
    const z = s0 * a.z + s1 * b.z;
    const { lat, lng } = fromCart(x, y, z);
    const alt = peakAlt * Math.sin(Math.PI * t);
    points.push({ lat, lng, alt });
  }
  return points;
}

function edgeLengthKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const Δφ = (lat2 - lat1) * DEG2RAD;
  const Δλ = (lng2 - lng1) * DEG2RAD;
  const h =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bboxFromPoints(
  points: TransportPathPoint[],
  fallbackLat: number,
  fallbackLng: number,
) {
  return points.reduce(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      minLng: Math.min(acc.minLng, p.lng),
      maxLat: Math.max(acc.maxLat, p.lat),
      maxLng: Math.max(acc.maxLng, p.lng),
    }),
    { minLat: fallbackLat, minLng: fallbackLng, maxLat: fallbackLat, maxLng: fallbackLng },
  );
}

/**
 * 실측 회랑(카스피해 경유, 라진-하산 철도 등)이 육로↔해상 다구간(legs)으로 등록돼
 * 있으면 국가 수도 간 대권 호 하나 대신 그 구간들을 각각 별도 feature로 반환한다 —
 * 육로 구간은 실선, 해상(카스피해 도하 등) 구간은 호출부(MapGlobeView)에서
 * meta.legMode === "sea"를 보고 점선으로 그려서, 장애물을 만나 항로로 갈아탄 뒤
 * 반대편에서 다시 육로가 이어지는 실제 모습 그대로 보이게 한다.
 * 등록된 실측 회랑이 없으면 기존과 동일하게 대권 호 하나만 반환한다.
 */
export function axisEdgeToPaths(edge: AxisEdge, lang: "ko" | "en" = "ko"): TransportPath[] {
  const na = AXIS_NODES[edge.a];
  const nb = AXIS_NODES[edge.b];
  if (!na || !nb) return [];
  const name = lang === "en" ? edge.labelEn : edge.labelKo;
  // 기본색은 국가(허브)별 고유색 — 같은 허브에 속한 링크는 항상 같은 색이라
  // "그 나라 웹" 전체가 하나의 색으로 보인다. hubs[0]이 항상 존재하므로
  // (허브-허브 간선도 양쪽 허브를 배열에 담아 정의) colorForGroupId는 안전망으로만 남긴다.
  const baseColor = AXIS_HUB_META[edge.hubs[0]]?.color ?? colorForGroupId(edge.id);
  // 호버 시 드러날 색 — 관계 성격(군수=빨강/하이브리드=주황 등)을 그 순간에만 보여준다.
  const hoverColor = AXIS_RELATION_COLORS[edge.kind] ?? baseColor;
  const baseMeta = {
    mode: "network" as const,
    relationKind: edge.kind,
    from: edge.a,
    to: edge.b,
    fromName: lang === "en" ? na.nameEn : na.nameKo,
    toName: lang === "en" ? nb.nameEn : nb.nameKo,
    hoverColor,
  };

  const accentColor = baseColor;
  const legs = corridorLegPointsForPair(edge.a, edge.b);
  if (!legs) {
    const points = greatCircleArc(na.lat, na.lng, nb.lat, nb.lng);
    return [
      {
        id: edge.id,
        kind: "axis-link",
        name,
        scalerank: 1,
        lengthKm: edgeLengthKm(na.lat, na.lng, nb.lat, nb.lng),
        accentColor,
        bbox: {
          minLat: Math.min(na.lat, nb.lat),
          minLng: Math.min(na.lng, nb.lng),
          maxLat: Math.max(na.lat, nb.lat),
          maxLng: Math.max(na.lng, nb.lng),
        },
        points,
        meta: {
          ...baseMeta,
          // 기존 mode 값(다른 컴포넌트가 참조할 수 있음)은 그대로 두고,
          // 실측 회랑 대체 여부만 새 필드로 별도 표기한다.
          geometrySource: "great-circle" as const,
          // leg가 없어도 groupId는 항상 채워서, 호버/선택 로직이 edge.id 대신
          // meta.groupId 하나만 보고도 일관되게 동작하게 한다.
          groupId: edge.id,
          legIndex: 0,
        },
      },
    ];
  }

  return legs.map((leg, i) => ({
    id: legs.length > 1 ? `${edge.id}--leg${i}` : edge.id,
    kind: "axis-link",
    name: legs.length > 1 ? `${name} (${legModeLabelKo(leg.mode)} 구간)` : name,
    scalerank: 1,
    lengthKm: leg.lengthKm,
    accentColor,
    bbox: bboxFromPoints(leg.points, na.lat, na.lng),
    points: leg.points,
    meta: {
      ...baseMeta,
      geometrySource: "real-corridor" as const,
      // 실제 edge.id — 이 값 하나로 leg 전체(그리고 클릭·선택 상태)를 하나의 관계로 묶는다.
      // path.id 자체는 leg가 여러 개면 `${edge.id}--legN`으로 갈라지므로, 선택/하이라이트
      // 로직은 반드시 이 groupId를 기준으로 비교해야 한다(axisLinkSelection.ts 참고).
      groupId: edge.id,
      legIndex: i,
      legMode: leg.mode,
      totalLegs: legs.length,
      // 이 leg가 속한 실측 회랑이 아직 "건설중"이면 호출부(MapGlobeView)가
      // 이 값을 보고 글린트(반짝임)를 막는다 — 아직 없는 인프라를 완공된 것처럼
      // 보이게 하지 않기 위함.
      status: leg.status,
    },
  }));
}

/** @deprecated 다구간 회랑이면 첫 leg만 반환한다 — 새 코드는 axisEdgeToPaths를 쓸 것 */
export function axisEdgeToPath(edge: AxisEdge, lang: "ko" | "en" = "ko"): TransportPath | null {
  return axisEdgeToPaths(edge, lang)[0] ?? null;
}

export function axisNetworkToPaths(
  hub: AxisHubId | "all" = "all",
  lang: "ko" | "en" = "ko",
): TransportPath[] {
  const out: TransportPath[] = [];
  for (const edge of edgesForHub(hub)) {
    out.push(...axisEdgeToPaths(edge, lang));
  }
  return out;
}
