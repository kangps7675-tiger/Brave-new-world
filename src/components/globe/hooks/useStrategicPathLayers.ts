"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCrinkInfraLayers } from "@/components/globe/hooks/useCrinkInfraLayers";
import type { AxisHubId } from "@/data/axisNetwork";
import type { TransportPath } from "@/data/geoTypes";
import { filterArmsForHub, armsPairsToPaths } from "@/lib/axisArmsPaths";
import { axisNetworkToPaths } from "@/lib/axisNetworkPaths";
import { briTradePathsToTransport } from "@/lib/briTradePaths";
import { getCorridorLod } from "@/lib/corridorLod";
import { isEastAsiaAdizVisibleAtAltitude, eastAsiaAdizToPaths } from "@/lib/eastAsiaAdiz";
import type { GtaIntervention } from "@/lib/gta";
import { gtaInterventionsToTransport } from "@/lib/gtaTradePaths";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import { strategicCorridorPathsForLod, strategicCorridorBackgroundPathsForLod, sanctionsEvasionCorridorPathsForLod } from "@/lib/strategicCorridorPaths";
import { usDfcSupplyPathsToTransport } from "@/lib/usDfcSupplyPaths";

import type { AxisArmsPayload } from "@/lib/axisArmsPaths";
import type { BasemapMode } from "@/lib/basemapMode";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { GlobeLod } from "@/lib/globeLod";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";

import type { CameraViewState } from "@/hooks/useCameraViewport";

export type UseStrategicPathLayersOptions = {
  isEconomyViewer: boolean;
  eastAsiaAdizFc: FeatureCollection<Geometry, GeoJsonProperties> | null;
  ultraLite: boolean;
  basemapMode: BasemapMode;
  layerPrefs: LayerPrefs;
  showGtaInterventions: boolean;
  showEastAsiaAdiz: boolean;
  showAxisNetwork: boolean;
  showBriTradeConnectivity: boolean;
  showStrategicCorridors: boolean;
  showAlliedLogisticsCorridors: boolean;
  showSanctionsEvasionCorridors: boolean;
  showUsDfcSupplyChain: boolean;
  labelLanguage: LabelLanguage;
  activeHubId: "IRN" | "CHN" | "RUS" | "PRK" | null;
  hubFocusMode: "network" | "ally" | "claim" | "arms" | "regime" | "westpac-pulse" | "disputes" | null;
  axisArmsPayload: AxisArmsPayload | null;
  layerViewState: CameraViewState;
  mapZoom: number;
  globeLod: GlobeLod;
};

