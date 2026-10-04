"use client";

import { useEffect, type MutableRefObject, type RefObject } from "react";
import type { Viewer } from "cesium";
import { clampCesiumPitchToGlobeDeg } from "@/lib/globeCamera";

/** 수평선 위로 이만큼 여유를 두고 지구를 향하게 한다(도). */
export const HORIZON_GUARD_MARGIN_DEG = 3;

/**
 * 카메라 중앙 시선이 지구를 벗어나(수평선 위·우주) 화면이 검게 보이는 상태를 막는다.
 * 원인은 프로그램 비행(고도 대비 얕은 pitch)과 유저 look/tilt 입력 둘 다 — 마지막 안전망.
 * 프로그램 비행·entity 추적(좌표계가 ENU 로 바뀜) 중에는 건드리지 않는다.
 */
export function useCesiumHorizonGuard(
  viewerRef: RefObject<Viewer | null>,
  ready: boolean,
  programmaticCameraRef: MutableRefObject<boolean>,
): void {
  useEffect(() => {
    if (!ready) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    let cancelled = false;
    let remove: (() => void) | null = null;

    void import("cesium").then((Cesium) => {
      if (cancelled || viewer.isDestroyed()) return;
      remove = viewer.scene.postRender.addEventListener(() => {
        if (viewer.isDestroyed()) return;
        if (programmaticCameraRef.current || viewer.trackedEntity) return;
        const cam = viewer.camera;
        if ((cam as unknown as { _currentFlight?: unknown })._currentFlight) return;
        if (!Cesium.Matrix4.equals(cam.transform, Cesium.Matrix4.IDENTITY)) return;
        const pitch = cam.pitch;
        const height = cam.positionCartographic?.height;
        if (!Number.isFinite(pitch) || height == null || !Number.isFinite(height)) return;
        const limit = Cesium.Math.toRadians(
          clampCesiumPitchToGlobeDeg(
            height,
            Cesium.Math.toDegrees(pitch),
            HORIZON_GUARD_MARGIN_DEG,
          ),
        );
        // pitch 가 한계보다 위(덜 숙임)면 중앙 시선이 우주를 향한다.
        if (pitch <= limit) return;
        cam.setView({
          destination: Cesium.Cartesian3.clone(cam.positionWC),
          orientation: { heading: cam.heading, pitch: limit, roll: 0 },
        });
      });
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [ready, viewerRef, programmaticCameraRef]);
}
