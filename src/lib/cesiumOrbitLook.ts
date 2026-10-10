import { clampCesiumPitchToGlobeDeg } from "@/lib/globeCamera";

/** 수평선에 가장 가까운 시선(하향각, 도) — 더 눕히면 저고도에서 건물·지형에 박힌다 */
export const ORBIT_LOOK_MIN_DOWN_DEG = 15;
export const ORBIT_LOOK_NADIR_PITCH_DEG = -89.5;

/** 기울기 결과 pitch(rad) — 직하 ~ 수평선 근처 사이로 제한 */
export function clampOrbitLookPitchRad(
  pitchRad: number,
  heightM: number,
): number {
  const maxDeg = clampCesiumPitchToGlobeDeg(heightM, -ORBIT_LOOK_MIN_DOWN_DEG);
  const deg = (pitchRad * 180) / Math.PI;
  const clamped = Math.min(maxDeg, Math.max(ORBIT_LOOK_NADIR_PITCH_DEG, deg));
  return (clamped * Math.PI) / 180;
}

/**
 * 화면 중앙 지점을 축으로 기울이기(dPitch)·돌기(dHeading).
 * camera.rotateUp/Right는 지구 중심이 축이라 저고도에서 카메라가 수백 km 밀려난다.
 */
export function orbitCameraAroundScreenCenter(
  Cesium: typeof import("cesium"),
  viewer: import("cesium").Viewer,
  dPitchRad: number,
  dHeadingRad: number,
): boolean {
  const scene = viewer.scene;
  const camera = viewer.camera;
  const canvas = scene.canvas;
  const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);

  let target: import("cesium").Cartesian3 | undefined;
  if (scene.pickPositionSupported) {
    try {
      target = scene.pickPosition(center);
    } catch {
      target = undefined;
    }
  }
  if (!target) {
    const ray = camera.getPickRay(center);
    if (ray) target = scene.globe.pick(ray, scene);
  }
  if (!target) target = camera.pickEllipsoid(center);
  if (!target) return false;

  const range = Cesium.Cartesian3.distance(camera.positionWC, target);
  if (!Number.isFinite(range) || range <= 1) return false;
  const height = camera.positionCartographic?.height ?? range;
  const pitch = clampOrbitLookPitchRad(camera.pitch + dPitchRad, height);
  const heading = camera.heading + dHeadingRad;

  camera.lookAt(target, new Cesium.HeadingPitchRange(heading, pitch, range));
  camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  return true;
}