/**
 * ADIZ·축 네트워크·BRI/GTA 교역·전략 회랑·CRINK 인프라 경로 memo 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useStrategicPathLayers(opts: UseStrategicPathLayersOptions) {
  const {
    isEconomyViewer,
    eastAsiaAdizFc,
    ultraLite,
    basemapMode,
    layerPrefs,
    showGtaInterventions,
    showEastAsiaAdiz,
    showAxisNetwork,
    showBriTradeConnectivity,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    showUsDfcSupplyChain,
    labelLanguage,
    activeHubId,
    hubFocusMode,
    axisArmsPayload,
    layerViewState,
    mapZoom,
    globeLod,
  } = opts;

  const eastAsiaAdizPaths = useMemo<TransportPath[]>(() => {
    if (!showEastAsiaAdiz) return [];
    if (!isEastAsiaAdizVisibleAtAltitude(layerViewState.altitude)) return [];
    return eastAsiaAdizToPaths(eastAsiaAdizFc);
  }, [eastAsiaAdizFc, layerViewState.altitude, showEastAsiaAdiz]);

  const axisNetworkPaths = useMemo<TransportPath[]>(() => {
    if (!showAxisNetwork) return [];
    const hub = (activeHubId ?? "all") as AxisHubId | "all";
    const axisViewerMode = isEconomyViewer ? "economy" : "conflict";
    if (
      SIPRI_ARMS_LENS_ENABLED &&
      hubFocusMode === "arms" &&
      activeHubId &&
      axisArmsPayload
    ) {
      const { pairs } = filterArmsForHub(axisArmsPayload, activeHubId);
      return armsPairsToPaths(pairs, labelLanguage);
    }
    if (hubFocusMode === "arms" && !SIPRI_ARMS_LENS_ENABLED) {
      // SIPRI 렌즈 OFF — 정적 축 관계망만
      return axisNetworkToPaths(hub, labelLanguage, axisViewerMode);
    }
    if (hubFocusMode === "regime") return [];
    // 허브 미선택(all)이어도 전체 축 스포크 표시 — ON인데 빈 화면 방지
    return axisNetworkToPaths(hub, labelLanguage, axisViewerMode);
  }, [
    showAxisNetwork,
    activeHubId,
    hubFocusMode,
    axisArmsPayload,
    isEconomyViewer,
    labelLanguage,
  ]);

  const briTradePaths = useMemo<TransportPath[]>(() => {
    if (!showBriTradeConnectivity) return [];
    return briTradePathsToTransport(labelLanguage);
  }, [showBriTradeConnectivity, labelLanguage]);

  const [gtaInterventions, setGtaInterventions] = useState<GtaIntervention[]>([]);
  const [gtaCentroids, setGtaCentroids] = useState<Record<string, { lat: number; lng: number }>>(
    {},
  );
  const gtaFetchedRef = useRef(false);
  const gtaCentroidsFetchedRef = useRef(false);

  // GTA(느린 데이터, 하루 1회 갱신) — 레이어 켰을 때 한 번만 불러온다.
  useEffect(() => {
    if (!showGtaInterventions || gtaFetchedRef.current) return;
    gtaFetchedRef.current = true;
    const ac = new AbortController();
    void fetch("/api/layers/gta-interventions?inForce=1", {
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json()) as { interventions?: GtaIntervention[] };
        if (ac.signal.aborted) return;
        setGtaInterventions(Array.isArray(payload.interventions) ? payload.interventions : []);
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [showGtaInterventions]);

  // 호를 그리려면 관할국 ISO3 → 중심점이 필요하다 (GTA 레코드엔 좌표가 없음).
  useEffect(() => {
    if (!showGtaInterventions || gtaCentroidsFetchedRef.current) return;
    gtaCentroidsFetchedRef.current = true;
    const ac = new AbortController();
    void fetch("/api/layers/country-centroids", { cache: "no-store", signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json()) as {
          centroids?: { iso3: string; lat: number; lng: number }[];
        };
        if (ac.signal.aborted) return;
        const map: Record<string, { lat: number; lng: number }> = {};
        for (const c of payload.centroids ?? []) map[c.iso3] = { lat: c.lat, lng: c.lng };
        setGtaCentroids(map);
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [showGtaInterventions]);

  const gtaCentroidLookup = useCallback(
    (iso3: string) => gtaCentroids[iso3],
    [gtaCentroids],
  );

  const gtaTradePaths = useMemo<TransportPath[]>(() => {
    if (
      !showGtaInterventions ||
      gtaInterventions.length === 0 ||
      Object.keys(gtaCentroids).length === 0
    )
      return [];
    return gtaInterventionsToTransport(gtaInterventions, gtaCentroidLookup, labelLanguage);
  }, [showGtaInterventions, gtaInterventions, gtaCentroids, gtaCentroidLookup, labelLanguage]);

  const corridorLod = useMemo(
    () => getCorridorLod(layerViewState.altitude),
    [layerViewState.altitude],
  );

  const strategicCorridorPaths = useMemo<TransportPath[]>(() => {
    if (!showStrategicCorridors) return [];
    return strategicCorridorPathsForLod(corridorLod, {
      lat: layerViewState.lat,
      lng: layerViewState.lng,
    });
  }, [
    showStrategicCorridors,
    corridorLod,
    layerViewState.lat,
    layerViewState.lng,
  ]);

  /**
   * 전략 회랑 상시 배경 레이어 — 토글(showStrategicCorridors 등)과 무관하게 항상 켜져
   * 있는 영구 인프라 배경. 위 토글 레이어들과 달리 체크박스로 끄고 켤 수 없고, 무채색
   * 톤이라 CRINK 축·무기거래 등 토글 레이어와 시각적으로 경쟁하지 않는다.
   */
  const strategicCorridorBackgroundPaths = useMemo<TransportPath[]>(
    () =>
      strategicCorridorBackgroundPathsForLod(corridorLod, {
        lat: layerViewState.lat,
        lng: layerViewState.lng,
      }),
    [corridorLod, layerViewState.lat, layerViewState.lng],
  );

  /**
   * 동맹 물류 회랑(military-logistics) — 기본 꺼짐.
   * 북-이란·예멘·쿠바 등 추정 군수해상로가 첫 화면을 어지럽혀서 레이어 패널에서 켠다.
   */
  const alliedLogisticsCorridorPaths = useMemo<TransportPath[]>(() => {
    if (!showAlliedLogisticsCorridors) return [];
    return strategicCorridorPathsForLod(
      corridorLod,
      { lat: layerViewState.lat, lng: layerViewState.lng },
      { categories: ["military-logistics"] },
    );
  }, [
    showAlliedLogisticsCorridors,
    corridorLod,
    layerViewState.lat,
    layerViewState.lng,
  ]);

  /** 제재 회피 회랑 — SES 지도 근거 (지정학 전용) */
  const sanctionsEvasionCorridorPaths = useMemo<TransportPath[]>(() => {
    if (isEconomyViewer || !showSanctionsEvasionCorridors) return [];
    return sanctionsEvasionCorridorPathsForLod(corridorLod, {
      lat: layerViewState.lat,
      lng: layerViewState.lng,
    });
  }, [
    isEconomyViewer,
    showSanctionsEvasionCorridors,
    corridorLod,
    layerViewState.lat,
    layerViewState.lng,
  ]);

  const usDfcSupplyPaths = useMemo<TransportPath[]>(() => {
    if (!showUsDfcSupplyChain) return [];
    return usDfcSupplyPathsToTransport(labelLanguage);
  }, [showUsDfcSupplyChain, labelLanguage]);

  const {
    paths: crinkInfraPaths,
    pathCountByCategory: crinkInfraPathCountByCategory,
    status: crinkInfraStatus,
    visibilityHint: crinkInfraVisibilityHint,
  } = useCrinkInfraLayers({
    layerPrefs,
    basemapMode,
    ultraLite,
    mapZoom,
    view: layerViewState,
    radiusDeg: globeLod.radiusDeg > 0 ? globeLod.radiusDeg : 8,
    lang: labelLanguage === "en" ? "en" : "ko",
  });

  return {
    eastAsiaAdizPaths,
    axisNetworkPaths,
    briTradePaths,
    gtaInterventions,
    gtaTradePaths,
    strategicCorridorPaths,
    strategicCorridorBackgroundPaths,
    alliedLogisticsCorridorPaths,
    sanctionsEvasionCorridorPaths,
    usDfcSupplyPaths,
    crinkInfraPaths,
    crinkInfraPathCountByCategory,
    crinkInfraStatus,
    crinkInfraVisibilityHint,
  };
}
