import type { TransportPath } from "@/data/geoTypes";

/**
 * 북극 항로 — 항로(shipping-lane) 레이어에 합쳐 그린다.
 * 기존 항로 데이터(Shipping-Lanes)는 북극을 포함하지 않아 직접 만든 근사 경로다.
 * 정확한 항로·수심·결빙 정보가 아니라 "대략 이 길로 다닌다"는 시각 가이드이며,
 * 실제 통항은 빙황·쇄빙선 호송·러시아 NSR 관리국 허가 등에 달려 있다.
 * 날짜변경선(±180°)은 렌더 오류를 피하려고 두 토막으로 나눈다.
 */

type P = [number, number]; // [lat, lng]

/** 북동항로 NSR — 바렌츠해(무르만스크 앞) → 카라 해협 → 빌키츠키 해협 → 소스노프 해협 → 베링 해협 */
const NSR_WEST: P[] = [
  [71.2, 33.5],
  [70.9, 45.0],
  [70.5, 57.5], // 카라 해협(Kara Strait)
  [72.3, 66.0],
  [73.6, 80.0], // 딕슨 앞
  [76.2, 96.0], // 타이미르 반도 북쪽
  [77.6, 104.3], // 빌키츠키 해협(Vilkitsky Strait)
  [76.6, 113.0],
  [75.6, 126.0],
  [74.7, 138.5], // 사니코프 해협 부근
  [73.4, 150.0],
  [72.4, 162.0],
  [71.2, 172.0],
  [70.6, 180.0],
];
const NSR_EAST: P[] = [
  [70.6, -180.0],
  [69.2, -174.0],
  [67.6, -171.0],
  [65.9, -169.0], // 베링 해협(Bering Strait)
];

/** 북서항로 NWP — 베링 해협 → 보퍼트해 → 아문센만 → 바로 해협 → 랭커스터 해협 → 배핀만 → 데이비스 해협 */
const NWP: P[] = [
  [65.9, -168.5], // 베링 해협
  [68.5, -166.5],
  [71.6, -158.0], // 배로(Utqiagvik) 앞
  [71.6, -145.0],
  [70.9, -131.0],
  [71.0, -125.0], // 아문센만(Amundsen Gulf)
  [72.3, -117.8], // 프린스오브웨일스 해협
  [74.6, -112.0], // 비스카운트 멜빌 해협
  [74.6, -100.0], // 바로 해협(Barrow Strait)
  [74.2, -88.0], // 랭커스터 해협(Lancaster Sound)
  [73.6, -77.0],
  [71.0, -67.0], // 배핀만
  [66.5, -58.5], // 데이비스 해협
  [60.0, -54.0],
];

function pathOf(id: string, name: string, pts: P[], meta: Record<string, string | number | null>): TransportPath {
  const points = pts.map(([lat, lng]) => ({ lat, lng }));
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    id,
    kind: "shipping-lane",
    name,
    scalerank: 1,
    lengthKm: null,
    bbox: { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) },
    points,
    meta,
  };
}

const NOTE = "근사 경로 · 결빙 시기(대략 7~11월)에만 통항, 쇄빙선·허가 필요";

export const ARCTIC_ROUTE_PATHS: TransportPath[] = [
  pathOf("arctic-nsr-west", "북극항로(북동항로·NSR)", NSR_WEST, { note: NOTE }),
  pathOf("arctic-nsr-east", "북극항로(북동항로·NSR)", NSR_EAST, { note: NOTE }),
  pathOf("arctic-nwp", "북서항로(NWP)", NWP, { note: NOTE }),
];
