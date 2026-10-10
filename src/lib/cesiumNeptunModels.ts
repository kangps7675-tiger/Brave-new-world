/**
 * NEPTUN 위협 — Cesium ModelGraphics (3D 실루엣).
 * 원거리 LOD는 빌보드, 근·중거리는 glTF.
 */
import { observeRequestRender } from "@/lib/cesiumObserveRenderGovernor";
import {
  estimateBallisticProgress,
  estimateShahedProgress,
  SHAHED_DIVE_START,
} from "@/lib/neptunFlightProfile";
import { neptunGltfDataUri, neptunGltfKindForType } from "@/lib/neptunGltf";
import type { NeptunLiveThreat } from "@/lib/neptun";

type CesiumNS = typeof import("cesium");

export const NEPTUN_MODEL_MINIMUM_PIXEL = 36;
export const NEPTUN_MODEL_MAXIMUM_SCALE = 48_000;
/** 기수=+X 메시 기준 스케일 (미터 단위 체감) */
export const NEPTUN_MODEL_SCALE: Record<string, number> = {
  shahed: 22,
  glide: 18,
  iskander: 55,
  cruise: 28,
  jet: 30,
};
/** 이 거리 밖이면 빌보드 LOD */
export const NEPTUN_MODEL_MAX_CAMERA_DISTANCE_M = 3_200_000;

function cameraDistanceM(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  position: import("cesium").Cartesian3,
): number {
  return Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
}

/** Shahed/Geran: 순항(평평) → 목표 접근 시 가미카제 기수 숙임 */
export function shahedPitchDeg(t01: number): number {
  const t = Math.min(1, Math.max(0, t01));
  if (t <= SHAHED_DIVE_START) {
    // 순항: 약한 기수 내림 (장거리 순항 자세)
    return -3;
  }
  const u = (t - SHAHED_DIVE_START) / (1 - SHAHED_DIVE_START);
  // 돌진: -3° → ~-70°
  return -3 - 67 * (u * u);
}

/** 비행 단계별 pitch (기수 들림 +, 하강 -) */
export function neptunPitchDeg(threat: NeptunLiveThreat): number {
  if (threat.type === "uav" || threat.type === "recon") {
    return shahedPitchDeg(estimateShahedProgress(threat));
  }
  if (threat.type !== "ballistic") return 0;
  const t = estimateBallisticProgress(threat);
  if (t <= 0.36) {
    // 상승: 초반 가파름 → 정점 전 완화
    const u = t / 0.36;
    return 55 - 35 * u;
  }
  if (t <= 0.58) {
    const u = (t - 0.36) / (0.58 - 0.36);
    return -10 - 35 * u;
  }
  if (t <= 0.88) {
    return -4;
  }
  const u = (t - 0.88) / (1 - 0.88);
  return -4 - 82 * u;
}

function applyNeptunOrientation(
  Cesium: CesiumNS,
  entity: import("cesium").Entity,
  position: import("cesium").Cartesian3,
  headingDeg: number | null,
  pitchDeg: number,
): void {
  const heading =
    headingDeg != null && Number.isFinite(headingDeg) ? headingDeg : 0;
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(heading - 90),
    Cesium.Math.toRadians(pitchDeg),
    0,
  );
  entity.orientation = new Cesium.ConstantProperty(
    Cesium.Transforms.headingPitchRollQuaternion(position, hpr),
  );
}

/**
 * neptun:* 엔티티에 3D 모델 부여. stem/ground는 제외.
 * 카메라 멀면 모델 끄고 빌보드 복구.
 */
export function syncNeptunModels(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
  threats: NeptunLiveThreat[],
  trackedId: string | null,
): void {
  const time = viewer.clock.currentTime;
  const byId = new Map(threats.map((t) => [t.id, t]));
  const maxDist = NEPTUN_MODEL_MAX_CAMERA_DISTANCE_M;

  for (const entity of viewer.entities.values) {
    if (typeof entity.id !== "string") continue;
    if (!entity.id.startsWith("neptun:")) continue;
    if (
      entity.id.startsWith("neptun-stem:") ||
      entity.id.startsWith("neptun-ground:")
    ) {
      continue;
    }

    const threatId = entity.id.slice("neptun:".length);
    const threat = byId.get(threatId);
    const position = entity.position?.getValue(time);
    if (!threat || !position) {
      if (entity.model) entity.model = undefined;
      if (entity.billboard) entity.billboard.show = new Cesium.ConstantProperty(true);
      continue;
    }

    const dist = cameraDistanceM(Cesium, viewer, position);
    const inRange = Number.isFinite(dist) && dist <= maxDist;
    const kind = neptunGltfKindForType(threat.type);
    const uri = neptunGltfDataUri(kind);
    const baseScale = NEPTUN_MODEL_SCALE[kind] ?? 24;
    const emphasized = trackedId === entity.id;
    const scale = emphasized ? baseScale * 1.2 : baseScale;
    const minPx = emphasized
      ? NEPTUN_MODEL_MINIMUM_PIXEL + 24
      : NEPTUN_MODEL_MINIMUM_PIXEL;
    const heading =
      threat.predictedHeading ?? threat.heading ?? threat.velocity?.bearingDeg ?? null;
    const pitch = neptunPitchDeg(threat);
    const color = Cesium.Color.fromCssColorString(
      threat.type === "ballistic"
        ? "#b21e6b"
        : threat.type === "kab"
          ? "#d9531e"
          : "#f0820e",
    ).withAlpha(0.55);

    if (inRange) {
      applyNeptunOrientation(Cesium, entity, position, heading, pitch);
      if (entity.model) {
        entity.model.show = new Cesium.ConstantProperty(true);
        entity.model.uri = new Cesium.ConstantProperty(uri);
        entity.model.scale = new Cesium.ConstantProperty(scale);
        entity.model.minimumPixelSize = new Cesium.ConstantProperty(minPx);
        entity.model.maximumScale = new Cesium.ConstantProperty(
          NEPTUN_MODEL_MAXIMUM_SCALE,
        );
        entity.model.heightReference = new Cesium.ConstantProperty(
          Cesium.HeightReference.RELATIVE_TO_GROUND,
        );
        entity.model.silhouetteSize = new Cesium.ConstantProperty(
          emphasized ? 1.4 : 0.4,
        );
        entity.model.silhouetteColor = new Cesium.ConstantProperty(color);
      } else {
        entity.model = new Cesium.ModelGraphics({
          show: true,
          uri,
          scale,
          minimumPixelSize: minPx,
          maximumScale: NEPTUN_MODEL_MAXIMUM_SCALE,
          runAnimations: false,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          silhouetteColor: color,
          silhouetteSize: emphasized ? 1.4 : 0.4,
        });
      }
      if (entity.billboard) {
        entity.billboard.show = new Cesium.ConstantProperty(false);
      }
    } else {
      if (entity.model) entity.model = undefined;
      if (entity.billboard) {
        entity.billboard.show = new Cesium.ConstantProperty(true);
      }
    }
  }
  observeRequestRender();
}

export function clearNeptunModels(
  Cesium: CesiumNS,
  viewer: import("cesium").Viewer,
): void {
  for (const entity of viewer.entities.values) {
    if (typeof entity.id !== "string" || !entity.id.startsWith("neptun:")) continue;
    if (entity.id.includes("stem") || entity.id.includes("ground")) continue;
    if (entity.model) entity.model = undefined;
    if (entity.billboard) entity.billboard.show = new Cesium.ConstantProperty(true);
  }
}
