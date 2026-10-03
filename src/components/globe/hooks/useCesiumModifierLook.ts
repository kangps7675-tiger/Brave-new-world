"use client";

import { useEffect, type RefObject } from "react";
import type { Viewer } from "cesium";

/**
 * Cesium 기본: Ctrl+드래그 = 기울기(tilt).
 * MapLibre(Alt+드래그)와 LiveUA「위치로 가기」후 조작을 위해 Alt도 tilt에 추가.
 * Shift+드래그 look은 유지.
 */
export function useCesiumModifierLook(
  viewerRef: RefObject<Viewer | null>,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    let cancelled = false;

    void import("cesium").then((mod) => {
      if (cancelled || viewer.isDestroyed()) return;
      const controller = viewer.scene.screenSpaceCameraController;
      const { CameraEventType, KeyboardEventModifier } = mod;

      controller.tiltEventTypes = [
        CameraEventType.MIDDLE_DRAG,
        CameraEventType.PINCH,
        {
          eventType: CameraEventType.LEFT_DRAG,
          modifier: KeyboardEventModifier.CTRL,
        },
        {
          eventType: CameraEventType.RIGHT_DRAG,
          modifier: KeyboardEventModifier.CTRL,
        },
        {
          eventType: CameraEventType.LEFT_DRAG,
          modifier: KeyboardEventModifier.ALT,
        },
        {
          eventType: CameraEventType.RIGHT_DRAG,
          modifier: KeyboardEventModifier.ALT,
        },
      ];

      controller.lookEventTypes = {
        eventType: CameraEventType.LEFT_DRAG,
        modifier: KeyboardEventModifier.SHIFT,
      };
    });

    return () => {
      cancelled = true;
    };
  }, [ready, viewerRef]);
}
