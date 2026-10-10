"use client";

import { useEffect, useMemo, useState } from "react";
import { overlayPolygonsEqual } from "@/components/globe/overlayPolygons";
import type { PolygonLayerFeature } from "@/components/globe/types";
import { paintAlliedBlocCountriesGeoJson } from "@/lib/alliedBlocCountryPolygons";
import { paintAxisHubCountriesGeoJson, paintAxisSatelliteCountriesGeoJson } from "@/lib/axisHubCountryPolygons";
import { paintGeoEconBlocCountriesGeoJson } from "@/lib/geoeconBlocCountryPolygons";
import { emptyUkraineFrontGeoJson, buildUkraineMacroGeoJson, buildUkraineMacroSeedGeoJson, buildUkraineMicroGeoJson, buildUkraineMicroSeedGeoJson } from "@/lib/ukraineFrontGeojson";

import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { MutableRefObject } from "react";
import type { ViinaPolygonLayers } from "@/lib/viinaLod";

export type UseBlocPolygonLayersOptions = {
  isEconomyViewer: boolean;
  isConflictViewer: boolean;
  ukraineOccupiedGeoJson: FeatureCollection<Geometry, GeoJsonProperties>;
  applyGeneration: number;
  immediateUntilRef: MutableRefObject<number>;
  showAlliedBlocs: boolean;
  showCstoBloc: boolean;
  showGeoEconBlocs: boolean;
  showUkraineControl: boolean;
  activeHubId: "IRN" | "CHN" | "RUS" | "PRK" | null;
  isCameraMoving: boolean;
  axisHubCountriesSource: FeatureCollection<Geometry, GeoJsonProperties> | null;
  axisSatelliteCountriesSource: FeatureCollection<Geometry, GeoJsonProperties> | null;
  alliedBlocCountriesSource: FeatureCollection<Geometry, GeoJsonProperties> | null;
  geoEconBlocCountriesSource: FeatureCollection<Geometry, GeoJsonProperties> | null;
  viinaDisplay: ViinaPolygonLayers;
  countryPolygonData: PolygonLayerFeature[];
  overlayPolygonData: PolygonLayerFeature[];
};

