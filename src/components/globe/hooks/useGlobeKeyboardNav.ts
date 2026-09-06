"use client";

import { useEffect, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import {
  GLOBE_KEYBOARD_ZOOM_PER_SEC,
  GLOBE_KEYBOARD_ZOOM_PER_SEC_SHIFT,
  globeNavActionFromCode,
  panDeltaForDirs,
  shouldIgnoreGlobeKeyboardNav,
  type GlobeNavPanDir,
} from "@/lib/globeKeyboardNav";

/**
 * Window-level globe nav: WASD / arrows pan, hold +/- for continuous slow zoom.
 * Skips when typing in inputs or when a dialog owns focus.
 */
export function useGlobeKeyboardNav(
  mapRef: RefObject<MapRef | null>,
  mapLoaded: boolean,
): void {
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const keyboardWasEnabled = map.keyboard.isEnabled();
    map.keyboard.disable();

    const panDirs = new Set<GlobeNavPanDir>();
    let zoomDir: 1 | -1 | 0 = 0;
    let zoomShift = false;
    let rafId = 0;
    let lastTs = 0;

    const stopRaf = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      lastTs = 0;
    };

    const needsRaf = () => panDirs.size > 0 || zoomDir !== 0;

    const tick = (ts: number) => {
      rafId = requestAnimationFrame(tick);
      if (!lastTs) {
        lastTs = ts;
        return;
      }
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (shouldIgnoreGlobeKeyboardNav(document.activeElement, document.activeElement)) {
        return;
      }

      if (panDirs.size > 0) {
        const delta = panDeltaForDirs(panDirs, dt);
        if (delta) {
          try {
            map.panBy([delta.dx, delta.dy], { animate: false });
          } catch {
            /* map mid-style reload */
          }
        }
      }

      if (zoomDir !== 0) {
        const rate = zoomShift
          ? GLOBE_KEYBOARD_ZOOM_PER_SEC_SHIFT
          : GLOBE_KEYBOARD_ZOOM_PER_SEC;
        try {
          const next = map.getZoom() + zoomDir * rate * Math.min(0.05, Math.max(0, dt));
          map.jumpTo({ zoom: next });
        } catch {
          /* ignore */
        }
      }

      if (!needsRaf()) stopRaf();
    };

    const ensureRaf = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onKeyDown = (event: KeyboardEvent) => {
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
      if (keyboardWasEnabled) {
        try {
          map.keyboard.enable();
        } catch {
          /* unmounted */
        }
      }
    };
  }, [mapLoaded, mapRef]);
}
