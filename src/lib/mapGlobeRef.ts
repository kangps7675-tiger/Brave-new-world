import type { Map as MapLibreMap } from "maplibre-gl";
import type { MutableRefObject, RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { clampGlobeAltitude, MIN_GLOBE_ALTITUDE } from "@/lib/globeCamera";
import {
  altitudeToMapLibreZoom,
  globeViewToMapLibre,
  mapLibreZoomToAltitude,
} from "@/lib/mapLibreBasemap";

export type GlobePointOfView = {
  lat: number;
  lng: number;
  altitude: number;
  /** MapLibre pitch (degrees). Omitted → 0 / keep current on read. */
  pitch?: number;
  /** MapLibre bearing (degrees). */
  bearing?: number;
};

export type MapGlobeControls = {
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  enableZoom: boolean;
  enablePan: boolean;
  enableRotate: boolean;
  /** 자동 자전 jumpTo가 유발한 move 이벤트인지 (리스너가 무시할 때 사용) */
  readonly isAutoRotateFrame: boolean;
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
};

export type MapGlobeMethods = {
  pointOfView: (pov?: GlobePointOfView, durationMs?: number) => GlobePointOfView;
  toGlobeCoords: (x: number, y: number) => { lat: number; lng: number } | null;
  controls: () => MapGlobeControls;
  /** 맵 로드·스타일 교체 후 줌 한계·드래그 플래그 재적용 */
  applyControls: () => void;
  /** 원본 MapLibre 맵 인스턴스 */
  getMapLibreMap: () => MapLibreMap | null;
  renderer: () => { domElement: HTMLCanvasElement | null };
  /**
   * 지도 캔버스의 **현재 프레임 스냅샷**을 별도 canvas로 복사해 돌려준다.
   *
   * `preserveDrawingBuffer`는 매 프레임 백버퍼 복사를 강제해 WebGL 스왑
   * 최적화를 통째로 끄므로(내장 GPU에서 프레임 예산 20~40%), 상시 켜두지
   * 않는다. 대신 캡처가 필요한 순간에만 강제 리페인트를 걸고, **같은
   * 프레임의 render 콜백 안에서** drawImage로 읽어낸다.
   * (render 콜백을 벗어나면 브라우저가 백버퍼를 비워 빈 화면이 된다.)
   */
  captureFrame: () => Promise<HTMLCanvasElement | null>;
  /** 언마운트 시 RAF·pointer 리스너 해제 */
  dispose: () => void;
};

type ChangeListener = () => void;

type ControlState = {
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  enableZoom: boolean;
  enablePan: boolean;
  enableRotate: boolean;
};

function distanceToAltitude(distance: number): number {
  if (!Number.isFinite(distance) || distance <= 0) return MIN_GLOBE_ALTITUDE;
  return clampGlobeAltitude(distance / 100 - 1);
}

/** OrbitControls 0.18 ≈ 은은한 속도 → 경도 °/초 */
function degPerSecFromSpeed(speed: number): number {
  return Math.max(0.15, speed * 4.5);
}

export function createMapGlobeMethods(
  mapRef: RefObject<MapRef | null>,
  changeListenersRef: MutableRefObject<Set<ChangeListener>>,
): MapGlobeMethods {
  const controlState: ControlState = {
    enableDamping: true,
    dampingFactor: 0.08,
    minDistance: 0,
    maxDistance: 850,
    autoRotate: false,
    autoRotateSpeed: 0.18,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
  };

  let autoRotateRaf: number | null = null;
  let lastAutoRotateTs = 0;
  let inAutoRotateFrame = false;
  let userPointerDown = false;
  let interactionBound = false;
  let interactionCanvas: HTMLCanvasElement | null = null;
  let interactionMap: MapLibreMap | null = null;
  let onPointerDown: (() => void) | null = null;
  let onPointerUp: (() => void) | null = null;

  /** setMin/MaxZoom 동일값 재적용은 MapLibre move를 유발해 드래그 중 change 루프를 만들 수 있음 */
  let lastAppliedMinZoom: number | null = null;
  let lastAppliedMaxZoom: number | null = null;

  const applyInteractionFlags = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (controlState.enableZoom) {
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.touchZoomRotate.enable();
    } else {
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.touchZoomRotate.disable();
    }

    if (controlState.enablePan) {
      map.dragPan.enable();
    } else {
      map.dragPan.disable();
    }

    if (controlState.enableRotate) {
      map.dragRotate.enable();
      map.touchPitch.enable();
      if (controlState.enableZoom) {
        map.touchZoomRotate.enableRotation();
      }
    } else {
      map.dragRotate.disable();
      map.touchPitch.disable();
      try {
        map.touchZoomRotate.disableRotation();
      } catch {
        /* map not ready for touch handler */
      }
    }

    // distance ↔ altitude ↔ MapLibre zoom (줌아웃 상한 = minZoom)
    const maxAlt = distanceToAltitude(controlState.maxDistance);
    const minAlt =
      controlState.minDistance > 0
        ? distanceToAltitude(controlState.minDistance)
        : MIN_GLOBE_ALTITUDE;
    const nextMinZoom = altitudeToMapLibreZoom(maxAlt);
    const nextMaxZoom = altitudeToMapLibreZoom(minAlt);
    if (lastAppliedMinZoom !== nextMinZoom) {
      lastAppliedMinZoom = nextMinZoom;
      map.setMinZoom(nextMinZoom);
    }
    if (lastAppliedMaxZoom !== nextMaxZoom) {
      lastAppliedMaxZoom = nextMaxZoom;
      map.setMaxZoom(nextMaxZoom);
    }
  };

  /** 스타일 리로드 후 줌 한계를 다시 심도록 캐시 무효화 */
  const invalidateZoomLimitCache = () => {
    lastAppliedMinZoom = null;
    lastAppliedMaxZoom = null;
  };

  const unbindInteractionPause = () => {
    if (!interactionBound) return;
    if (interactionCanvas && onPointerDown) {
      interactionCanvas.removeEventListener("pointerdown", onPointerDown);
    }
    if (onPointerUp) {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }
    if (interactionMap && onPointerDown && onPointerUp) {
      interactionMap.off("dragstart", onPointerDown);
      interactionMap.off("dragend", onPointerUp);
    }
    interactionBound = false;
    interactionCanvas = null;
    interactionMap = null;
    onPointerDown = null;
    onPointerUp = null;
    userPointerDown = false;
  };

  const bindInteractionPause = () => {
    if (interactionBound) return;
    const map = mapRef.current?.getMap();
    const canvas = map?.getCanvas();
    if (!map || !canvas) return;
    interactionBound = true;
    interactionCanvas = canvas;
    interactionMap = map;

    onPointerDown = () => {
      userPointerDown = true;
    };
    onPointerUp = () => {
      userPointerDown = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    map.on("dragstart", onPointerDown);
    map.on("dragend", onPointerUp);
  };

  const stopAutoRotateLoop = () => {
    if (autoRotateRaf != null) {
      window.cancelAnimationFrame(autoRotateRaf);
      autoRotateRaf = null;
    }
    lastAutoRotateTs = 0;
  };

  const ensureAutoRotateLoop = () => {
    bindInteractionPause();
    if (autoRotateRaf != null) return;

    const step = (now: number) => {
      autoRotateRaf = window.requestAnimationFrame(step);
      if (!controlState.autoRotate) {
        lastAutoRotateTs = 0;
        return;
      }
      const map = mapRef.current?.getMap();
      if (!map || userPointerDown) {
        lastAutoRotateTs = 0;
        return;
      }

      const dt = lastAutoRotateTs ? Math.min(0.05, (now - lastAutoRotateTs) / 1000) : 0;
      lastAutoRotateTs = now;
      if (dt <= 0) return;

      const c = map.getCenter();
      let nextLng = c.lng + degPerSecFromSpeed(controlState.autoRotateSpeed) * dt;
      if (nextLng > 180) nextLng -= 360;
      if (nextLng < -180) nextLng += 360;

      inAutoRotateFrame = true;
      try {
        map.jumpTo({ center: [nextLng, c.lat] });
      } finally {
        // react-map-gl onMove가 동기/다음 틱에 올 수 있어 한 프레임 유지
        window.requestAnimationFrame(() => {
          inAutoRotateFrame = false;
        });
      }
    };

    autoRotateRaf = window.requestAnimationFrame(step);
  };

  const controlsProxy: MapGlobeControls = {
    get enableDamping() {
      return controlState.enableDamping;
    },
    set enableDamping(v: boolean) {
      controlState.enableDamping = v;
    },
    get dampingFactor() {
      return controlState.dampingFactor;
    },
    set dampingFactor(v: number) {
      controlState.dampingFactor = v;
    },
    get minDistance() {
      return controlState.minDistance;
    },
    set minDistance(v: number) {
      controlState.minDistance = v;
      applyInteractionFlags();
    },
    get maxDistance() {
      return controlState.maxDistance;
    },
    set maxDistance(v: number) {
      controlState.maxDistance = v;
      applyInteractionFlags();
    },
    get autoRotate() {
      return controlState.autoRotate;
    },
    set autoRotate(v: boolean) {
      controlState.autoRotate = v;
      if (v) ensureAutoRotateLoop();
      else stopAutoRotateLoop();
    },
    get autoRotateSpeed() {
      return controlState.autoRotateSpeed;
    },
    set autoRotateSpeed(v: number) {
      controlState.autoRotateSpeed = v;
    },
    get isAutoRotateFrame() {
      return inAutoRotateFrame;
    },
    get enableZoom() {
      return controlState.enableZoom;
    },
    set enableZoom(v: boolean) {
      controlState.enableZoom = v;
      applyInteractionFlags();
    },
    get enablePan() {
      return controlState.enablePan;
    },
    set enablePan(v: boolean) {
      controlState.enablePan = v;
      applyInteractionFlags();
    },
    get enableRotate() {
      return controlState.enableRotate;
    },
    set enableRotate(v: boolean) {
      controlState.enableRotate = v;
      applyInteractionFlags();
    },
    addEventListener(type, listener) {
      if (type === "change") changeListenersRef.current.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") changeListenersRef.current.delete(listener);
    },
  };

  const readPov = (): GlobePointOfView => {
    const map = mapRef.current?.getMap();
    if (!map) return { lat: 25, lng: 105, altitude: 2.25 };
    const center = map.getCenter();
    return {
      lat: center.lat,
      lng: center.lng,
      altitude: mapLibreZoomToAltitude(map.getZoom()),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    };
  };

  return {
    pointOfView(pov, durationMs = 0) {
      const map = mapRef.current?.getMap();
      if (!map) return readPov();

      if (!pov) return readPov();

      const alt = clampGlobeAltitude(pov.altitude);
      const camera = globeViewToMapLibre({
        lat: pov.lat,
        lng: pov.lng,
        altitude: alt,
        pitch: pov.pitch,
        bearing: pov.bearing,
      });

      if (durationMs > 0) {
        map.easeTo({
          center: [camera.longitude, camera.latitude],
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
          duration: durationMs,
        });
      } else {
        map.jumpTo({
          center: [camera.longitude, camera.latitude],
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
        });
      }

      return {
        lat: pov.lat,
        lng: pov.lng,
        altitude: alt,
        pitch: camera.pitch,
        bearing: camera.bearing,
      };
    },

    toGlobeCoords(x, y) {
      const map = mapRef.current?.getMap();
      if (!map) return null;
      const lngLat = map.unproject([x, y]);
      if (!Number.isFinite(lngLat.lat) || !Number.isFinite(lngLat.lng)) return null;
      return { lat: lngLat.lat, lng: lngLat.lng };
    },

    controls() {
      // 매 프레임 apply 금지 — handleMove가 isAutoRotateFrame 조회만 해도
      // setMin/MaxZoom → move → change 재진입이 났다 (React #185).
      return controlsProxy;
    },

    /** 맵 로드·스타일 교체 후 줌/드래그 플래그 재적용 */
    applyControls() {
      invalidateZoomLimitCache();
      applyInteractionFlags();
    },

    getMapLibreMap() {
      return mapRef.current?.getMap() ?? null;
    },

    renderer() {
      const canvas = mapRef.current?.getCanvas() ?? null;
      return { domElement: canvas };
    },

    captureFrame() {
      const map = mapRef.current?.getMap();
      const source = mapRef.current?.getCanvas() ?? null;
      if (!map || !source || !source.width || !source.height) {
        return Promise.resolve(null);
      }

      return new Promise<HTMLCanvasElement | null>((resolve) => {
        let settled = false;

        const finish = (result: HTMLCanvasElement | null) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          map.off("render", onRender);
          resolve(result);
        };

        const onRender = () => {
          // 이 콜백은 draw 직후·버퍼 클리어 이전에 불린다 — 여기서만 읽을 수 있다.
          try {
            const out = document.createElement("canvas");
            out.width = source.width;
            out.height = source.height;
            const ctx = out.getContext("2d");
            if (!ctx) {
              finish(null);
              return;
            }
            ctx.drawImage(source, 0, 0);
            finish(out);
          } catch {
            finish(null);
          }
        };

        // render가 영영 안 오는 경우(탭 백그라운드 등) 무한 대기 방지
        const timeout = window.setTimeout(() => finish(null), 2_000);

        map.on("render", onRender);
        map.triggerRepaint();
      });
    },

    dispose() {
      controlState.autoRotate = false;
      stopAutoRotateLoop();
      unbindInteractionPause();
      changeListenersRef.current.clear();
    },
  };
}
