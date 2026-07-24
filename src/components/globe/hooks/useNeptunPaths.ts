"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import {
  buildArchivedNeptunTrackPaths,
  buildNeptunProjectionPaths,
  buildNeptunTrailPaths,
} from "@/lib/neptunTracks";
import {
  neptunArchivedPointBudget,
  neptunElevationForMode,
  neptunMaxGroundTrailVertices,
  neptunProjectionPointBudget,
  neptunShowsPaths,
  neptunShowsProjection,
  neptunTrailPointBudget,
  type NeptunRenderMode,
} from "@/lib/neptunLod";
import type { NeptunPathElevationMode } from "@/lib/neptunFlightArc";
import { neptunPathsGeometryEqual } from "@/components/globe/overlayPolygons";

type LiveThreats = Parameters<typeof buildNeptunTrailPaths>[0];
type ArchivedTracks = Parameters<typeof buildArchivedNeptunTrackPaths>[0];
type NeptunPaths = ReturnType<typeof buildNeptunTrailPaths>;

type UseNeptunPathsOptions = {
  neptunRenderMode: NeptunRenderMode;
  showNeptun: boolean;
  showNeptunPreviousTrails: boolean;
  visibleNeptunThreats: LiveThreats;
  visibleNeptunArchived: ArchivedTracks;
  isCameraMoving: boolean;
  /** 카메라 tween 중에도 즉시 반영해야 하는 창 (ms epoch) */
  immediateUntilRef: MutableRefObject<number>;
};

/**
 * NEPTUN 궤적·예상 항로·아카이브 경로 빌드 + 카메라 이동 중 지오메트리 고정.
 * GlobeDashboard에서 추출 (분리 3단계).
 */
export function useNeptunPaths({
  neptunRenderMode,
  showNeptun,
  showNeptunPreviousTrails,
  visibleNeptunThreats,
  visibleNeptunArchived,
  isCameraMoving,
  immediateUntilRef,
}: UseNeptunPathsOptions): {
  neptunPathElevation: NeptunPathElevationMode;
  stableNeptunLivePaths: NeptunPaths;
  stableNeptunArchivedPaths: NeptunPaths;
} {
  const neptunTrailBudget = useMemo(
    () => neptunTrailPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunProjectionBudget = useMemo(
    () => neptunProjectionPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunArchivedBudget = useMemo(
    () => neptunArchivedPointBudget(neptunRenderMode),
    [neptunRenderMode],
  );
  const neptunGroundTrailBudget = useMemo(
    () => neptunMaxGroundTrailVertices(neptunRenderMode),
    [neptunRenderMode],
  );

  const neptunPathElevation = useMemo<NeptunPathElevationMode>(
    () => neptunElevationForMode(neptunRenderMode),
    [neptunRenderMode],
  );

  const neptunTrailPaths = useMemo(() => {
    if (!showNeptun || !neptunShowsPaths(neptunRenderMode)) return [];
    return buildNeptunTrailPaths(
      visibleNeptunThreats,
      neptunPathElevation,
      neptunTrailBudget,
      neptunGroundTrailBudget,
    );
  }, [
    neptunGroundTrailBudget,
    neptunPathElevation,
    neptunRenderMode,
    neptunTrailBudget,
    showNeptun,
    visibleNeptunThreats,
  ]);

  const neptunProjectionPaths = useMemo(() => {
    if (!showNeptun || !neptunShowsProjection(neptunRenderMode)) return [];
    return buildNeptunProjectionPaths(
      visibleNeptunThreats,
      neptunPathElevation,
      neptunProjectionBudget,
    );
  }, [
    neptunPathElevation,
    neptunProjectionBudget,
    neptunRenderMode,
    showNeptun,
    visibleNeptunThreats,
  ]);

  const neptunArchivedTrackPathsRaw = useMemo(() => {
    if (!showNeptun || !showNeptunPreviousTrails || !neptunShowsPaths(neptunRenderMode)) {
      return [];
    }
    const archivedGroundBudget = Math.max(6, Math.floor(neptunGroundTrailBudget * 0.75));
    return buildArchivedNeptunTrackPaths(
      visibleNeptunArchived,
      neptunPathElevation,
      neptunArchivedBudget,
      archivedGroundBudget,
    );
  }, [
    neptunArchivedBudget,
    neptunGroundTrailBudget,
    neptunPathElevation,
    neptunRenderMode,
    showNeptun,
    showNeptunPreviousTrails,
    visibleNeptunArchived,
  ]);

  const neptunLivePathsPending = useMemo(
    () => [...neptunTrailPaths, ...neptunProjectionPaths],
    [neptunProjectionPaths, neptunTrailPaths],
  );

  const [stableNeptunLivePaths, setStableNeptunLivePaths] = useState<NeptunPaths>([]);
  const [stableNeptunArchivedPaths, setStableNeptunArchivedPaths] = useState<NeptunPaths>([]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setStableNeptunLivePaths((prev) =>
      neptunPathsGeometryEqual(prev, neptunLivePathsPending) ? prev : neptunLivePathsPending,
    );
  }, [immediateUntilRef, isCameraMoving, neptunLivePathsPending]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setStableNeptunArchivedPaths((prev) =>
      neptunPathsGeometryEqual(prev, neptunArchivedTrackPathsRaw)
        ? prev
        : neptunArchivedTrackPathsRaw,
    );
  }, [immediateUntilRef, isCameraMoving, neptunArchivedTrackPathsRaw]);

  return { neptunPathElevation, stableNeptunLivePaths, stableNeptunArchivedPaths };
}
