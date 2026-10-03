"use client";

import { useEffect, type RefObject } from "react";
import type { Viewer } from "cesium";
import {
  GLOBE_KEYBOARD_ZOOM_PER_SEC,
  GLOBE_KEYBOARD_ZOOM_PER_SEC_SHIFT,
  globeNavActionFromCode,
  panDeltaForDirs,
  shouldIgnoreGlobeKeyboardNav,
  type GlobeNavPanDir,
} from "@/lib/globeKeyboardNav";

/**
 * MapLibre `useGlobeKeyboardNav`와 동일 키: WASD / 화살표 pan, +/- 연속 줌.
 * 위성(Cesium) 모드에서 MapLibre 훅이 언마운트되므로 Cesium Viewer에 별도 연결.
 */
export function useCesiumKeyboardNav(
  viewerRef: RefObject<Viewer | null>,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const panDirs = new Set<GlobeNavPanDir>();
    let zoomDir: 1 | -1 | 0 = 0;
    let zoomShift = false;
    let rafId = 0;
    let lastTs = 0;
    let flightCancelled = false;

    const stopRaf = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      lastTs = 0;
      flightCancelled = false;
    };

    const needsRaf = () => panDirs.size > 0 || zoomDir !== 0;

    const cancelFlightOnce = () => {
      if (flightCancelled) return;
      flightCancelled = true;
      try {
        viewer.camera.cancelFlight();
      } catch {
        /* destroyed mid-frame */
      }
    };

    /** 화면 픽셀 → 카메라 로컬 이동(m). 고도에 비례해 MapLibre panBy와 비슷한 체감. */
    const metersPerPixel = (): number => {
      const camera = viewer.camera;
      const canvas = viewer.scene.canvas;
      const h = Math.max(1, canvas.clientHeight);
      const height = Math.max(50, camera.positionCartographic.height);
      const frustum = camera.frustum as { fovy?: number };
      if (typeof frustum.fovy === "number" && Number.isFinite(frustum.fovy)) {
        return (2 * height * Math.tan(frustum.fovy * 0.5)) / h;
      }
      // Orthographic / unknown — height 기반 근사
      return height / h;
    };

    const tick = (ts: number) => {
      rafId = requestAnimationFrame(tick);
      if (!lastTs) {
        lastTs = ts;
        return;
      }
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (viewer.isDestroyed()) {
        stopRaf();
        return;
      }
      if (shouldIgnoreGlobeKeyboardNav(document.activeElement, document.activeElement)) {
        return;
      }

      const clampedDt = Math.min(0.05, Math.max(0, dt));
      if (panDirs.size > 0 || zoomDir !== 0) cancelFlightOnce();

      if (panDirs.size > 0) {
        const delta = panDeltaForDirs(panDirs, dt);
        if (delta) {
          const mpp = metersPerPixel();
          const camera = viewer.camera;
          try {
            if (delta.dx !== 0) camera.moveRight(delta.dx * mpp);
            // 화면 y+: 아래 → 카메라 moveDown (지표면이 위로 스크롤되는 MapLibre panBy와 동일)
            if (delta.dy !== 0) camera.moveUp(-delta.dy * mpp);
          } catch {
            /* mid-destroy */
          }
        }
      }

      if (zoomDir !== 0) {
        const rate = zoomShift
          ? GLOBE_KEYBOARD_ZOOM_PER_SEC_SHIFT
          : GLOBE_KEYBOARD_ZOOM_PER_SEC;
        const height = Math.max(50, viewer.camera.positionCartographic.height);
        // MapLibre zoom level Δ → 거리 배율 2^Δ 와 맞춤
        const amount = Math.abs(height - height / Math.pow(2, rate * clampedDt));
        try {
          if (zoomDir > 0) viewer.camera.zoomIn(amount);
          else {
            const max = viewer.scene.screenSpaceCameraController.maximumZoomDistance;
            if (Number.isFinite(max) && height >= max - 40) {
              /* 속보 공간 — 키보드 줌아웃도 창 밖에서 멈춘다 */
            } else {
              viewer.camera.zoomOut(amount);
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!needsRaf()) stopRaf();
    };

    const ensureRaf = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    /** Ctrl/Alt + 화살표·WASD → 기울기·좌우 회전 (LiveUA 위치 관측용) */
    const applyModifierLook = (event: KeyboardEvent): boolean => {
      if (!(event.altKey || event.ctrlKey) || event.metaKey) return false;
      if (shouldIgnoreGlobeKeyboardNav(event.target, document.activeElement)) {
        return false;
      }
      const code = event.code;
      const step = event.shiftKey ? 0.045 : 0.028;
      try {
        const camera = viewer.camera;
        if (code === "ArrowLeft" || code === "KeyA") {
          camera.rotateRight(-step);
          event.preventDefault();
          return true;
        }
        if (code === "ArrowRight" || code === "KeyD") {
          camera.rotateRight(step);
          event.preventDefault();
          return true;
        }
        if (code === "ArrowUp" || code === "KeyW") {
          camera.rotateUp(-step);
          event.preventDefault();
          return true;
        }
        if (code === "ArrowDown" || code === "KeyS") {
          camera.rotateUp(step);
          event.preventDefault();
          return true;
        }
      } catch {
        /* destroyed */
      }
      return false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (applyModifierLook(event)) {
        cancelFlightOnce();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (shouldIgnoreGlobeKeyboardNav(event.target, document.activeElement)) return;

      const action = globeNavActionFromCode(event.code, event.key);
      if (!action) return;

      if (action.type === "pan") {
        if (event.shiftKey) return;
        if (panDirs.has(action.dir)) {
          event.preventDefault();
          return;
        }
        panDirs.add(action.dir);
        event.preventDefault();
        ensureRaf();
        return;
      }

      event.preventDefault();
      zoomDir = action.dir;
      zoomShift = event.shiftKey;
      ensureRaf();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const action = globeNavActionFromCode(event.code, event.key);
      if (!action) return;
      if (action.type === "pan") {
        panDirs.delete(action.dir);
      } else if (action.type === "zoom" && zoomDir === action.dir) {
        zoomDir = 0;
        zoomShift = false;
      }
      if (!needsRaf()) stopRaf();
    };

    const onBlur = () => {
      panDirs.clear();
      zoomDir = 0;
      zoomShift = false;
      stopRaf();
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);

    return () => {
      stopRaf();
      panDirs.clear();
      window.removeEventListener("keydown", onKeyDown, { capture: true } as EventListenerOptions);
      window.removeEventListener("keyup", onKeyUp, { capture: true } as EventListenerOptions);
      window.removeEventListener("blur", onBlur);
    };
  }, [ready, viewerRef]);
}
