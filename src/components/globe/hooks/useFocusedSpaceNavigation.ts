"use client";

import { useCallback, useEffect, type MutableRefObject, type RefObject } from "react";
import type { CesiumGlobeHandle } from "@/components/globe/CesiumSatelliteGlobe";
import type { Selection } from "@/components/globe/types";
import type { FlyToConfirmOffer } from "@/components/FlyToConfirmBanner";
import {
  PIPELINE_REVEAL_MS,
  PIPELINE_REVEAL_ON,
  pipelineRevealRestorePatch,
  snapshotPipelinePrefs,
  type PipelineRevealSnap,
} from "@/lib/flashPipelineReveal";
import {
  CINEMATIC_FLY,
  resolveCinematicCamera,
  resolveCinematicDurationMs,
  type FlyCameraOpts,
} from "@/lib/globeCamera";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import {
  gradeLabelFriendly,
  watchboardItemToDeskFocus,
  type DeskFocus,
  type DisplayGrade,
  type WatchboardItem,
} from "@/lib/intelContract";
import { isPromotion } from "@/lib/intelContract/deskDynamics";
import { canMountFullObserve } from "@/lib/observeAccess";
import type { ViewerMode } from "@/lib/viewPackages";

/** 속보·핀 시네마틱 진입 기본 고도 */
export const INCIDENT_ENTRY_ALT = 0.85;
/** 이 고도보다 먼 이동은 창으로 치지 않는다. 기본 fly(1.18)와 핀 줌은 포함한다. */
const CLOSE_LOOK_ALT = 1.28;

export type IncidentSpaceState = {
  title: string;
  kicker: string;
  ceilingAltitude: number;
  returnTo: { lat: number; lng: number; altitude: number };
};

export type PendingObserveFly = {
  lat: number;
  lng: number;
  altitude?: number;
  durationMs?: number;
  camera?: FlyCameraOpts;
  subtitle: string;
  title: string;
  selection?: Selection;
};

export type UseFocusedSpaceNavigationOptions = {
  cesiumGlobeRef: RefObject<CesiumGlobeHandle | null>;
  viewState: { lat: number; lng: number; altitude: number };
  labelLanguage: LabelLanguage;
  viewerMode: ViewerMode;
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: { pitch?: number; bearing?: number },
  ) => void;

  incidentSpaceRef: MutableRefObject<IncidentSpaceState | null>;
  setIncidentSpace: (space: IncidentSpaceState | null) => void;
  focusAltitudeCeilingRef: MutableRefObject<number | null>;
  onCloseLookRef: MutableRefObject<
    | ((info: {
        lat: number;
        lng: number;
        altitude: number;
        pitch: number;
        bearing: number;
        durationMs: number;
        title?: string;
        kicker?: string;
      }) => void)
    | null
  >;

  historyStoryLockedRef: MutableRefObject<boolean>;
  historyRoomTargetRef: MutableRefObject<number | null>;

  layerPrefsLiveRef: { current: LayerPrefs };
  pipelineRevealSnapRef: MutableRefObject<PipelineRevealSnap | null>;
  pipelineRevealTimerRef: MutableRefObject<number | null>;
  patchLayerPrefsSoft: (patch: Partial<LayerPrefs>) => void;

  pendingObserveFlyRef: MutableRefObject<PendingObserveFly | null>;
  flyToConfirmOffer: FlyToConfirmOffer | null;
  setFlyToConfirmOffer: (offer: FlyToConfirmOffer | null) => void;

  setFocusedLiveuaId: (id: string | null) => void;
  setSelected: (sel: Selection | null) => void;
  setViewerMode: (mode: ViewerMode) => void;
  setObserveEntryHadTarget: (value: boolean) => void;
  observeUnlocked: boolean;
  startObservePreview: () => void;
  endObservePreview: () => void;

  watchGradePrevRef: MutableRefObject<Map<string, DisplayGrade>>;
  setDeskFocus: (focus: DeskFocus | null) => void;
  setPromotingItemId: (id: string | null) => void;
};

/**
 * 가까운 경사 시야(incident space) · 통합 fly · 관측 모드 전환 fly · 워치보드 포커스.
 * GlobeDashboard에서 추출 — 동작 변경 없음.
 */
