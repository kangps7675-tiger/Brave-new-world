import type { DisputeArea, GeoJsonGeometry } from "@/data/geoTypes";
import { disputeGeometryBbox } from "@/lib/disputeHatch";

type LatLng = { lat: number; lng: number };

function bboxCenter(box: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): LatLng {
  return {
    lat: (box.minLat + box.maxLat) / 2,
    lng: (box.minLng + box.maxLng) / 2,
  };
}

function pointInExpandedBbox(point: LatLng, box: ReturnType<typeof disputeGeometryBbox>, marginDeg: number) {
  if (!box) return false;
  return (
    point.lng >= box.minLng - marginDeg &&
    point.lng <= box.maxLng + marginDeg &&
    point.lat >= box.minLat - marginDeg &&
    point.lat <= box.maxLat + marginDeg
  );
}

/** geometry가 있으면 bbox 중심, 없으면 기존 center */
export function geometryAwareCenter(
  geometry: GeoJsonGeometry | null | undefined,
  fallback: LatLng,
): LatLng {
  const box = geometry ? disputeGeometryBbox(geometry) : null;
  return box ? bboxCenter(box) : fallback;
}

/**
 * Natural Earth LABEL이 지오메트리와 동떨어진 경우(쿠릴→유럽 러시아 등) geometry 중심으로 보정.
 * 뷰포트 필터·지역 분류·플라이투에 공통 사용.
 */
export function resolveDisputeCenter(dispute: Pick<DisputeArea, "center" | "geometry">): LatLng {
  const box = dispute.geometry ? disputeGeometryBbox(dispute.geometry) : null;
  if (!box) return dispute.center;
  if (pointInExpandedBbox(dispute.center, box, 5)) return dispute.center;
  return bboxCenter(box);
}
