/**
 * Cesium 관측 — 북한 미사일 발사·시험 지점 + 탄도 포물선 힌트·플래시.
 * 탄착 미확정: 동해 방향 포물선만 표시 (NEPTUN 실시간 궤적과 구분).
 */

import type { KoreaMissileIncident } from "@/data/koreaMissileIncidentsSeed";
import { KOREA_MISSILE_LAUNCHES } from "@/data/koreaMissileLaunchesSeed";
import { startObservePulseLoop } from "@/lib/cesiumObservePulse";

type CesiumNS = typeof import("cesium");

export type CesiumMissileLaunchPoint = Pick<
  KoreaMissileIncident,
  "id" | "lat" | "lng" | "kind" | "intensity" | "titleKo" | "titleEn"
>;

/** 종류별 사거리(대략 km)·정점고도(m)·방위(도, 정북=0) — 동해·일본해 쪽 힌트 */
function arcParams(kind: string): {
  rangeKm: number;
  apexM: number;
  bearingDeg: number;
} {
  switch (kind) {
    case "space-launch":
      return { rangeKm: 520, apexM: 220_000, bearingDeg: 95 };
    case "hypersonic":
      return { rangeKm: 380, apexM: 110_000, bearingDeg: 100 };
    case "slbm":
      return { rangeKm: 280, apexM: 85_000, bearingDeg: 105 };
    case "cruise":
      // 순항은 낮은 비행 — 얕은 포물선
      return { rangeKm: 220, apexM: 8_000, bearingDeg: 110 };
    case "artillery":
      return { rangeKm: 60, apexM: 12_000, bearingDeg: 90 };
    case "ballistic":
    default:
      return { rangeKm: 340, apexM: 95_000, bearingDeg: 98 };
  }
}

export type BallisticArcSample = {
  lat: number;
  lng: number;
  heightM: number;
};

/**
 * 발사점 → 동해 방향 탄도 포물선 (h = 4·H·t·(1−t)).
 * 지구 곡면 위 방위각으로 전진. Cesium 엔티티와 과거 내역 웹그래픽이 같은 샘플을 쓴다.
 */
export function ballisticArcSamples(
  lat: number,
  lng: number,
  kind: string,
): BallisticArcSample[] {
  const { rangeKm, apexM, bearingDeg } = arcParams(kind);
  const R = 6_371; // km
  const steps = 28;
  const pts: BallisticArcSample[] = [];
  const br = (bearingDeg * Math.PI) / 180;
  const lat0 = (lat * Math.PI) / 180;
  const lon0 = (lng * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const h = 4 * apexM * t * (1 - t);
    const d = (rangeKm * t) / R;
    const lat1 = Math.asin(
      Math.sin(lat0) * Math.cos(d) + Math.cos(lat0) * Math.sin(d) * Math.cos(br),
    );
    const lon1 =
      lon0 +
      Math.atan2(
        Math.sin(br) * Math.sin(d) * Math.cos(lat0),
        Math.cos(d) - Math.sin(lat0) * Math.sin(lat1),
      );
    pts.push({
      lng: (lon1 * 180) / Math.PI,
      lat: (lat1 * 180) / Math.PI,
      heightM: h,
    });
  }
  return pts;
}

export function ballisticArcPositions(
  Cesium: CesiumNS,
  lat: number,
  lng: number,
  kind: string,
): import("cesium").Cartesian3[] {
  return ballisticArcSamples(lat, lng, kind).map((sample) =>
    Cesium.Cartesian3.fromDegrees(sample.lng, sample.lat, sample.heightM),
  );
}

/**
 * 관측 지구본에 그릴 발사만. 역대 연표 전체·시설 앵커는 빼고,
 * 라이브 이슈가 있으면 그것만, 없으면 가장 최근 발사 둘만 남긴다.
 */