/**
 * 안정화 오버레이 폴리곤·우크라이나 전선·축/동맹/지경학 블록 GeoJSON memo 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useBlocPolygonLayers(opts: UseBlocPolygonLayersOptions) {
  const {
    isEconomyViewer,
    isConflictViewer,
    ukraineOccupiedGeoJson,
    applyGeneration,
    immediateUntilRef,
    showAlliedBlocs,
    showCstoBloc,
    showGeoEconBlocs,
    showUkraineControl,
    activeHubId,
    isCameraMoving,
    axisHubCountriesSource,
    axisSatelliteCountriesSource,
    alliedBlocCountriesSource,
    geoEconBlocCountriesSource,
    viinaDisplay,
    countryPolygonData,
    overlayPolygonData,
  } = opts;

  // 카메라 이동 중에는 오버레이(점령지 등)만 동결해 전체 색 깜빡임 완화
  const [stableOverlayPolygons, setStableOverlayPolygons] = useState(overlayPolygonData);
  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current || showUkraineControl;
    if (isCameraMoving && !bypass) return;
    setStableOverlayPolygons((prev) =>
      overlayPolygonsEqual(prev, overlayPolygonData) ? prev : overlayPolygonData,
    );
  }, [applyGeneration, immediateUntilRef, isCameraMoving, overlayPolygonData, showUkraineControl]);

  const polygonData = useMemo<PolygonLayerFeature[]>(
    () => [...countryPolygonData, ...stableOverlayPolygons],
    [countryPolygonData, stableOverlayPolygons],
  );

  const ukraineMacroGeoJson = useMemo(() => {
    if (isEconomyViewer || !showUkraineControl) {
      return emptyUkraineFrontGeoJson();
    }
    // LiveUAMap 다전장(UA·중동) 통제면. 없으면 우크라 VIINA macro만.
    if (ukraineOccupiedGeoJson.features.length > 0) {
      return ukraineOccupiedGeoJson;
    }
    if (viinaDisplay.lod.mode === "hidden") {
      return emptyUkraineFrontGeoJson();
    }
    if (viinaDisplay.ruZones.length > 0 || viinaDisplay.contestedZones.length > 0) {
      return buildUkraineMacroGeoJson(
        viinaDisplay.ruZones,
        viinaDisplay.uaZones,
        viinaDisplay.contestedZones,
      );
    }
    return buildUkraineMacroSeedGeoJson();
  }, [
    isEconomyViewer,
    showUkraineControl,
    ukraineOccupiedGeoJson,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
    viinaDisplay.uaZones,
  ]);

  const ukraineMicroGeoJson = useMemo(() => {
    if (isEconomyViewer || !showUkraineControl) {
      return emptyUkraineFrontGeoJson();
    }
    // LiveUA 다전장 통제면을 micro 줌에서도 동일 fill
    if (ukraineOccupiedGeoJson.features.length > 0) {
      return {
        type: "FeatureCollection" as const,
        features: ukraineOccupiedGeoJson.features.map((f, i) => ({
          ...f,
          id: typeof f.id === "string" ? f.id.replace("-macro-", "-micro-") : `liveua-micro-${i}`,
          properties: {
            ...(f.properties ?? {}),
            tier: "micro" as const,
            fillOpacity:
              typeof (f.properties as { fillOpacity?: number } | null)?.fillOpacity === "number"
                ? Math.min(
                    0.48,
                    ((f.properties as { fillOpacity?: number }).fillOpacity ?? 0.32) + 0.06,
                  )
                : 0.4,
          },
        })),
      };
    }
    if (viinaDisplay.lod.mode === "hidden") {
      return emptyUkraineFrontGeoJson();
    }
    if (viinaDisplay.ruZones.length > 0 || viinaDisplay.contestedZones.length > 0) {
      return buildUkraineMicroGeoJson(viinaDisplay.ruZones, viinaDisplay.contestedZones);
    }
    return buildUkraineMicroSeedGeoJson();
  }, [
    isEconomyViewer,
    showUkraineControl,
    ukraineOccupiedGeoJson,
    viinaDisplay.contestedZones,
    viinaDisplay.lod.mode,
    viinaDisplay.ruZones,
  ]);

  const polygonDataWithUkraine = polygonData;

  const axisHubCountriesGeoJson = useMemo(() => {
    // 지정학 전용 — NE 10m 고정밀 소스만 사용 (저정밀 countries.json 폴백 금지)
    // 역사·지경학에서는 CRINK 빨간 국토 fill 숨김 (캐시 잔존 방지)
    if (!isConflictViewer) {
      return paintAxisHubCountriesGeoJson(null);
    }
    return paintAxisHubCountriesGeoJson(axisHubCountriesSource, {
      activeIso: activeHubId ?? null,
    });
  }, [activeHubId, axisHubCountriesSource, isConflictViewer]);

  const axisSatelliteCountriesGeoJson = useMemo(() => {
    if (!isConflictViewer) {
      return paintAxisSatelliteCountriesGeoJson(null);
    }
    return paintAxisSatelliteCountriesGeoJson(axisSatelliteCountriesSource);
  }, [axisSatelliteCountriesSource, isConflictViewer]);

  const alliedBlocCountriesGeoJson = useMemo(() => {
    if (isEconomyViewer || !showAlliedBlocs) {
      return paintAlliedBlocCountriesGeoJson(null);
    }
    return paintAlliedBlocCountriesGeoJson(alliedBlocCountriesSource, {
      includeCsto: showCstoBloc,
    });
  }, [alliedBlocCountriesSource, isEconomyViewer, showAlliedBlocs, showCstoBloc]);

  const geoEconBlocCountriesGeoJson = useMemo(() => {
    if (!isEconomyViewer || !showGeoEconBlocs) {
      return paintGeoEconBlocCountriesGeoJson(null);
    }
    return paintGeoEconBlocCountriesGeoJson(geoEconBlocCountriesSource);
  }, [geoEconBlocCountriesSource, isEconomyViewer, showGeoEconBlocs]);

  return {
    polygonData,
    ukraineMacroGeoJson,
    ukraineMicroGeoJson,
    polygonDataWithUkraine,
    axisHubCountriesGeoJson,
    axisSatelliteCountriesGeoJson,
    alliedBlocCountriesGeoJson,
    geoEconBlocCountriesGeoJson,
  };
}
