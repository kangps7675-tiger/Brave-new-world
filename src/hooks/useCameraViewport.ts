"use client";

import { useMemo } from "react";
import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";
import { globeViewToMapLibre } from "@/lib/mapLibreBasemap";
import { getLodEffectiveAltitude } from "@/lib/zoomScale";
import type { ViewPoint } from "@/lib/viewportCull";

export type CameraViewState = ViewPoint & { altitude: number };

/**
 * 카메라 idle 후 확정된 filterCenter·layerAltitude로
 * LOD tier·MapLibre zoom·레이어 필터용 viewState를 파생한다.
 */
export function useCameraViewport(
  filterCenter: ViewPoint,
  layerAltitude: number,
): {
  layerViewState: CameraViewState;
  mapZoom: number;
  lodTier: GlobeLodTier;
} {
  const layerViewState = useMemo<CameraViewState>(
    () => ({
      lat: filterCenter.lat,
      lng: filterCenter.lng,
      altitude: layerAltitude,
    }),
    [filterCenter.lat, filterCenter.lng, layerAltitude],
  );

  const mapZoom = useMemo(
    () => globeViewToMapLibre(layerViewState).zoom,
    [layerViewState],
  );

  const lodTier = useMemo(
    () => getGlobeLod(getLodEffectiveAltitude(layerAltitude)).tier,
    [layerAltitude],
  );

  return { layerViewState, mapZoom, lodTier };
}