export function useFocusedSpaceNavigation(opts: UseFocusedSpaceNavigationOptions) {
  const {
    cesiumGlobeRef,
    viewState,
    labelLanguage,
    viewerMode,
    flyTo,
    incidentSpaceRef,
    setIncidentSpace,
    focusAltitudeCeilingRef,
    onCloseLookRef,
    historyStoryLockedRef,
    historyRoomTargetRef,
    layerPrefsLiveRef,
    pipelineRevealSnapRef,
    pipelineRevealTimerRef,
    patchLayerPrefsSoft,
    pendingObserveFlyRef,
    flyToConfirmOffer,
    setFlyToConfirmOffer,
    setFocusedLiveuaId,
    setSelected,
    setViewerMode,
    setObserveEntryHadTarget,
    observeUnlocked,
    startObservePreview,
    endObservePreview,
    watchGradePrevRef,
    setDeskFocus,
    setPromotingItemId,
  } = opts;

  const incidentReturnView = useCallback(
    (lat: number, lng: number) => {
      const pov = cesiumGlobeRef.current?.pointOfView();
      if (pov && pov.altitude >= 1.8) {
        return {
          lat: pov.lat,
          lng: pov.lng,
          altitude: Math.min(pov.altitude, 7.2),
        };
      }
      if (viewState.altitude >= 1.8) {
        return {
          lat: viewState.lat,
          lng: viewState.lng,
          altitude: Math.min(viewState.altitude, 7.2),
        };
      }
      return { lat, lng, altitude: 2.6 };
    },
    [cesiumGlobeRef, viewState.altitude, viewState.lat, viewState.lng],
  );

  const enterFocusedSpace = useCallback(
    (info: {
      lat: number;
      lng: number;
      altitude: number;
      pitch: number;
      title?: string;
      kicker?: string;
    }) => {
      if (historyStoryLockedRef.current) {
        if (
          Number.isFinite(info.altitude) &&
          info.altitude <= CLOSE_LOOK_ALT &&
          info.pitch >= 36
        ) {
          historyRoomTargetRef.current = info.altitude;
        }
        return;
      }
      if (!Number.isFinite(info.altitude) || info.altitude > CLOSE_LOOK_ALT) return;
      if (info.pitch < 36) return;
      const ceiling = Math.min(CLOSE_LOOK_ALT, info.altitude + 0.12);
      const title =
        info.title?.trim() ||
        (labelLanguage === "en" ? "This place" : "이 위치");
      const kicker =
        info.kicker?.trim() ||
        (labelLanguage === "en" ? "This window" : "이 창");
      const prev = incidentSpaceRef.current;
      if (prev) {
        const next = {
          ...prev,
          title: info.title?.trim() || prev.title,
          kicker: info.kicker?.trim() || prev.kicker,
          ceilingAltitude: Math.min(prev.ceilingAltitude, ceiling),
        };
        if (
          next.title === prev.title &&
          next.kicker === prev.kicker &&
          next.ceilingAltitude === prev.ceilingAltitude
        ) {
          return;
        }
        incidentSpaceRef.current = next;
        setIncidentSpace(next);
        return;
      }
      const next = {
        title,
        kicker,
        ceilingAltitude: ceiling,
        returnTo: incidentReturnView(info.lat, info.lng),
      };
      incidentSpaceRef.current = next;
      setIncidentSpace(next);
    },
    [
      historyStoryLockedRef,
      historyRoomTargetRef,
      incidentReturnView,
      incidentSpaceRef,
      labelLanguage,
      setIncidentSpace,
    ],
  );

  onCloseLookRef.current = enterFocusedSpace;

  const leaveIncidentSpace = useCallback(() => {
    const space = incidentSpaceRef.current;
    if (!space) return;
    incidentSpaceRef.current = null;
    focusAltitudeCeilingRef.current = null;
    setIncidentSpace(null);
    setFocusedLiveuaId(null);
    if (viewerMode === "satellite") {
      const fly = cesiumGlobeRef.current?.flyTo;
      if (typeof fly === "function") {
        fly(space.returnTo.lat, space.returnTo.lng, space.returnTo.altitude, 2400, {
          pitch: 8,
          bearing: 0,
        });
      }
      return;
    }
    flyTo(space.returnTo.lat, space.returnTo.lng, space.returnTo.altitude, 2400, {
      pitch: 8,
      bearing: 0,
    });
  }, [
    cesiumGlobeRef,
    flyTo,
    focusAltitudeCeilingRef,
    incidentSpaceRef,
    setFocusedLiveuaId,
    setIncidentSpace,
    viewerMode,
  ]);

  const flushPendingCesiumFly = useCallback(() => {
    const pending = pendingObserveFlyRef.current;
    const handle = cesiumGlobeRef.current;
    // flyTo 함수가 있어도 viewer 부팅 전이면 pointOfView 가 null — 대기열을 유지한다.
    if (!pending || typeof handle?.flyTo !== "function" || !handle.pointOfView()) {
      return false;
    }
    pendingObserveFlyRef.current = null;
    handle.flyTo(
      pending.lat,
      pending.lng,
      pending.altitude,
      resolveCinematicDurationMs(pending.durationMs),
      resolveCinematicCamera(pending.camera),
    );
    if (pending.selection) setSelected(pending.selection);
    return true;
  }, [cesiumGlobeRef, pendingObserveFlyRef, setSelected]);

  const unifiedFlyTo = useCallback(
    (
      lat: number,
      lng: number,
      altitude?: number,
      durationMs?: number,
      camera?: FlyCameraOpts,
    ) => {
      const dur = resolveCinematicDurationMs(durationMs);
      const cam = resolveCinematicCamera(camera);
      if (dur > 0) {
        enterFocusedSpace({
          lat,
          lng,
          altitude: altitude ?? 1.18,
          pitch: cam.pitch,
        });
      }
      if (viewerMode === "satellite") {
        const handle = cesiumGlobeRef.current;
        if (typeof handle?.flyTo === "function" && handle.pointOfView()) {
          handle.flyTo(lat, lng, altitude, dur, cam);
          return;
        }
        pendingObserveFlyRef.current = {
          lat,
          lng,
          altitude,
          durationMs: dur,
          camera: cam,
          subtitle: "",
          title: "",
        };
        return;
      }
      flyTo(lat, lng, altitude, dur, cam);
    },
    [cesiumGlobeRef, enterFocusedSpace, flyTo, pendingObserveFlyRef, viewerMode],
  );

  /** 사건 포커스 시 송유·가스·해저관을 잠깐 켠다 (상시 난사 대신) */
  const revealIncidentEnergyPipelines = useCallback(() => {
    const live = layerPrefsLiveRef.current;
    if (!pipelineRevealSnapRef.current) {
      pipelineRevealSnapRef.current = snapshotPipelinePrefs(live);
    }
    patchLayerPrefsSoft({ ...PIPELINE_REVEAL_ON });
    if (pipelineRevealTimerRef.current != null) {
      window.clearTimeout(pipelineRevealTimerRef.current);
    }
    pipelineRevealTimerRef.current = window.setTimeout(() => {
      pipelineRevealTimerRef.current = null;
      const restore = pipelineRevealRestorePatch(pipelineRevealSnapRef.current);
      pipelineRevealSnapRef.current = null;
      if (Object.keys(restore).length > 0) {
        patchLayerPrefsSoft(restore);
      }
    }, PIPELINE_REVEAL_MS);
  }, [
    layerPrefsLiveRef,
    patchLayerPrefsSoft,
    pipelineRevealSnapRef,
    pipelineRevealTimerRef,
  ]);

  useEffect(() => {
    return () => {
      if (pipelineRevealTimerRef.current != null) {
        window.clearTimeout(pipelineRevealTimerRef.current);
      }
    };
  }, [pipelineRevealTimerRef]);

  /**
   * 속보·핀의 「위치로」— 관측이 아니면 모드를 바꾼 뒤, Cesium이 준비되는 즉시
   * 그 좌표로 날아간다. 확인 배너를 한 번 더 거치면 이동이 중간에 끊긴다.
   */
  const switchToObserveAndFly = useCallback(
    (
      lat: number,
      lng: number,
      opts: {
        altitude?: number;
        durationMs?: number;
        camera?: FlyCameraOpts;
        subtitle: string;
        title: string;
        kicker?: string;
        selection?: Selection;
      },
    ) => {
      enterFocusedSpace({
        lat,
        lng,
        altitude: opts.altitude ?? INCIDENT_ENTRY_ALT,
        pitch: resolveCinematicCamera(opts.camera).pitch,
        title: opts.title,
        kicker: opts.kicker,
      });
      pendingObserveFlyRef.current = {
        lat,
        lng,
        altitude: opts.altitude,
        durationMs: opts.durationMs,
        camera: opts.camera,
        subtitle: opts.subtitle,
        title: opts.title,
        selection: opts.selection,
      };
      setObserveEntryHadTarget(true);
      if (viewerMode !== "satellite") {
        if (!canMountFullObserve(observeUnlocked)) {
          startObservePreview();
        } else {
          endObservePreview();
        }
        setViewerMode("satellite");
        return;
      }
      flushPendingCesiumFly();
    },
    [
      endObservePreview,
      enterFocusedSpace,
      flushPendingCesiumFly,
      observeUnlocked,
      pendingObserveFlyRef,
      setObserveEntryHadTarget,
      setViewerMode,
      startObservePreview,
      viewerMode,
    ],
  );

  /** 워치보드 행 → DeskFocus + 시네마틱 진입 (왜? 드릴은 지구본 不动) */
  const focusWatchboardItem = useCallback(
    (item: WatchboardItem) => {
      const lang = labelLanguage === "en" ? "en" : "ko";
      const prev = watchGradePrevRef.current.get(item.id);
      const promote = isPromotion(prev, item.grade);
      const focus = watchboardItemToDeskFocus(item, lang, {
        promoteFromHold: promote,
      });
      if (!focus) return;
      setDeskFocus(focus);
      if (promote) {
        setPromotingItemId(item.id);
        window.setTimeout(() => setPromotingItemId(null), 1200);
      }
      watchGradePrevRef.current.set(item.id, item.grade);
      const gradeLabel = gradeLabelFriendly(focus.grade, labelLanguage);
      switchToObserveAndFly(focus.lat, focus.lng, {
        altitude: focus.altitude || INCIDENT_ENTRY_ALT,
        durationMs: CINEMATIC_FLY.durationMs,
        camera: resolveCinematicCamera(),
        subtitle: gradeLabel,
        title: focus.title,
        kicker: lang === "en" ? "Desk focus" : "안건 포커스",
      });
    },
    [
      labelLanguage,
      setDeskFocus,
      setPromotingItemId,
      switchToObserveAndFly,
      watchGradePrevRef,
    ],
  );

  const acceptFlyToConfirm = useCallback(() => {
    const offer = flyToConfirmOffer;
    const pending = pendingObserveFlyRef.current;
    setFlyToConfirmOffer(null);
    pendingObserveFlyRef.current = null;
    if (!offer) return;
    const cesiumFly = cesiumGlobeRef.current?.flyTo;
    if (typeof cesiumFly === "function") {
      cesiumFly(
        offer.lat,
        offer.lng,
        pending?.altitude,
        resolveCinematicDurationMs(pending?.durationMs),
        resolveCinematicCamera(pending?.camera),
      );
    }
    if (pending?.selection) setSelected(pending.selection);
  }, [
    cesiumGlobeRef,
    flyToConfirmOffer,
    pendingObserveFlyRef,
    setFlyToConfirmOffer,
    setSelected,
  ]);

  const dismissFlyToConfirm = useCallback(() => {
    setFlyToConfirmOffer(null);
    pendingObserveFlyRef.current = null;
  }, [pendingObserveFlyRef, setFlyToConfirmOffer]);

  return {
    enterFocusedSpace,
    leaveIncidentSpace,
    unifiedFlyTo,
    revealIncidentEnergyPipelines,
    switchToObserveAndFly,
    focusWatchboardItem,
    acceptFlyToConfirm,
    dismissFlyToConfirm,
    flushPendingCesiumFly,
  };
}
