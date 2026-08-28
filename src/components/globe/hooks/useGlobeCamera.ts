"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";
import type { NavSelection, RegionBBox } from "@/data/navRegions";
import type { GlobeSize, ViewState } from "@/components/globe/types";
import { ENTRY_GATE } from "@/lib/entryOverview";
import {
  clampGlobeAltitude,
  globeDistanceForAltitude,
  MIN_GLOBE_ALTITUDE,
  COMPACT_THEATER_MAX_SPAN_DEG,
  ORBITAL_OVERVIEW_ALTITUDE,
  THEATER_ENTRY_MIN_ALTITUDE,
} from "@/lib/globeCamera";
import {
  HISTORY_IMMERSION_MAX_ALTITUDE,
  LAYER_ALTITUDE_SYNC_MIN_DELTA,
  MOVING_IDLE_DELAY_MS,
  REGION_FIT_PADDING,
  REGION_MAX_ALTITUDE,
  REGION_MIN_ALTITUDE,
  REGION_MIN_SPAN_DEG,
} from "@/components/globe/constants";
import { CAMERA_IDLE_DEBOUNCE_MS } from "@/lib/globePerformance";
import {
  cameraBusyUntilAfterFly,
  cameraFlyBusyMs,
  cameraIdleClearBlocked,
} from "@/lib/cameraBusyGuard";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import { getStableLodTier } from "@/components/globe/htmlOverlayPointerEvents";
import { clamp, longitudeDistance } from "@/components/globe/formatters";
import { isInUkraineTheater } from "@/lib/ukraineSettlementLabels";

export interface UseGlobeCameraOptions {
  globeRef: RefObject<MapGlobeMethods | null>;
  size: GlobeSize;
  globeReady: boolean;
  setGlobeReady: (v: boolean) => void;
  globeSpinEnabled: boolean;
  globeSpinEnabledRef: MutableRefObject<boolean>;
  historyImmersionRef: MutableRefObject<boolean>;
  historyImmersionActive: boolean;
  historyEpisodeActive: boolean;
}

export interface UseGlobeCameraResult {
  configuredGlobe: MutableRefObject<boolean>;
  lastViewUpdateAt: MutableRefObject<number>;
  lastFilterCenterUpdateAt: MutableRefObject<number>;
  layerCenterRef: MutableRefObject<{ lat: number; lng: number }>;
  layerAltitudeRef: MutableRefObject<number>;
  layerLodTierRef: MutableRefObject<GlobeLodTier>;
  moveIdleTimerRef: MutableRefObject<number | null>;
  renderStabilizeIdleRef: MutableRefObject<number | null>;
  isCameraMovingRef: MutableRefObject<boolean>;
  cameraTweenUntilRef: MutableRefObject<number>;
  flyBusyTimerRef: MutableRefObject<number | null>;
  viewState: ViewState;
  setViewState: Dispatch<SetStateAction<ViewState>>;
  filterCenter: { lat: number; lng: number };
  setFilterCenter: Dispatch<SetStateAction<{ lat: number; lng: number }>>;
  layerAltitude: number;
  setLayerAltitude: Dispatch<SetStateAction<number>>;
  isCameraMoving: boolean;
  setIsCameraMoving: Dispatch<SetStateAction<boolean>>;
  configureGlobe: () => void;
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: { pitch?: number; bearing?: number },
  ) => void;
  /** P3-4: 진행 중 fly를 목적지 스냅 */
  interruptFlySnap: () => void;
  computeRegionFitAltitude: (bbox: RegionBBox, fallbackAltitude: number) => number;
  flyToBounds: (
    selection: NavSelection,
    durationMs?: number,
    mode?: "overview" | "detail",
    camera?: { pitch?: number; bearing?: number },
  ) => void;
}

