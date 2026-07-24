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
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
};

export type MapGlobeMethods = {
  pointOfView: (pov?: GlobePointOfView, durationMs?: number) => GlobePointOfView;
  toGlobeCoords: (x: number, y: number) => { lat: number; lng: number } | null;
  controls: () => MapGlobeControls;
  renderer: () => { domElement: HTMLCanvasElement | null };
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

export function createMapGlobeMethods(
  mapRef: RefObject<MapRef | null>,
  changeListenersRef: MutableRefObject<Set<ChangeListener>>,
): MapGlobeMethods {
  const controlState: ControlState = {
    enableDamping: true,
    dampingFactor: 0.08,
    minDistance: 0,
    maxDistance: 720,
    autoRotate: false,
    autoRotateSpeed: 0.18,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
  };

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
    map.setMinZoom(altitudeToMapLibreZoom(maxAlt));
    map.setMaxZoom(altitudeToMapLibreZoom(minAlt));
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
    },
    get autoRotateSpeed() {
      return controlState.autoRotateSpeed;
    },
    set autoRotateSpeed(v: number) {
      controlState.autoRotateSpeed = v;
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
      applyInteractionFlags();
      return controlsProxy;
    },

    renderer() {
      const canvas = mapRef.current?.getCanvas() ?? null;
      return { domElement: canvas };
    },
  };
}