export function pickCesiumMissileLaunches<T extends { id: string }>(
  markers: T[],
): T[] {
  const live = markers.filter((marker) => marker.id.startsWith("live-nk-"));
  if (live.length > 0) return live;
  const newestIds = new Set(
    [...KOREA_MISSILE_LAUNCHES]
      .sort((a, b) => b.launchedAt.localeCompare(a.launchedAt))
      .slice(0, 2)
      .map((launch) => `hist-nk-${launch.id}`),
  );
  return markers.filter((marker) => newestIds.has(marker.id));
}

export function syncMissileLaunchEntities(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  launches: CesiumMissileLaunchPoint[],
): void {
  const seen = new Set<string>();
  for (const launch of launches) {
    if (!Number.isFinite(launch.lat) || !Number.isFinite(launch.lng)) continue;
    const id = `nk-missile:${launch.id}`;
    const arcId = `nk-missile-arc:${launch.id}`;
    const apexId = `nk-missile-apex:${launch.id}`;
    seen.add(id);
    seen.add(arcId);
    seen.add(apexId);
    const intensity = Math.min(1, Math.max(0.35, launch.intensity ?? 0.7));
    const position = Cesium.Cartesian3.fromDegrees(
      launch.lng,
      launch.lat,
      1_200,
    );
    const existing = viewer.entities.getById(id);
    if (existing?.point) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      existing.name = launch.titleKo || launch.titleEn;
    } else {
      viewer.entities.add({
        id,
        name: launch.titleKo || launch.titleEn,
        position,
        point: {
          pixelSize: 9 + intensity * 6,
          color: Cesium.Color.fromCssColorString("#f97316").withAlpha(0.95),
          outlineColor: Cesium.Color.fromCssColorString("#fecaca").withAlpha(0.9),
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.NONE,
        },
      });
    }

    const arcPts = ballisticArcPositions(
      Cesium,
      launch.lat,
      launch.lng,
      launch.kind,
    );
    const arcExisting = viewer.entities.getById(arcId);
    if (arcExisting?.polyline) {
      arcExisting.polyline.positions = new Cesium.ConstantProperty(arcPts);
    } else {
      viewer.entities.add({
        id: arcId,
        polyline: {
          positions: arcPts,
          width: 2 + intensity * 1.2,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.18,
            taperPower: 0.4,
            color: Cesium.Color.fromCssColorString("#fb923c").withAlpha(0.82),
          }),
          clampToGround: false,
          arcType: Cesium.ArcType.NONE,
        },
      });
    }

    // 정점 마커 — 포물선 읽기 보조
    const apexPt = arcPts[Math.floor(arcPts.length / 2)];
    if (apexPt) {
      const apexExisting = viewer.entities.getById(apexId);
      if (apexExisting?.point) {
        apexExisting.position = new Cesium.ConstantPositionProperty(apexPt);
      } else {
        viewer.entities.add({
          id: apexId,
          position: apexPt,
          point: {
            pixelSize: 4,
            color: Cesium.Color.fromCssColorString("#fdba74").withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK.withAlpha(0.35),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }
  }

  const stale: import("cesium").Entity[] = [];
  for (const entity of viewer.entities.values) {
    const id = entity.id;
    if (typeof id !== "string") continue;
    if (
      (id.startsWith("nk-missile:") ||
        id.startsWith("nk-missile-arc:") ||
        id.startsWith("nk-missile-apex:")) &&
      !seen.has(id)
    ) {
      stale.push(entity);
    }
  }
  for (const entity of stale) viewer.entities.remove(entity);
}

/** 발사 지점 플래시 펄스 */
export function attachMissileLaunchPulse(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): () => void {
  return startObservePulseLoop(() => {
    if (viewer.isDestroyed()) return false;
    const t = performance.now() / 1000;
    let any = false;
    for (const entity of viewer.entities.values) {
      if (typeof entity.id !== "string" || !entity.id.startsWith("nk-missile:")) {
        continue;
      }
      if (entity.id.includes("-arc:") || entity.id.includes("-apex:")) continue;
      const pt = entity.point;
      if (!pt) continue;
      any = true;
      const pulse = 0.85 + 0.15 * Math.sin(t * 4.2);
      pt.pixelSize = new Cesium.ConstantProperty(10 + pulse * 8);
    }
    return any;
  });
}