/** 지구본 카메라 상태·flyTo·회전/몰입 동기화 — GlobeDashboard에서 추출 */
export function useGlobeCamera({
  globeRef,
  size,
  globeReady,
  setGlobeReady,
  globeSpinEnabled,
  globeSpinEnabledRef,
  historyImmersionRef,
  historyImmersionActive,
  historyEpisodeActive,
}: UseGlobeCameraOptions): UseGlobeCameraResult {
  const configuredGlobe = useRef(false);
  const lastViewUpdateAt = useRef(0);
  const lastFilterCenterUpdateAt = useRef(0);
  const layerCenterRef = useRef<{ lat: number; lng: number }>({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
  });
  const layerAltitudeRef: { current: number } = useRef(ENTRY_GATE.bootAltitude);
  const layerLodTierRef = useRef<GlobeLodTier>("global");
  const moveIdleTimerRef = useRef<number | null>(null);
  const renderStabilizeIdleRef = useRef<number | null>(null);
  const isCameraMovingRef = useRef(false);
  /** flyTo tween 강제 busy 창 — idle debounce가 중간에 moving을 끄지 못하게 */
  const cameraTweenUntilRef = useRef(0);
  const flyBusyTimerRef = useRef<number | null>(null);
  /** P3-4: mid-flight 개입 시 스냅할 목적지 */
  const pendingFlyTargetRef = useRef<{
    lat: number;
    lng: number;
    altitude: number;
    pitch?: number;
    bearing?: number;
  } | null>(null);

  const [viewState, setViewState] = useState<ViewState>({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
    altitude: ENTRY_GATE.bootAltitude,
  });
  const [filterCenter, setFilterCenter] = useState<{ lat: number; lng: number }>({
    lat: ENTRY_GATE.bootLookAt.lat,
    lng: ENTRY_GATE.bootLookAt.lng,
  });
  const [layerAltitude, setLayerAltitude] = useState<number>(ENTRY_GATE.bootAltitude);
  const [isCameraMoving, setIsCameraMoving] = useState(false);

  useEffect(() => {
    return () => {
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
        moveIdleTimerRef.current = null;
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
        renderStabilizeIdleRef.current = null;
      }
    };
  }, []);

  function configureGlobe() {
    if (configuredGlobe.current) return;
    const globe = globeRef.current;
    if (!globe) return;

    configuredGlobe.current = true;
    // 로딩 시점부터 줌아웃된 궤도 (ENTRY_GATE 하드코딩)
    globe.pointOfView(
      {
        lat: ENTRY_GATE.bootLookAt.lat,
        lng: ENTRY_GATE.bootLookAt.lng,
        altitude: ENTRY_GATE.bootAltitude,
        pitch: ENTRY_GATE.bootPitch,
      },
      0,
    );
    setGlobeReady(true);

    const controls = globe.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = globeDistanceForAltitude(MIN_GLOBE_ALTITUDE);
    controls.maxDistance = 850;
    controls.autoRotateSpeed = 0.18;
    controls.autoRotate = globeSpinEnabledRef.current;
    // controls()는 더 이상 apply하지 않음 — 로드 직후 한계를 한 번 더 심는다
    globe.applyControls();

    const syncViewState = () => {
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      if (!isCameraMovingRef.current) {
        isCameraMovingRef.current = true;
        setIsCameraMoving(true);
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
      }
      renderStabilizeIdleRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        isCameraMovingRef.current = false;
        setIsCameraMoving(false);
      }, MOVING_IDLE_DELAY_MS);

      const pov = globe.pointOfView();

      // zoom↔altitude 양자화 오차(~0.02)보다 클 때만 클램프 — 매 프레임 jumpTo 핑퐁 방지
      const ALT_CLAMP_SLACK = 0.025;
      if (pov.altitude < MIN_GLOBE_ALTITUDE - ALT_CLAMP_SLACK) {
        globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: MIN_GLOBE_ALTITUDE }, 0);
      } else if (
        historyImmersionRef.current &&
        pov.altitude > HISTORY_IMMERSION_MAX_ALTITUDE + ALT_CLAMP_SLACK
      ) {
        globe.pointOfView(
          { lat: pov.lat, lng: pov.lng, altitude: HISTORY_IMMERSION_MAX_ALTITUDE },
          0,
        );
      }

      // 드래그 중 setViewState 금지 — 대시보드 전체 리렌더가 프레임을 갉아먹음 (idle에서만 반영)
      lastViewUpdateAt.current = Date.now();

      moveIdleTimerRef.current = window.setTimeout(() => {
        if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
        const idlePov = globe.pointOfView();
        // 티어는 히스테리시스로만 안정화. 고도는 실제 카메라값 유지(앵커 스냅 금지).
        // 티어가 바뀔 때는 delta가 작아도 altitude를 동기화해 레이어가 한 박자 늦게 남는 걸 막음.
        const nextTier = getStableLodTier(layerLodTierRef.current, idlePov.altitude);
        const tierChanged = nextTier !== layerLodTierRef.current;
        layerLodTierRef.current = nextTier;

        if (
          tierChanged ||
          Math.abs(idlePov.altitude - layerAltitudeRef.current) >= LAYER_ALTITUDE_SYNC_MIN_DELTA
        ) {
          layerAltitudeRef.current = idlePov.altitude;
          setLayerAltitude(idlePov.altitude);
        }

        const prevCenter = layerCenterRef.current;
        const centerMoved =
          Math.abs(idlePov.lat - prevCenter.lat) >= 0.01 ||
          Math.abs(idlePov.lng - prevCenter.lng) >= 0.01;
        if (centerMoved) {
          const nextCenter = { lat: idlePov.lat, lng: idlePov.lng };
          lastFilterCenterUpdateAt.current = Date.now();
          layerCenterRef.current = nextCenter;
          setFilterCenter(nextCenter);
        }

        setViewState((prev) => {
          if (
            Math.abs(prev.lat - idlePov.lat) < 0.01 &&
            Math.abs(prev.lng - idlePov.lng) < 0.01 &&
            Math.abs(prev.altitude - idlePov.altitude) < LAYER_ALTITUDE_SYNC_MIN_DELTA
          ) {
            return prev;
          }
          return {
            lat: idlePov.lat,
            lng: idlePov.lng,
            altitude: idlePov.altitude,
          };
        });
      }, MOVING_IDLE_DELAY_MS);
    };

    controls.addEventListener("change", syncViewState);
    syncViewState();
  }

  const flyTo = useCallback(
    (
      lat: number,
      lng: number,
      altitude = 1.18,
      durationMs = 850,
      camera?: { pitch?: number; bearing?: number },
    ) => {
      const clampedAlt = clampGlobeAltitude(altitude);
      const controls = globeRef.current?.controls();
      if (controls) controls.autoRotate = false;

      pendingFlyTargetRef.current = {
        lat,
        lng,
        altitude: clampedAlt,
        pitch: camera?.pitch,
        bearing: camera?.bearing,
      };

      const busyMs = cameraFlyBusyMs(durationMs);
      cameraTweenUntilRef.current = cameraBusyUntilAfterFly(durationMs);
      isCameraMovingRef.current = true;
      setIsCameraMoving(true);

      if (flyBusyTimerRef.current != null) {
        window.clearTimeout(flyBusyTimerRef.current);
      }
      if (renderStabilizeIdleRef.current != null) {
        window.clearTimeout(renderStabilizeIdleRef.current);
        renderStabilizeIdleRef.current = null;
      }

      globeRef.current?.pointOfView(
        {
          lat,
          lng,
          altitude: clampedAlt,
          pitch: camera?.pitch,
          bearing: camera?.bearing,
        },
        durationMs,
      );

      flyBusyTimerRef.current = window.setTimeout(() => {
        flyBusyTimerRef.current = null;
        cameraTweenUntilRef.current = 0;
        pendingFlyTargetRef.current = null;
        const pov = globeRef.current?.pointOfView();
        if (!pov) {
          isCameraMovingRef.current = false;
          setIsCameraMoving(false);
          if (globeSpinEnabledRef.current) {
            const c = globeRef.current?.controls();
            if (c) c.autoRotate = true;
          }
          return;
        }
        const nextAlt = clampGlobeAltitude(pov.altitude);
        // fly 완료 시 한 번에 LOD·뷰 반영 (tween 중 프레임 업데이트 없음)
        setViewState({
          lat: pov.lat,
          lng: pov.lng,
          altitude: nextAlt,
        });
        layerCenterRef.current = { lat: pov.lat, lng: pov.lng };
        layerAltitudeRef.current = nextAlt;
        layerLodTierRef.current = getGlobeLod(nextAlt).tier;
        setLayerAltitude(nextAlt);
        setFilterCenter({ lat: pov.lat, lng: pov.lng });
        renderStabilizeIdleRef.current = window.setTimeout(() => {
          if (cameraIdleClearBlocked(Date.now(), cameraTweenUntilRef.current)) return;
          isCameraMovingRef.current = false;
          setIsCameraMoving(false);
          if (globeSpinEnabledRef.current) {
            const c = globeRef.current?.controls();
            if (c) c.autoRotate = true;
          }
        }, CAMERA_IDLE_DEBOUNCE_MS);
      }, busyMs);
    },
    [],
  );

  /**
   * P3-4: 사용자 드래그·클릭 시 진행 중 fly를 목적지 스냅으로 끊는다.
   */
  const interruptFlySnap = useCallback(() => {
    const pending = pendingFlyTargetRef.current;
    if (!pending || !isCameraMovingRef.current) return;
    if (flyBusyTimerRef.current != null) {
      window.clearTimeout(flyBusyTimerRef.current);
      flyBusyTimerRef.current = null;
    }
    flyTo(pending.lat, pending.lng, pending.altitude, 0, {
      pitch: pending.pitch,
      bearing: pending.bearing,
    });
  }, [flyTo]);

  /** 지도 조작이 오면 intro/auto fly를 목적지 스냅 (P3-4) */
  useEffect(() => {
    if (!isCameraMoving) return;
    const onIntervene = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        !target.closest(
          "canvas.maplibregl-canvas, .maplibregl-map, .maplibregl-canvas-container, [data-globe-shell]",
        )
      ) {
        return;
      }
      interruptFlySnap();
    };
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener("pointerdown", onIntervene, opts);
    document.addEventListener("wheel", onIntervene, opts);
    document.addEventListener("touchstart", onIntervene, opts);
    return () => {
      document.removeEventListener("pointerdown", onIntervene, opts);
      document.removeEventListener("wheel", onIntervene, opts);
      document.removeEventListener("touchstart", onIntervene, opts);
    };
  }, [interruptFlySnap, isCameraMoving]);

  const computeRegionFitAltitude = useCallback(
    (bbox: RegionBBox, fallbackAltitude: number) => {
      const latSpan = Math.max(REGION_MIN_SPAN_DEG, (bbox.maxLat - bbox.minLat) * REGION_FIT_PADDING);
      const lngSpan = Math.max(REGION_MIN_SPAN_DEG, longitudeDistance(bbox.minLng, bbox.maxLng) * REGION_FIT_PADDING);
      const aspect = Math.max(0.75, size.width / Math.max(1, size.height));
      const dominantSpan = Math.max(latSpan, lngSpan / aspect);
      // 넓은 전장(중동급)일수록 ISS급 원거리에 가깝게 — 타이트 줌인 방지
      const fittedAltitude =
        dominantSpan <= 8
          ? 0.72 + dominantSpan * 0.08
          : dominantSpan <= 24
            ? 1.35 + (dominantSpan - 8) * 0.028
            : Math.min(ORBITAL_OVERVIEW_ALTITUDE + 0.15, 1.55 + (dominantSpan - 24) * 0.012);
      const seededAltitude = fittedAltitude * 0.72 + fallbackAltitude * 0.28;
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;
      const centerLng = (bbox.minLng + bbox.maxLng) / 2;
      const minAltitude =
        isInUkraineTheater(centerLat, centerLng) ? MIN_GLOBE_ALTITUDE : REGION_MIN_ALTITUDE;
      return clamp(seededAltitude, minAltitude, REGION_MAX_ALTITUDE);
    },
    [size.height, size.width],
  );

  const flyToBounds = useCallback(
    (
      selection: NavSelection,
      durationMs = 850,
      mode: "overview" | "detail" = "overview",
      camera?: { pitch?: number; bearing?: number },
    ) => {
      const targetLat = (selection.bbox.minLat + selection.bbox.maxLat) / 2;
      const targetLng = (selection.bbox.minLng + selection.bbox.maxLng) / 2;
      const fittedAltitude = computeRegionFitAltitude(selection.bbox, selection.altitude);
      const latSpan = Math.max(0.1, selection.bbox.maxLat - selection.bbox.minLat);
      const lngSpan = Math.max(0.1, longitudeDistance(selection.bbox.minLng, selection.bbox.maxLng));
      const spanDeg = Math.max(latSpan, lngSpan);
      const isCompactTheater = spanDeg <= COMPACT_THEATER_MAX_SPAN_DEG;

      let targetAltitude: number;
      if (mode === "detail") {
        targetAltitude = fittedAltitude;
      } else if (isCompactTheater) {
        // 한반도·대만급: 궤도 하한 없이 작성 고도 위주로 화면을 채움
        targetAltitude = clamp(
          selection.altitude * 0.82 + fittedAltitude * 0.18,
          REGION_MIN_ALTITUDE,
          1.2,
        );
      } else {
        // 중동·우크라 전역 등 넓은 전장만 ISS급 하한 유지
        targetAltitude = Math.max(
          fittedAltitude,
          selection.altitude,
          THEATER_ENTRY_MIN_ALTITUDE,
          ORBITAL_OVERVIEW_ALTITUDE * 0.92,
        );
      }
      flyTo(targetLat, targetLng, targetAltitude, durationMs, camera);
    },
    [computeRegionFitAltitude, flyTo],
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;
    const controls = globe.controls();
    if (!controls) return;
    if (historyImmersionActive) {
      // 분쟁사: 줌아웃으로 창 탈출 불가 — 궤도 상한. 에피소드 중엔 회전도 잠금
      controls.maxDistance = globeDistanceForAltitude(HISTORY_IMMERSION_MAX_ALTITUDE);
      controls.enableZoom = true;
      controls.enablePan = !historyEpisodeActive;
      controls.enableRotate = !historyEpisodeActive;
      controls.autoRotate = false;
      const pov = globe.pointOfView();
      if (pov.altitude > HISTORY_IMMERSION_MAX_ALTITUDE + 0.025) {
        globe.pointOfView(
          { lat: pov.lat, lng: pov.lng, altitude: HISTORY_IMMERSION_MAX_ALTITUDE },
          400,
        );
      }
    } else {
      controls.maxDistance = 720;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.autoRotate = globeSpinEnabled;
    }
  }, [globeReady, globeSpinEnabled, historyEpisodeActive, historyImmersionActive]);

  useEffect(() => {
    globeSpinEnabledRef.current = globeSpinEnabled;
  }, [globeSpinEnabled]);

  /** 자전 중에도 뷰포트 필터가 너무 오래 굳지 않게 가끔 중심만 동기화 */
  useEffect(() => {
    if (!globeReady || !globeSpinEnabled) return;
    const id = window.setInterval(() => {
      const pov = globeRef.current?.pointOfView();
      if (!pov) return;
      const prev = layerCenterRef.current;
      if (Math.abs(pov.lat - prev.lat) < 0.05 && Math.abs(pov.lng - prev.lng) < 0.05) {
        return;
      }
      layerCenterRef.current = { lat: pov.lat, lng: pov.lng };
      setFilterCenter({ lat: pov.lat, lng: pov.lng });
    }, 2800);
    return () => window.clearInterval(id);
  }, [globeReady, globeSpinEnabled]);

  return {
    configuredGlobe,
    lastViewUpdateAt,
    lastFilterCenterUpdateAt,
    layerCenterRef,
    layerAltitudeRef,
    layerLodTierRef,
    moveIdleTimerRef,
    renderStabilizeIdleRef,
    isCameraMovingRef,
    cameraTweenUntilRef,
    flyBusyTimerRef,
    viewState,
    setViewState,
    filterCenter,
    setFilterCenter,
    layerAltitude,
    setLayerAltitude,
    isCameraMoving,
    setIsCameraMoving,
    configureGlobe,
    flyTo,
    interruptFlySnap,
    computeRegionFitAltitude,
    flyToBounds,
  };
}
