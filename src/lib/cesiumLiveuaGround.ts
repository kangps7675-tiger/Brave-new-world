/**
 * 라이브유어맵 지상군 공격 — 게베어 소총 두 자루를 X로 겹친 마커.
 * 폭발 표시(liveua-strike:)와 id 를 나눈다.
 */

type CesiumNS = typeof import("cesium");

export type CesiumLiveuaGroundPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
};

/** 노리쇠 손잡이와 목제 개머리판이 있는 소총 한 자루. +x 가 총구. */
const RIFLE = `<g fill="#1c1917">
  <path d="M-24 2.2 C-22 6.2 -15 6.4 -9 3.2 L-7 0.6 L-7 -2.2 L-16 -2.6 C-22 -2.2 -25 -0.2 -24 2.2Z" fill="#8a5a2b"/>
  <path d="M-22 1.2 C-18 3.6 -12 3.2 -8 1.2" fill="none" stroke="#5c3a16" stroke-width="0.6"/>
  <rect x="-8" y="-2.3" width="9" height="4.4" rx="0.5" fill="#3f3f46"/>
  <circle cx="0.2" cy="-4.1" r="1.55" fill="#a1a1aa"/>
  <rect x="1" y="-1.15" width="23" height="2.15" fill="#27272a"/>
  <rect x="22.2" y="-3.1" width="1.15" height="2.2" fill="#18181b"/>
  <rect x="23.4" y="-0.7" width="1.6" height="1.3" fill="#18181b"/>
</g>`;

const GROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#1c1917" fill-opacity="0.9" stroke="#d6d3d1" stroke-width="1.4"/>
  <g transform="translate(32 32) rotate(-42)">${RIFLE}</g>
  <g transform="translate(32 32) rotate(42)">${RIFLE}</g>
</svg>`;

const GROUND_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GROUND_SVG)}`;

const GROUND_PREFIX = "liveua-ground:";
const HEIGHT_M = 500;
const NEAR_M = 150_000;
const NEAR_SCALE = 1.45;
const FAR_M = 20_000_000;
const FAR_SCALE = 0.24;

/** 지상군 공격 마커만 올리고, 빠진 속보는 지운다. */
export function syncLiveuaGroundEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  points: CesiumLiveuaGroundPoint[],
): void {
  const seen = new Set<string>();
  for (const point of points) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) continue;
    const id = `${GROUND_PREFIX}${point.id}`;
    seen.add(id);
    const position = Cesium.Cartesian3.fromDegrees(point.lng, point.lat, HEIGHT_M);
    const existing = viewer.entities.getById(id);
    if (existing?.billboard) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = point.title;
      existing.show = true;
      continue;
    }
    viewer.entities.add({
      id,
      name: point.title,
      position,
      billboard: {
        image: GROUND_URI,
        width: 42,
        height: 42,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 1,
        scaleByDistance: new Cesium.NearFarScalar(NEAR_M, NEAR_SCALE, FAR_M, FAR_SCALE),
        color: Cesium.Color.WHITE,
      },
    });
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    if (typeof entity.id === "string" && entity.id.startsWith(GROUND_PREFIX) && !seen.has(entity.id)) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}
