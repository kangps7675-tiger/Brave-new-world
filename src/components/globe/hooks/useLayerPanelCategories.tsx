"use client";

import { startTransition, useMemo, type MutableRefObject } from "react";
import { UkraineFrontLegendContent } from "@/components/UkraineFrontLegend";
import { type LayerCategory, type LayerToggleItem } from "@/components/LayerCategoryPanel";
import { EMPTY_LAYER_CATEGORIES } from "@/components/globe/constants";
import { formatDateTime } from "@/components/globe/formatters";
import { GEM_RESOURCE_GROUPS, GEM_RESOURCE_LAYERS, gemLayerById } from "@/lib/gemResourceCatalog";
import {
  localizeLayerCategories,
  type LayerPanelLang,
} from "@/lib/layerPanel/layerPanelLabels";
import { type LabelLanguage, type LayerPrefs } from "@/lib/layerPrefs";
import { localizeNewfeedsThreatLabel } from "@/lib/newfeedsI18n";
import { isClientNeptunEnabled } from "@/lib/runtimeConfig.client";
import { TELEGRAM_CHANNEL_COUNT } from "@/lib/telegramAlerts";
import { UCDP_ATTRIBUTION_SHORT } from "@/lib/ucdp";
import type GeoJSON from "geojson";

export type UseLayerPanelCategoriesArgs = {
  showLeftPanel: boolean;
  layerPanelReady: boolean;
  categorySnapshotRef: MutableRefObject<LayerCategory[] | null>;
  labelLanguage: LabelLanguage | LayerPanelLang;
  globeLod: { label: string };
  labelPlaces: unknown[];
  showCityLabels: boolean;
  layerPrefs: LayerPrefs;
  setShowCityLabels: (v: boolean) => void;
  showRailGlow: boolean;
  railPaths: unknown[];
  setShowRailGlow: (v: boolean) => void;
  toggleCategoryPrefs: (patch: Partial<LayerPrefs>) => void;
  ukraineControlStatus: string;
  showUkraineControl: boolean;
  ukraineMacroGeoJson: GeoJSON.FeatureCollection;
  ukraineMicroGeoJson: GeoJSON.FeatureCollection;
  viinaMeta: { available?: boolean; featureCount?: number } | null | undefined;
  setShowUkraineControl: (v: boolean) => void;
  showNeptun: boolean;
  neptunFetchEnabled: boolean;
  neptunRenderMode: string;
  visibleNeptunThreats: unknown[];
  neptunAlertCount: number;
  neptunLive: boolean;
  neptunStatus: string;
  setShowNeptun: (v: boolean) => void;
  showChinaTaiwanIncidents: boolean;
  showChinaJapanIncidents: boolean;
  showChinaPhilippinesIncidents: boolean;
  showUsChinaIncidents: boolean;
  showNorthKoreaMissileTests: boolean;
  setShowChinaTaiwanIncidents: (v: boolean) => void;
  setShowChinaJapanIncidents: (v: boolean) => void;
  setShowChinaPhilippinesIncidents: (v: boolean) => void;
  setShowUsChinaIncidents: (v: boolean) => void;
  setShowNorthKoreaMissileTests: (v: boolean) => void;
  chinaTheaterIncidentMarkers: Array<{ dyad: string }>;
  koreaMissileIncidentMarkers: unknown[];
  showWarZones: boolean;
  disputeZoneOutlineCount: number;
  setShowWarZones: (v: boolean) => void;
  showDiplomaticTension: boolean;
  setShowDiplomaticTension: (v: boolean) => void;
  showEastAsiaAdiz: boolean;
  setShowEastAsiaAdiz: (v: boolean) => void;
  showIslandChains: boolean;
  setShowIslandChains: (v: boolean) => void;
  showNewfeedsIranAttacks: boolean;
  newfeedsStatus: string;
  newfeedsThreatLabel: string | null;
  newfeedsAttacks: unknown[];
  setShowNewfeedsIranAttacks: (v: boolean) => void;
  showUkmtoIncidents: boolean;
  ukmtoStatus: string;
  ukmtoIncidents: unknown[];
  setShowUkmtoIncidents: (v: boolean) => void;
  showNavareaWarnings: boolean;
  navareaStatus: string;
  navareaFeatures: unknown[];
  setShowNavareaWarnings: (v: boolean) => void;
  showMilitaryExercises: boolean;
  militaryExercisesStatus: string;
  militaryExercises: unknown[];
  setShowMilitaryExercises: (v: boolean) => void;
  showTzevaAdom: boolean;
  tzevaAdomActive: unknown[];
  tzevaAdomLive: boolean;
  tzevaAdomStatus: string;
  tzevaAdomHistory: unknown[];
  setShowTzevaAdom: (v: boolean) => void;
  showAxisNetwork: boolean;
  axisNetworkPaths: unknown[];
  setShowAxisNetwork: (v: boolean) => void;
  showConflictZones: boolean;
  visibleConflictZones: unknown[];
  setShowConflictZones: (v: boolean) => void;
  showArmsEmbargo: boolean;
  armsEmbargoFramePaths: unknown[];
  setShowArmsEmbargo: (v: boolean) => void;
  showUcdpEvents: boolean;
  setShowUcdpEvents: (v: boolean) => void;
  showGdeltWar: boolean;
  gdeltLoading: boolean;
  ukraineGdeltNeonMarkers: unknown[];
  layerPanelGdeltCounts: { war: number; diplomatic: number; alliance: number; protest: number };
  setShowGdeltWar: (v: boolean) => void;
  showGdeltDiplomatic: boolean;
  setShowGdeltDiplomatic: (v: boolean) => void;
  showGdeltOceanCompetition: boolean;
  setShowGdeltOceanCompetition: (v: boolean) => void;
  showGdeltProtests: boolean;
  setShowGdeltProtests: (v: boolean) => void;
  showTelegramOsint: boolean;
  telegramStatus: string;
  telegramLive: boolean;
  telegramAlerts: unknown[];
  telegramEmbedMode: boolean;
  setShowTelegramOsint: (v: boolean) => void;
  viinaDisplay: { lod: { mode: string } };
  ukraineControlDate: string | null;
  showGdeltLayers: boolean;
  refreshGdeltEvents: () => void | Promise<void>;
  gdeltError: string | null;
  gdeltFetchedAt: string | null;
  setShowDisputeLegendPanel: (v: boolean) => void;
  showOilPipelines: boolean;
  showGasPipelines: boolean;
  showLngTerminals: boolean;
  showSubseaPipelines: boolean;
  visibleOilPipelines: unknown[];
  visibleGasPipelines: unknown[];
  visibleSubseaPipelines: unknown[];
  visibleStaticPoints: Array<{ kind: string }>;
  staticCounts: {
    oilPipelines?: number;
    gasPipelines?: number;
    subseaPipelines?: number;
    lngTerminals?: number;
    shipping?: number;
    cables?: number;
    airports?: number;
    ports?: number;
    logisticsRisk?: number;
    criticalNodes?: number;
    militaryBases?: number;
    missileSilos?: number;
    strategicMissileBases?: number;
    missileTestSites?: number;
    missileSiloFields?: number;
    resources?: number;
    resourceDeposits?: number;
    gemResources?: Record<string, number>;
  };
  setShowOilPipelines: (v: boolean) => void;
  setShowGasPipelines: (v: boolean) => void;
  setShowLngTerminals: (v: boolean) => void;
  setShowSubseaPipelines: (v: boolean) => void;
  togglePref: (key: keyof LayerPrefs, v: boolean) => void;
  showResources: boolean;
  showNuclearSites: boolean;
  setShowResources: (v: boolean) => void;
  setShowNuclearSites: (v: boolean) => void;
  isEconomyViewer: boolean;
  showUsDfcSupplyChain: boolean;
  usDfcSupplyPaths: unknown[];
  setShowUsDfcSupplyChain: (v: boolean) => void;
  showBriTradeConnectivity: boolean;
  briTradePaths: unknown[];
  setShowBriTradeConnectivity: (v: boolean) => void;
  showShippingLanes: boolean;
  visibleShipping: unknown[];
  setShowShippingLanes: (v: boolean) => void;
  showLsibBoundary: boolean;
  visibleLsibBoundary: unknown[];
  setShowLsibBoundary: (v: boolean) => void;
  showSubmarineCables: boolean;
  visibleCables: unknown[];
  setShowSubmarineCables: (v: boolean) => void;
  showSubmarineTunnels: boolean;
  setShowSubmarineTunnels: (v: boolean) => void;
  showAirports: boolean;
  setShowAirports: (v: boolean) => void;
  showPorts: boolean;
  setShowPorts: (v: boolean) => void;
  showInternetExchanges: boolean;
  setShowInternetExchanges: (v: boolean) => void;
  showLogisticsRisk: boolean;
  setShowLogisticsRisk: (v: boolean) => void;
  showLogisticsStress: boolean;
  setShowLogisticsStress: (v: boolean) => void;
  showGscpiGauge: boolean;
  setShowGscpiGauge: (v: boolean) => void;
  showCriticalNodes: boolean;
  setShowCriticalNodes: (v: boolean) => void;
  showAis: boolean;
  aisVessels: unknown[];
  setShowAis: (v: boolean) => void;
  showWeeklyShipMoves: boolean;
  weeklyShipMoveCount: number;
  setShowWeeklyShipMoves: (v: boolean) => void;
  showReefWatch: boolean;
  reefWatchFeatureCount: number;
  reefWatchTrafficCount: number;
  reefWatchStatus?: "idle" | "loading" | "ok" | "error";
  setShowReefWatch: (v: boolean) => void;
  showDisguisedVessels: boolean;
  disguisedLoading: boolean;
  disguisedVessels: unknown[];
  disguisedError: string | null;
  setShowDisguisedVessels: (v: boolean) => void;
  showMilitaryBases: boolean;
  visibleMilitaryBaseAreas: unknown[];
  setShowMilitaryBases: (v: boolean) => void;
  showMissileSilos: boolean;
  setShowMissileSilos: (v: boolean) => void;
  showStrategicMissileBases: boolean;
  setShowStrategicMissileBases: (v: boolean) => void;
  showMissileTestSites: boolean;
  setShowMissileTestSites: (v: boolean) => void;
  showMissileSiloFields: boolean;
  setShowMissileSiloFields: (v: boolean) => void;
  visibleMissileSiloFields: unknown[];
  showMilitaryActivity: boolean;
  milAircraft: unknown[];
  setShowMilitaryActivity: (v: boolean) => void;
  showIntelHotspots: boolean;
  setShowIntelHotspots: (v: boolean) => void;
  showRefugeeCamps: boolean;
  setShowRefugeeCamps: (v: boolean) => void;
  refreshMilAircraft: () => void | Promise<void>;
  milLoading: boolean;
  milError: string | null;
  showFirmsFires: boolean;
  visibleFirmsFires: unknown[];
  firmsCombatFireIds: unknown[];
  firmsError: string | null;
  setShowFirmsFires: (v: boolean) => void;
  showCyberIncidents: boolean;
  cyberEvents: unknown[];
  setShowCyberIncidents: (v: boolean) => void;
  showElectionEvents: boolean;
  electionEvents: unknown[];
  setShowElectionEvents: (v: boolean) => void;
  showSpaceLaunches: boolean;
  setShowSpaceLaunches: (v: boolean) => void;
  showReconSatellites: boolean;
  setShowReconSatellites: (v: boolean) => void;
  reconSatCount: number;
  reconSatStatus?: "idle" | "loading" | "ok" | "error";
  reconSatError?: string | null;
  showGpsInterference: boolean;
  setShowGpsInterference: (v: boolean) => void;
  gpsJamCellCount: number;
  gpsJamDate: string | null;
  gpsJamStatus: "idle" | "loading" | "ok" | "error";
  showAirTraffic: boolean;
  civAircraft: unknown[];
  setShowAirTraffic: (v: boolean) => void;
  showEconomicCenters: boolean;
  setShowEconomicCenters: (v: boolean) => void;
  showAiDataCenters: boolean;
  setShowAiDataCenters: (v: boolean) => void;
  showSanctionsEntities: boolean;
  setShowSanctionsEntities: (v: boolean) => void;
  refreshCivAircraft: () => void | Promise<void>;
  civLoading: boolean;
  civError: string | null;
  viewerChromePreset: { layerCategoryIds: readonly string[]; fetchGdelt?: boolean };
  refreshUsCarriers: (() => void | Promise<void>) | null;
  showUsCarriers: boolean;
  usCarriers: unknown[];
  usCarriersLoading: boolean;
  showNeptunPreviousTrails: boolean;
  ukraineRuCellCount: number;
  newfeedsLive: boolean;
  neptunThreats: unknown[];
  neptunArchivedThreats: unknown[];
  visibleNeptunArchived: unknown[];
};

export function useLayerPanelCategories({
  showLeftPanel,
  layerPanelReady,
  categorySnapshotRef,
  labelLanguage,
  globeLod,
  labelPlaces,
  showCityLabels,
  layerPrefs,
  setShowCityLabels,
  showRailGlow,
  railPaths,
  setShowRailGlow,
  toggleCategoryPrefs,
  ukraineControlStatus,
  showUkraineControl,
  ukraineMacroGeoJson,
  ukraineMicroGeoJson,
  viinaMeta,
  setShowUkraineControl,
  showNeptun,
  neptunFetchEnabled,
  neptunRenderMode,
  visibleNeptunThreats,
  neptunAlertCount,
  neptunLive,
  neptunStatus,
  setShowNeptun,
  showChinaTaiwanIncidents,
  showChinaJapanIncidents,
  showChinaPhilippinesIncidents,
  showUsChinaIncidents,
  showNorthKoreaMissileTests,
  setShowChinaTaiwanIncidents,
  setShowChinaJapanIncidents,
  setShowChinaPhilippinesIncidents,
  setShowUsChinaIncidents,
  setShowNorthKoreaMissileTests,
  chinaTheaterIncidentMarkers,
  koreaMissileIncidentMarkers,
  showWarZones,
  disputeZoneOutlineCount,
  setShowWarZones,
  showDiplomaticTension,
  setShowDiplomaticTension,
  showEastAsiaAdiz,
  setShowEastAsiaAdiz,
  showIslandChains,
  setShowIslandChains,
  showNewfeedsIranAttacks,
  newfeedsStatus,
  newfeedsThreatLabel,
  newfeedsAttacks,
  setShowNewfeedsIranAttacks,
  showUkmtoIncidents,
  ukmtoStatus,
  ukmtoIncidents,
  setShowUkmtoIncidents,
  showNavareaWarnings,
  navareaStatus,
  navareaFeatures,
  setShowNavareaWarnings,
  showMilitaryExercises,
  militaryExercisesStatus,
  militaryExercises,
  setShowMilitaryExercises,
  showTzevaAdom,
  tzevaAdomActive,
  tzevaAdomLive,
  tzevaAdomStatus,
  tzevaAdomHistory,
  setShowTzevaAdom,
  showAxisNetwork,
  axisNetworkPaths,
  setShowAxisNetwork,
  showConflictZones,
  visibleConflictZones,
  setShowConflictZones,
  showArmsEmbargo,
  armsEmbargoFramePaths,
  setShowArmsEmbargo,
  showUcdpEvents,
  setShowUcdpEvents,
  showGdeltWar,
  gdeltLoading,
  ukraineGdeltNeonMarkers,
  layerPanelGdeltCounts,
  setShowGdeltWar,
  showGdeltDiplomatic,
  setShowGdeltDiplomatic,
  showGdeltOceanCompetition,
  setShowGdeltOceanCompetition,
  showGdeltProtests,
  setShowGdeltProtests,
  showTelegramOsint,
  telegramStatus,
  telegramLive,
  telegramAlerts,
  telegramEmbedMode,
  setShowTelegramOsint,
  viinaDisplay,
  ukraineControlDate,
  showGdeltLayers,
  refreshGdeltEvents,
  gdeltError,
  gdeltFetchedAt,
  setShowDisputeLegendPanel,
  showOilPipelines,
  showGasPipelines,
  showLngTerminals,
  showSubseaPipelines,
  visibleOilPipelines,
  visibleGasPipelines,
  visibleSubseaPipelines,
  visibleStaticPoints,
  staticCounts,
  setShowOilPipelines,
  setShowGasPipelines,
  setShowLngTerminals,
  setShowSubseaPipelines,
  togglePref,
  showResources,
  showNuclearSites,
  setShowResources,
  setShowNuclearSites,
  isEconomyViewer,
  showUsDfcSupplyChain,
  usDfcSupplyPaths,
  setShowUsDfcSupplyChain,
  showBriTradeConnectivity,
  briTradePaths,
  setShowBriTradeConnectivity,
  showShippingLanes,
  visibleShipping,
  setShowShippingLanes,
  showLsibBoundary,
  visibleLsibBoundary,
  setShowLsibBoundary,
  showSubmarineCables,
  visibleCables,
  setShowSubmarineCables,
  showSubmarineTunnels,
  setShowSubmarineTunnels,
  showAirports,
  setShowAirports,
  showPorts,
  setShowPorts,
  showInternetExchanges,
  setShowInternetExchanges,
  showLogisticsRisk,
  setShowLogisticsRisk,
  showLogisticsStress,
  setShowLogisticsStress,
  showGscpiGauge,
  setShowGscpiGauge,
  showCriticalNodes,
  setShowCriticalNodes,
  showAis,
  aisVessels,
  setShowAis,
  showWeeklyShipMoves,
  weeklyShipMoveCount,
  setShowWeeklyShipMoves,
  showReefWatch,
  reefWatchFeatureCount,
  reefWatchTrafficCount,
  reefWatchStatus = "idle",
  setShowReefWatch,
  showDisguisedVessels,
  disguisedLoading,
  disguisedVessels,
  disguisedError,
  setShowDisguisedVessels,
  showMilitaryBases,
  visibleMilitaryBaseAreas,
  setShowMilitaryBases,
  showMissileSilos,
  setShowMissileSilos,
  showStrategicMissileBases,
  setShowStrategicMissileBases,
  showMissileTestSites,
  setShowMissileTestSites,
  showMissileSiloFields,
  setShowMissileSiloFields,
  visibleMissileSiloFields,
  showMilitaryActivity,
  milAircraft,
  setShowMilitaryActivity,
  showIntelHotspots,
  setShowIntelHotspots,
  showRefugeeCamps,
  setShowRefugeeCamps,
  refreshMilAircraft,
  milLoading,
  milError,
  showFirmsFires,
  visibleFirmsFires,
  firmsCombatFireIds,
  firmsError,
  setShowFirmsFires,
  showCyberIncidents,
  cyberEvents,
  setShowCyberIncidents,
  showElectionEvents,
  electionEvents,
  setShowElectionEvents,
  showSpaceLaunches,
  setShowSpaceLaunches,
  showReconSatellites,
  setShowReconSatellites,
  reconSatCount,
  reconSatStatus = "idle",
  reconSatError = null,
  showGpsInterference,
  setShowGpsInterference,
  gpsJamCellCount,
  gpsJamDate,
  gpsJamStatus,
  showAirTraffic,
  civAircraft,
  setShowAirTraffic,
  showEconomicCenters,
  setShowEconomicCenters,
  showAiDataCenters,
  setShowAiDataCenters,
  showSanctionsEntities,
  setShowSanctionsEntities,
  refreshCivAircraft,
  civLoading,
  civError,
  viewerChromePreset,
  refreshUsCarriers,
  showUsCarriers,
  usCarriers,
  usCarriersLoading,
  showNeptunPreviousTrails,
  ukraineRuCellCount,
  newfeedsLive,
  neptunThreats,
  neptunArchivedThreats,
  visibleNeptunArchived,
}: UseLayerPanelCategoriesArgs): LayerCategory[] {
  const layerPanelActive = showLeftPanel;
  /** 패널 닫힘 시 deps 고정 — GDELT·카메라 등과 layerCategories 재계산 분리 */
  const lpg = <T,>(active: T, idle: T): T => (layerPanelActive ? active : idle);

  return useMemo(() => {
    if (!showLeftPanel || !layerPanelReady) {
      return EMPTY_LAYER_CATEGORIES;
    }
    // ☰ 패널 드래프트 스냅샷 — 드롭다운(즉시 반영)에서는 스냅샷을 쓰지 않음
    if (categorySnapshotRef.current !== null) {
      return categorySnapshotRef.current;
    }
    const off = (count?: number) =>
      count && count > 0 ? `${count.toLocaleString()}곳 · 꺼짐` : "꺼짐";
    const zoom = globeLod.label;

    const allCategories: LayerCategory[] = [
      {
        id: "map",
        title: "지도 · 지명",
        hint: "도시명 · 철도 (국경선·해안선은 항상 표시)",
        items: [
          {
            id: "city-labels",
            label: "도시명",
            detail: showCityLabels
              ? `${labelPlaces.length.toLocaleString()}개 · 주요 도시 · WebGL · ${zoom}`
              : "꺼짐",
            checked: layerPrefs.showCityLabels,
            onChange: setShowCityLabels,
          },
          {
            id: "rail",
            label: "철도",
            detail: showRailGlow
              ? `노선 ${railPaths.length.toLocaleString()}개`
              : "꺼짐",
            checked: layerPrefs.showRailGlow,
            onChange: setShowRailGlow,
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showCityLabels: enabled,
            showRailGlow: enabled,
          }),
      },
      {
        id: "conflict",
        title: "분쟁 · 영토",
        hint: "전선 · 공중위협 · 대치 지점 · 긴장 구역 · 중동 · 뉴스",
        items: [
          {
            id: "ukraine",
            label: "우크라이나 전선·점령",
            detail:
              ukraineControlStatus === "loading"
                ? "불러오는 중…"
                : showUkraineControl &&
                    (ukraineMacroGeoJson.features.length > 0 ||
                      ukraineMicroGeoJson.features.length > 0)
                  ? `전선 구역 ${ukraineMacroGeoJson.features.length} · 상세 ${ukraineMicroGeoJson.features.length}`
                  : showUkraineControl
                    ? viinaMeta?.available
                      ? ukraineControlStatus === "ok"
                        ? "켜짐"
                        : "로드 실패"
                      : "데이터 빌드 필요"
                    : "꺼짐 · 점령·주장 경계",
            checked: layerPrefs.showUkraineControl,
            onChange: setShowUkraineControl,
            accent: "red",
          },
          {
            id: "neptun",
            label: "우크라이나 공중위협 (실시간)",
            detail: showNeptun
              ? !isClientNeptunEnabled()
                ? "서버 설정 꺼짐 (NEPTUN_ENABLED)"
                : !neptunFetchEnabled
                ? "우크라이나 근처로 이동 시 로드"
                : neptunRenderMode === "hidden"
                  ? `${globeLod.label} · 우크라이나 근처로 이동`
                  : neptunRenderMode === "flat"
                    ? `드론·미사일 ${visibleNeptunThreats.length.toLocaleString()}건 · 개요`
                    : neptunRenderMode === "low"
                      ? `실시간 ${visibleNeptunThreats.length.toLocaleString()}건 · 예상 항로 포함`
                      : neptunAlertCount > 0
                    ? `공습 경보 ${neptunAlertCount.toLocaleString()} · 추적 ${visibleNeptunThreats.length.toLocaleString()}건`
                    : neptunLive
                      ? `실시간 ${visibleNeptunThreats.length.toLocaleString()}건 · ${globeLod.label}`
                      : neptunStatus === "stub"
                        ? "데모 궤적"
                        : neptunStatus === "error"
                          ? "연결 오류"
                          : "연결 중"
              : "드론·순항·탄도 위치와 궤적 · 탄착 표시",
            checked: layerPrefs.showNeptun,
            onChange: setShowNeptun,
            accent: "orange",
          },
          {
            id: "east-asia-neon",
            label: "동아시아 대치·발사 지점",
            detail:
              [
                showChinaTaiwanIncidents && "대만",
                showChinaJapanIncidents && "일본",
                showChinaPhilippinesIncidents && "필리핀",
                showUsChinaIncidents && "미·중",
                showNorthKoreaMissileTests && "북한",
              ]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · 대치·발사 위치 (탄착은 미표시)",
            checked:
              showChinaTaiwanIncidents ||
              showChinaJapanIncidents ||
              showChinaPhilippinesIncidents ||
              showUsChinaIncidents ||
              showNorthKoreaMissileTests,
            onChange: (enabled) => {
              setShowChinaTaiwanIncidents(enabled);
              setShowChinaJapanIncidents(enabled);
              setShowChinaPhilippinesIncidents(enabled);
              setShowUsChinaIncidents(enabled);
              setShowNorthKoreaMissileTests(enabled);
            },
            accent: "red",
            presentation: "dropdown",
            options: [
              {
                id: "china-taiwan-incidents",
                label: "중국–대만 대치",
                detail: showChinaTaiwanIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "china-taiwan").length}곳`
                  : "꺼짐 · 대만해협·남중국해",
                checked: layerPrefs.showChinaTaiwanIncidents,
                onChange: setShowChinaTaiwanIncidents,
                accent: "red",
              },
              {
                id: "china-japan-incidents",
                label: "중국–일본 대치",
                detail: showChinaJapanIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "china-japan").length}곳`
                  : "꺼짐 · 동중국해·센카쿠",
                checked: layerPrefs.showChinaJapanIncidents,
                onChange: setShowChinaJapanIncidents,
                accent: "red",
              },
              {
                id: "china-philippines-incidents",
                label: "중국–필리핀 해상 충돌",
                detail: showChinaPhilippinesIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "china-philippines").length}곳`
                  : "꺼짐 · 남중국해",
                checked: layerPrefs.showChinaPhilippinesIncidents,
                onChange: setShowChinaPhilippinesIncidents,
                accent: "red",
              },
              {
                id: "us-china-incidents",
                label: "미국–중국 군사 마찰",
                detail: showUsChinaIncidents
                  ? `지점 ${chinaTheaterIncidentMarkers.filter((m) => m.dyad === "us-china").length}곳`
                  : "꺼짐 · 서태평양",
                checked: layerPrefs.showUsChinaIncidents,
                onChange: setShowUsChinaIncidents,
                accent: "red",
              },
              {
                id: "nk-missile-tests",
                label: "북한 미사일·무기 시험",
                detail: showNorthKoreaMissileTests
                  ? `발사·시험지 ${koreaMissileIncidentMarkers.length}곳`
                  : "꺼짐 · 발사·실험 위치만",
                checked: layerPrefs.showNorthKoreaMissileTests,
                onChange: setShowNorthKoreaMissileTests,
                accent: "orange",
              },
            ],
          },
          {
            id: "war-zones",
            label: "전쟁·교전 구역",
            detail: showWarZones
              ? `구역 ${disputeZoneOutlineCount.toLocaleString()}곳 · 빨간 빗금`
              : "꺼짐 · 실전투·폭격급 긴장",
            checked: layerPrefs.showWarZones,
            onChange: setShowWarZones,
            accent: "red",
          },
          {
            id: "lsib-boundary",
            label: "LSIB 국경선 (미 국무부)",
            detail: showLsibBoundary
              ? `${visibleLsibBoundary.length.toLocaleString()}개 · 실선(공식)·점선(분쟁)`
              : "꺼짐 · 공식 국경 + 분쟁·특수선",
            checked: layerPrefs.showLsibBoundary,
            onChange: setShowLsibBoundary,
            accent: "red",
          },
          {
            id: "diplomatic-tension",
            label: "외교 긴장 구역",
            detail: showDiplomaticTension
              ? `구역 ${disputeZoneOutlineCount.toLocaleString()}곳 · 주황 빗금`
              : "꺼짐 · 외교·영토 긴장",
            checked: layerPrefs.showDiplomaticTension,
            onChange: setShowDiplomaticTension,
            accent: "orange",
          },
          {
            id: "east-asia-adiz",
            label: "방공식별구역 (ADIZ)",
            detail: showEastAsiaAdiz
              ? "한·일·대만·북한·중국 ADIZ"
              : "꺼짐 · 동아시아 방공 식별망",
            checked: layerPrefs.showEastAsiaAdiz,
            onChange: setShowEastAsiaAdiz,
            accent: "blue",
          },
          {
            id: "island-chains",
            label: "도련선 · 미군 방어선",
            detail: showIslandChains
              ? "중국 도련(적) · 미 전방/심도(청) · 대만 펄스"
              : "꺼짐 · 인도·태평양 전략선",
            checked: layerPrefs.showIslandChains,
            onChange: setShowIslandChains,
            accent: "red",
          },
          {
            id: "newfeeds-iran",
            label: "이란·중동 공격 소식",
            detail: showNewfeedsIranAttacks
              ? newfeedsStatus === "loading"
                ? "불러오는 중…"
                : newfeedsStatus === "error"
                  ? "피드 오류"
                  : (() => {
                      const threat = localizeNewfeedsThreatLabel(
                        newfeedsThreatLabel,
                        labelLanguage,
                      );
                      return threat
                        ? `${threat} · ${newfeedsAttacks.length}건`
                        : `공격 지점 ${newfeedsAttacks.length}건`;
                    })()
              : "꺼짐 · 이란 국영·공식 매체 · 빨간 점",
            checked: layerPrefs.showNewfeedsIranAttacks,
            onChange: setShowNewfeedsIranAttacks,
            accent: "orange",
          },
          {
            id: "ukmto-incidents",
            label: "UKMTO 상선 피습·나포 경보",
            detail: showUkmtoIncidents
              ? ukmtoStatus === "loading"
                ? "불러오는 중…"
                : ukmtoStatus === "error"
                  ? "피드 오류"
                  : `경보 ${ukmtoIncidents.length.toLocaleString()}건 · 검은 원 빗금`
              : "꺼짐 · 홍해·호르무즈 등 · 비공식 소스",
            checked: layerPrefs.showUkmtoIncidents,
            onChange: setShowUkmtoIncidents,
            accent: "orange",
          },
          {
            id: "navarea-warnings",
            label: "NAVAREA 항행경보",
            detail: showNavareaWarnings
              ? navareaStatus === "loading"
                ? "불러오는 중…"
                : navareaStatus === "error"
                  ? "피드 오류"
                  : `유효 ${navareaFeatures.length.toLocaleString()}건 · 훈련·낙하지·케이블`
              : "꺼짐 · 일본 근해·대만 주변 · 보라 구역",
            checked: layerPrefs.showNavareaWarnings,
            onChange: setShowNavareaWarnings,
            accent: "violet",
          },
          {
            id: "military-exercises",
            label: "군사 훈련 구역",
            detail: showMilitaryExercises
              ? militaryExercisesStatus === "loading"
                ? "불러오는 중…"
                : militaryExercisesStatus === "error"
                  ? "피드 오류"
                  : `활성 ${militaryExercises.length.toLocaleString()}건 · 청록 구역 · 공시·OSINT`
              : "꺼짐 · 공시·OSINT · 항적은 보너스",
            checked: layerPrefs.showMilitaryExercises,
            onChange: setShowMilitaryExercises,
            accent: "cyan",
          },
          {
            id: "tzeva-adom",
            label: "이스라엘 로켓·공습 경보",
            detail: showTzevaAdom
              ? tzevaAdomActive.length > 0
                ? `지금 경보 ${tzevaAdomActive.length.toLocaleString()}건`
                : tzevaAdomLive
                  ? `감시 중 · 이력 ${tzevaAdomHistory.length.toLocaleString()}건`
                  : tzevaAdomStatus === "geo-blocked"
                    ? "지역 제한"
                    : tzevaAdomHistory.length > 0
                      ? `이력 ${tzevaAdomHistory.length.toLocaleString()}건`
                      : "대기 중"
              : "꺼짐 · 이스라엘 민방위(Oref)",
            checked: layerPrefs.showTzevaAdom,
            onChange: setShowTzevaAdom,
            accent: "red",
          },
          {
            id: "axis-network",
            label: "이란·중국·러시아·북한 관계망",
            detail: showAxisNetwork
              ? `연결 ${axisNetworkPaths.length.toLocaleString()} · 외교·군수·하이브리드`
              : "꺼짐 · 외교·군수 연계",
            checked: layerPrefs.showAxisNetwork,
            onChange: setShowAxisNetwork,
            accent: "emerald",
          },
          {
            id: "conflict-zones",
            label: "추정 전쟁지역 (데모)",
            detail: showConflictZones
              ? `${visibleConflictZones.length.toLocaleString()}곳 · ${zoom}`
              : "꺼짐 · 참고용 휴리스틱",
            checked: layerPrefs.showConflictZones,
            onChange: setShowConflictZones,
            accent: "red",
          },
          {
            id: "arms-embargo",
            label: "무기 금수 국가",
            detail: showArmsEmbargo
              ? `구역 ${armsEmbargoFramePaths.length.toLocaleString()}곳`
              : "꺼짐 · 유엔 등 금수",
            checked: layerPrefs.showArmsEmbargo,
            onChange: setShowArmsEmbargo,
            accent: "fuchsia",
          },
          {
            id: "ucdp",
            label: "분쟁 사건 기록",
            detail: showUcdpEvents
              ? `세계 분쟁·전쟁 기록 · ${UCDP_ATTRIBUTION_SHORT}`
              : "꺼짐 · UCDP 세계 분쟁 DB",
            checked: layerPrefs.showUcdpEvents,
            onChange: setShowUcdpEvents,
            accent: "red",
          },
          {
            id: "gdelt-war",
            label: "뉴스 · 전투·충돌",
            detail: showGdeltWar
              ? gdeltLoading
                ? "불러오는 중…"
                : ukraineGdeltNeonMarkers.length > 0
                  ? `${layerPanelGdeltCounts.war.toLocaleString()}건 · 우크라 ${ukraineGdeltNeonMarkers.length}`
                  : `${layerPanelGdeltCounts.war.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltWar,
            onChange: setShowGdeltWar,
            accent: "cyan",
            presentation: "tag",
          },
          {
            id: "gdelt-diplomatic",
            label: "뉴스 · 외교 긴장",
            detail: showGdeltDiplomatic
              ? gdeltLoading
                ? "불러오는 중…"
                : `${layerPanelGdeltCounts.diplomatic.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltDiplomatic,
            onChange: setShowGdeltDiplomatic,
            accent: "orange",
            presentation: "tag",
          },
          {
            id: "gdelt-ocean",
            label: "뉴스 · 대양 경쟁",
            detail: showGdeltOceanCompetition
              ? gdeltLoading
                ? "불러오는 중…"
                : "태평양 · 대서양 · 북극"
              : "꺼짐 · 대양 지정학",
            checked: layerPrefs.showGdeltOceanCompetition,
            onChange: setShowGdeltOceanCompetition,
            accent: "blue",
            presentation: "tag",
          },
          {
            id: "gdelt-protest",
            label: "뉴스 · 시위",
            detail: showGdeltProtests
              ? `${layerPanelGdeltCounts.protest.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showGdeltProtests,
            onChange: setShowGdeltProtests,
            accent: "blue",
            presentation: "tag",
          },
          {
            id: "telegram-osint",
            label: "텔레그램 전장 소식",
            detail: showTelegramOsint
              ? telegramStatus === "loading"
                ? `불러오는 중 · ${TELEGRAM_CHANNEL_COUNT}채널`
                : telegramLive
                  ? `소식 ${telegramAlerts.length.toLocaleString()}건`
                  : telegramStatus === "waiting"
                    ? telegramEmbedMode
                      ? "연결 대기"
                      : "수집기 필요"
                    : telegramAlerts.length > 0
                      ? `${telegramAlerts.length.toLocaleString()}건`
                      : telegramEmbedMode
                        ? `공개 ${TELEGRAM_CHANNEL_COUNT}채널`
                        : "대기 중"
              : "꺼짐 · 공개 채널",
            checked: layerPrefs.showTelegramOsint,
            onChange: setShowTelegramOsint,
            accent: "blue",
          },
        ],
        footer: (
          <>
            {showUkraineControl ? (
              <div className="mb-2 rounded-lg border border-red-300/15 bg-red-950/20 px-2.5 py-2.5">
                <UkraineFrontLegendContent
                  compact
                  controlDate={ukraineControlDate}
                  lodLabel={
                    viinaDisplay.lod.mode === "hidden"
                      ? "줌인 필요"
                      : viinaDisplay.lod.mode === "overview"
                        ? "개요"
                        : "상세"
                  }
                />
              </div>
            ) : null}
            {showGdeltLayers ? (
              <>
                <button
                  type="button"
                  onClick={() => startTransition(() => void refreshGdeltEvents())}
                  disabled={gdeltLoading}
                  className="w-full rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs text-orange-100 transition hover:border-orange-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {gdeltLoading ? "뉴스 불러오는 중…" : "뉴스 새로고침"}
                </button>
                {gdeltError ? <p className="mt-2 text-xs leading-5 text-red-200">{gdeltError}</p> : null}
                {gdeltFetchedAt ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    뉴스 갱신: {formatDateTime(gdeltFetchedAt)}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ),
        onToggleAll: (enabled) => {
          setShowDisputeLegendPanel(enabled);
          toggleCategoryPrefs({
            showUkraineControl: enabled,
            showNeptun: enabled,
            showWarZones: enabled,
            showDiplomaticTension: enabled,
            showEastAsiaAdiz: enabled,
            showIslandChains: enabled,
            showChinaTaiwanIncidents: enabled,
            showChinaJapanIncidents: enabled,
            showChinaPhilippinesIncidents: enabled,
            showUsChinaIncidents: enabled,
            showNorthKoreaMissileTests: enabled,
            showNewfeedsIranAttacks: enabled,
            showTzevaAdom: enabled,
            showUkmtoIncidents: enabled,
            showNavareaWarnings: enabled,
            showMilitaryExercises: enabled,
            showAxisNetwork: enabled,
            showConflictZones: enabled,
            showArmsEmbargo: enabled,
            showUcdpEvents: enabled,
            showGdeltWar: enabled,
            showGdeltDiplomatic: enabled,
            showGdeltProtests: enabled,
            showNeptunPreviousTrails: false,
          });
        },
      },
      {
        id: "energy",
        title: "에너지·자원",
        hint: "원유·가스 수송 · 발전·채굴 · 광물",
        items: [
          {
            id: "energy-pipelines",
            label: "원유·가스 수송망",
            detail:
              [
                showOilPipelines && "송유관",
                showGasPipelines && "가스관",
                showLngTerminals && "LNG",
                showSubseaPipelines && "해저관",
              ]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · 파이프라인·터미널",
            checked:
              showOilPipelines ||
              showGasPipelines ||
              showLngTerminals ||
              showSubseaPipelines,
            onChange: (enabled) => {
              setShowOilPipelines(enabled);
              setShowGasPipelines(enabled);
              setShowLngTerminals(enabled);
              setShowSubseaPipelines(enabled);
            },
            accent: "orange",
            presentation: "dropdown",
            options: [
              {
                id: "oil-pipelines",
                label: "송유관",
                detail: showOilPipelines
                  ? `${visibleOilPipelines.length.toLocaleString()}개`
                  : off(staticCounts.oilPipelines),
                checked: layerPrefs.showOilPipelines,
                onChange: setShowOilPipelines,
                accent: "orange",
              },
              {
                id: "gas-pipelines",
                label: "가스관",
                detail: showGasPipelines
                  ? `${visibleGasPipelines.length.toLocaleString()}개`
                  : off(staticCounts.gasPipelines),
                checked: layerPrefs.showGasPipelines,
                onChange: setShowGasPipelines,
                accent: "green",
              },
              {
                id: "lng-terminals",
                label: "LNG(액화가스) 터미널",
                detail: showLngTerminals
                  ? `${visibleStaticPoints.filter((p) => p.kind === "lng-terminal").length.toLocaleString()}곳`
                  : off(staticCounts.lngTerminals),
                checked: layerPrefs.showLngTerminals,
                onChange: setShowLngTerminals,
                accent: "orange",
              },
              {
                id: "subsea-pipelines",
                label: "해저 파이프라인",
                detail: showSubseaPipelines
                  ? `${visibleSubseaPipelines.length.toLocaleString()}개 · EMODnet`
                  : off(staticCounts.subseaPipelines),
                checked: layerPrefs.showSubseaPipelines,
                onChange: setShowSubseaPipelines,
                accent: "cyan",
              },
            ],
          },
          {
            id: "gem-resources",
            label: "발전·채굴·산업 시설",
            detail: (() => {
              const on = GEM_RESOURCE_LAYERS.filter((l) => Boolean(layerPrefs[l.prefKey])).length;
              return on > 0
                ? `${on}/${GEM_RESOURCE_LAYERS.length} 켜짐 · GEM`
                : "꺼짐 · 석탄·재생·석유가스·산업 (GEM)";
            })(),
            checked: GEM_RESOURCE_LAYERS.some((l) => Boolean(layerPrefs[l.prefKey])),
            onChange: (enabled) => {
              for (const layer of GEM_RESOURCE_LAYERS) {
                togglePref(layer.prefKey, enabled);
              }
            },
            accent: "amber",
            presentation: "dropdown",
            options: GEM_RESOURCE_GROUPS.map((group) => {
              const layers = group.layerIds
                .map((id) => gemLayerById(id))
                .filter((l): l is NonNullable<typeof l> => Boolean(l));
              const onCount = layers.filter((l) => Boolean(layerPrefs[l.prefKey])).length;
              const gemLang = labelLanguage === "en" ? "en" : "ko";
              const gemNames = layers
                .map((l) => (gemLang === "en" ? l.labelEn : l.labelKo))
                .join(" · ");
              return {
                id: group.id,
                label: gemLang === "en" ? group.labelEn : group.labelKo,
                detail:
                  onCount > 0
                    ? `${onCount}/${layers.length} 켜짐`
                    : `꺼짐 · ${gemNames}`,
                checked: onCount > 0,
                onChange: (enabled: boolean) => {
                  for (const layer of layers) togglePref(layer.prefKey, enabled);
                },
                accent: "orange" as const,
                presentation: "dropdown" as const,
                options: layers.map((layer) => {
                  const checked = Boolean(layerPrefs[layer.prefKey]);
                  const total = staticCounts.gemResources?.[layer.id] ?? 0;
                  const visible = visibleStaticPoints.filter((p) => p.kind === layer.kind).length;
                  return {
                    id: layer.id,
                    label: gemLang === "en" ? layer.labelEn : layer.labelKo,
                    detail: checked ? `${visible.toLocaleString()}곳` : off(total),
                    checked,
                    onChange: (v: boolean) => togglePref(layer.prefKey, v),
                    accent: "orange" as const,
                  };
                }),
              };
            }),
          },
          {
            id: "energy-other",
            label: "광물 매장지·원자력 시설",
            detail:
              [showResources && "광물", showNuclearSites && "원자력"]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · 매장지·원전·연구시설",
            checked: showResources || showNuclearSites,
            onChange: (enabled) => {
              setShowResources(enabled);
              setShowNuclearSites(enabled);
            },
            accent: "orange",
            presentation: "dropdown",
            options: [
              {
                id: "resources",
                label: "광물·자원 매장지",
                detail: showResources
                  ? `매장면 ${staticCounts.resourceDeposits ?? 0} · 점 ${staticCounts.resources ?? 0}`
                  : off(staticCounts.resources),
                checked: layerPrefs.showResources,
                onChange: setShowResources,
                accent: "orange",
              },
              {
                id: "nuclear",
                label: "원자력 시설",
                detail: showNuclearSites ? "발전소·연구시설" : "꺼짐",
                checked: layerPrefs.showNuclearSites,
                onChange: setShowNuclearSites,
                accent: "orange",
              },
            ],
          },
          {
            id: "newfeeds-iran",
            label: "이란·중동 공격 소식",
            detail: showNewfeedsIranAttacks
              ? newfeedsStatus === "loading"
                ? "불러오는 중…"
                : newfeedsStatus === "error"
                  ? "피드 오류"
                  : (() => {
                      const threat = localizeNewfeedsThreatLabel(
                        newfeedsThreatLabel,
                        labelLanguage,
                      );
                      return threat
                        ? `${threat} · ${newfeedsAttacks.length}건`
                        : `공격 지점 ${newfeedsAttacks.length}건 · 유가 민감`;
                    })()
              : "꺼짐 · 유가 민감 · 이란 국영·공식 · 빨간 점",
            checked: layerPrefs.showNewfeedsIranAttacks,
            onChange: setShowNewfeedsIranAttacks,
            accent: "orange",
          },
          {
            id: "ukmto-incidents",
            label: "UKMTO 상선 피습·나포 경보",
            detail: showUkmtoIncidents
              ? ukmtoStatus === "loading"
                ? "불러오는 중…"
                : ukmtoStatus === "error"
                  ? "피드 오류"
                  : `경보 ${ukmtoIncidents.length.toLocaleString()}건 · 물류 스트레스 신호`
              : "꺼짐 · 홍해·호르무즈 등 · 비공식 소스",
            checked: layerPrefs.showUkmtoIncidents,
            onChange: setShowUkmtoIncidents,
            accent: "orange",
          },
          {
            id: "navarea-warnings",
            label: "NAVAREA 항행경보",
            detail: showNavareaWarnings
              ? navareaStatus === "loading"
                ? "불러오는 중…"
                : navareaStatus === "error"
                  ? "피드 오류"
                  : `유효 ${navareaFeatures.length.toLocaleString()}건 · 물류·해상 제약`
              : "꺼짐 · 항행 폐쇄·훈련 구역",
            checked: layerPrefs.showNavareaWarnings,
            onChange: setShowNavareaWarnings,
            accent: "violet",
          },
          {
            id: "military-exercises",
            label: "군사 훈련 구역",
            detail: showMilitaryExercises
              ? militaryExercisesStatus === "loading"
                ? "불러오는 중…"
                : militaryExercisesStatus === "error"
                  ? "피드 오류"
                  : `활성 ${militaryExercises.length.toLocaleString()}건 · 해상·공역 제약 신호`
              : "꺼짐 · 공시 기반 훈련 구역",
            checked: layerPrefs.showMilitaryExercises,
            onChange: setShowMilitaryExercises,
            accent: "cyan",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showOilPipelines: enabled,
            showGasPipelines: enabled,
            showLngTerminals: enabled,
            showSubseaPipelines: enabled,
            showGemCoalPlants: enabled,
            showGemCoalMines: enabled,
            showGemCoalTerminals: enabled,
            showGemNuclear: enabled,
            showGemSolar: enabled,
            showGemWind: enabled,
            showGemHydro: enabled,
            showGemGeothermal: enabled,
            showGemBioenergy: enabled,
            showGemOilGasPlants: enabled,
            showGemOilGasExtraction: enabled,
            showGemIronOre: enabled,
            showGemCement: enabled,
            showGemSteel: enabled,
            showGemChemicals: enabled,
            showResources: enabled,
            showNuclearSites: enabled,
            showNewfeedsIranAttacks: enabled,
            showUkmtoIncidents: enabled,
            showNavareaWarnings: enabled,
            showMilitaryExercises: enabled,
          }),
      },
      {
        id: "transport",
        title: "운송 · 통신",
        hint: "항로 · 해저 케이블 · 공항·항구 · 요충지",
        items: [
          {
            id: "shipping",
            label: "해상 항로",
            detail: showShippingLanes
              ? `${visibleShipping.length.toLocaleString()}개 · ${zoom}`
              : off(staticCounts.shipping),
            checked: layerPrefs.showShippingLanes,
            onChange: setShowShippingLanes,
            accent: "blue",
          },
          ...(isEconomyViewer
            ? ([
                {
                  id: "us-dfc-supply",
                  label: "미국 DFC 개발금융망",
                  detail: showUsDfcSupplyChain
                    ? `호 ${usDfcSupplyPaths.length.toLocaleString()} · DFC Active Projects`
                    : "꺼짐 · 미국 개발금융 투자 대상국",
                  checked: layerPrefs.showUsDfcSupplyChain,
                  onChange: setShowUsDfcSupplyChain,
                  accent: "blue",
                },
                {
                  id: "bri-trade",
                  label: "일대일로 무역 연결",
                  detail: showBriTradeConnectivity
                    ? `호 ${briTradePaths.length.toLocaleString()} · World Bank BRI`
                    : "꺼짐 · 중국→참여국 운송시간 절감",
                  checked: layerPrefs.showBriTradeConnectivity,
                  onChange: setShowBriTradeConnectivity,
                  accent: "amber",
                },
              ] satisfies LayerToggleItem[])
            : []),
          {
            id: "cables",
            label: "해저 케이블",
            detail: showSubmarineCables
              ? `${visibleCables.length.toLocaleString()}개 · ${zoom}`
              : off(staticCounts.cables),
            checked: layerPrefs.showSubmarineCables,
            onChange: setShowSubmarineCables,
            accent: "blue",
          },
          {
            id: "tunnels",
            label: "해저터널",
            detail: showSubmarineTunnels
              ? `${visibleStaticPoints.filter((p) => p.kind === "submarine-tunnel").length.toLocaleString()}곳`
              : "꺼짐",
            checked: layerPrefs.showSubmarineTunnels,
            onChange: setShowSubmarineTunnels,
            accent: "blue",
          },
          {
            id: "airports",
            label: "공항",
            detail: showAirports
              ? `${visibleStaticPoints.filter((p) => p.kind === "airport").length.toLocaleString()}곳 · ${zoom}`
              : off(staticCounts.airports),
            checked: layerPrefs.showAirports,
            onChange: setShowAirports,
          },
          {
            id: "ports",
            label: "항구",
            detail: showPorts
              ? `${visibleStaticPoints.filter((p) => p.kind === "port").length.toLocaleString()}곳 · ${zoom}`
              : off(staticCounts.ports),
            checked: layerPrefs.showPorts,
            onChange: setShowPorts,
          },
          {
            id: "ixp",
            label: "인터넷 교환점",
            detail: showInternetExchanges ? "인터넷 거점" : "꺼짐",
            checked: layerPrefs.showInternetExchanges,
            onChange: setShowInternetExchanges,
            accent: "blue",
          },
          {
            id: "logistics-risk",
            label: "해상 요충·물류 거점",
            detail: showLogisticsRisk
              ? `${visibleStaticPoints.filter((p) => p.kind === "chokepoint" || p.kind === "logistics-hub").length.toLocaleString()}곳 · 해협·운하 등`
              : off(staticCounts.logisticsRisk),
            checked: layerPrefs.showLogisticsRisk,
            onChange: setShowLogisticsRisk,
            accent: "orange",
          },
          {
            id: "logistics-stress",
            label: "위험·정체 해협 색 표시",
            detail: showLogisticsStress
              ? "위험하거나 막힌 곳을 붉게 (UKMTO·PortWatch 기준)"
              : "꺼짐 · 모두 주황색",
            checked: layerPrefs.showLogisticsStress,
            onChange: setShowLogisticsStress,
            accent: "red",
          },
          ...(isEconomyViewer
            ? [
                {
                  id: "gscpi-gauge" as const,
                  label: "전 세계 물류 혼잡도",
                  detail: showGscpiGauge ? "우상단에 0~100 점수 표시" : "꺼짐",
                  checked: layerPrefs.showGscpiGauge,
                  onChange: setShowGscpiGauge,
                  accent: "emerald" as const,
                  modes: ["economy"] as Array<"conflict" | "economy">,
                },
              ]
            : []),
          {
            id: "critical-nodes",
            label: "핵심 인프라 노드",
            detail: showCriticalNodes
              ? `${visibleStaticPoints.filter((p) => p.kind === "critical-node").length.toLocaleString()}곳 · 전략 인프라`
              : off(staticCounts.criticalNodes ?? 31),
            checked: layerPrefs.showCriticalNodes,
            onChange: setShowCriticalNodes,
            accent: "orange",
          },
          {
            id: "ais",
            label:
              labelLanguage === "en"
                ? isEconomyViewer
                  ? "Civilian vessels (AIS)"
                  : "Military vessels (AIS)"
                : isEconomyViewer
                  ? "민간 선박 (AIS)"
                  : "군용 함정 (AIS)",
            detail: showAis
              ? labelLanguage === "en"
                ? `${isEconomyViewer ? "Civilian" : "Military"} ${aisVessels.length.toLocaleString()}`
                : `${isEconomyViewer ? "민간" : "군용"} ${aisVessels.length.toLocaleString()}척`
              : labelLanguage === "en"
                ? "Off"
                : "꺼짐",
            checked: layerPrefs.showAis,
            onChange: setShowAis,
            accent: "blue",
          },
          ...(isEconomyViewer
            ? []
            : [
                {
                  id: "weekly-ship-moves" as const,
                  label:
                    labelLanguage === "en"
                      ? "Weekly ship moves (public obs.)"
                      : "주간 함선 이동기 (공개 관측)",
                  detail: showWeeklyShipMoves
                    ? labelLanguage === "en"
                      ? `Map fixes ${weeklyShipMoveCount.toLocaleString()}`
                      : `지도 확정 ${weeklyShipMoveCount.toLocaleString()}건`
                    : labelLanguage === "en"
                      ? "Off"
                      : "꺼짐",
                  checked: layerPrefs.showWeeklyShipMoves,
                  onChange: setShowWeeklyShipMoves,
                  accent: "cyan" as const,
                },
                {
                  id: "reef-watch" as const,
                  label:
                    labelLanguage === "en"
                      ? "ReefWatch SCS features"
                      : "ReefWatch 남중국해 암초",
                  detail: showReefWatch
                    ? reefWatchStatus === "error"
                      ? labelLanguage === "en"
                        ? "Fetch error · cached features may be empty"
                        : "조회 실패 · 재시도 중"
                      : labelLanguage === "en"
                        ? `${reefWatchFeatureCount} features · ${reefWatchTrafficCount} aircraft`
                        : `관측지 ${reefWatchFeatureCount}곳 · 항적 ${reefWatchTrafficCount}`
                    : labelLanguage === "en"
                      ? "Off · OpenSky near reefs"
                      : "꺼짐 · 암초 근접 OpenSky",
                  checked: layerPrefs.showReefWatch,
                  onChange: setShowReefWatch,
                  accent: "cyan" as const,
                },
              ]),
          ...(isEconomyViewer
            ? []
            : [
                {
                  id: "disguised-vessels" as const,
                  label:
                    labelLanguage === "en"
                      ? "Spoofed & shadow fleet"
                      : "위장·그림자함대",
                  detail: showDisguisedVessels
                    ? disguisedLoading
                      ? labelLanguage === "en"
                        ? "Loading…"
                        : "불러오는 중…"
                      : labelLanguage === "en"
                        ? `Seed ${disguisedVessels.length.toLocaleString()} · illicit / dark fleet`
                        : `시드 ${disguisedVessels.length.toLocaleString()}척 · 불법 컨테이너/다크플리트`
                    : labelLanguage === "en"
                      ? "Off"
                      : "꺼짐",
                  checked: layerPrefs.showDisguisedVessels,
                  onChange: setShowDisguisedVessels,
                  accent: "fuchsia" as const,
                },
              ]),
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showShippingLanes: enabled,
            ...(isEconomyViewer
              ? {
                  showBriTradeConnectivity: enabled,
                  showUsDfcSupplyChain: enabled,
                }
              : {}),
            showSubmarineCables: enabled,
            showSubmarineTunnels: enabled,
            showAirports: enabled,
            showPorts: enabled,
            showInternetExchanges: enabled,
            showLogisticsRisk: enabled,
            showCriticalNodes: enabled,
            showAis: enabled,
            ...(isEconomyViewer
              ? {}
              : {
                  showDisguisedVessels: enabled,
                  showWeeklyShipMoves: enabled,
                  showReefWatch: enabled,
                }),
          }),
      },
      {
        id: "military",
        title: "군사 · 안보",
        hint: "기지, 항공, 정찰위성, 난민",
        items: [
          {
            id: "military-bases",
            label: "미군 기지",
            detail: showMilitaryBases
              ? `구역 ${visibleMilitaryBaseAreas.length.toLocaleString()} · 시설 ${
                  visibleStaticPoints.filter((p) => p.kind === "military-base").length
                }`
              : off(staticCounts.militaryBases),
            checked: layerPrefs.showMilitaryBases,
            onChange: setShowMilitaryBases,
            accent: "blue",
          },
          {
            id: "strategic-missile",
            label: "전략 미사일 시설",
            detail:
              [
                showMissileSilos && "사일로",
                showStrategicMissileBases && "RVSN",
                showMissileTestSites && "시험장",
                showMissileSiloFields && "조사격자",
              ]
                .filter(Boolean)
                .join(" · ") || "꺼짐 · PLARF·RVSN·남아시아",
            checked:
              showMissileSilos ||
              showStrategicMissileBases ||
              showMissileTestSites ||
              showMissileSiloFields,
            onChange: (enabled) => {
              setShowMissileSilos(enabled);
              setShowStrategicMissileBases(enabled);
              setShowMissileTestSites(enabled);
              setShowMissileSiloFields(enabled);
            },
            accent: "red",
            presentation: "dropdown",
            options: [
              {
                id: "missile-silos",
                label: "PLARF 미사일 사일로",
                detail: showMissileSilos
                  ? `사일로 ${visibleStaticPoints.filter((p) => p.kind === "missile-silo").length.toLocaleString()} · 위먼·하미·항긴기`
                  : off(staticCounts.missileSilos),
                checked: layerPrefs.showMissileSilos,
                onChange: setShowMissileSilos,
                accent: "red",
              },
              {
                id: "strategic-missile-bases",
                label: "러시아 전략미사일 부대",
                detail: showStrategicMissileBases
                  ? `주둔지 ${visibleStaticPoints.filter((p) => p.kind === "strategic-missile-base").length}`
                  : off(staticCounts.strategicMissileBases),
                checked: layerPrefs.showStrategicMissileBases,
                onChange: setShowStrategicMissileBases,
                accent: "red",
              },
              {
                id: "missile-test-sites",
                label: "인도·파키스탄 미사일 시험장",
                detail: showMissileTestSites
                  ? `시험장 ${visibleStaticPoints.filter((p) => p.kind === "missile-test-site").length}`
                  : off(staticCounts.missileTestSites),
                checked: layerPrefs.showMissileTestSites,
                onChange: setShowMissileTestSites,
                accent: "red",
              },
              {
                id: "missile-silo-fields",
                label: "PLARF 후보 조사 격자",
                detail: showMissileSiloFields
                  ? `격자 ${visibleMissileSiloFields.length.toLocaleString()} · 확인 사일로 아님`
                  : off(staticCounts.missileSiloFields),
                checked: layerPrefs.showMissileSiloFields,
                onChange: setShowMissileSiloFields,
                accent: "orange",
              },
            ],
          },
          {
            id: "military-air",
            label: "군사 항공기",
            detail: showMilitaryActivity
              ? `비행기 ${milAircraft.length.toLocaleString()}대 · ADS-B · Bellingcat hex`
              : "꺼짐",
            checked: layerPrefs.showMilitaryActivity,
            onChange: setShowMilitaryActivity,
            accent: "red",
          },
          {
            id: "intel",
            label: "정보 수집 거점",
            detail: showIntelHotspots ? "정찰·감시 거점" : "꺼짐",
            checked: layerPrefs.showIntelHotspots,
            onChange: setShowIntelHotspots,
            accent: "orange",
          },
          ...(isEconomyViewer
            ? []
            : [
                {
                  id: "recon-satellites",
                  label: "정찰위성",
                  detail: showReconSatellites
                    ? reconSatStatus === "loading"
                      ? "TLE 불러오는 중…"
                      : reconSatStatus === "error"
                        ? `TLE 로드 실패${reconSatError ? ` · ${reconSatError}` : ""}`
                        : reconSatCount > 0
                          ? `${reconSatCount.toLocaleString()}기 · SGP4 실시간`
                          : "CelesTrak 응답 없음 · 잠시 후 재시도"
                    : "꺼짐 · 공개 TLE 기반 위치",
                  checked: layerPrefs.showReconSatellites,
                  onChange: setShowReconSatellites,
                  accent: "violet" as const,
                },
                {
                  id: "gps-interference",
                  label: "GPS 재밍 (GPSJam)",
                  detail: showGpsInterference
                    ? gpsJamStatus === "loading"
                      ? "불러오는 중…"
                      : gpsJamStatus === "error"
                        ? "로드 실패 · 전전일 폴백 확인"
                        : `${gpsJamCellCount.toLocaleString()}셀 · ${gpsJamDate ?? "—"} · 솔로`
                    : "꺼짐 · ON 시 다른 레이어 숨김",
                  checked: layerPrefs.showGpsInterference,
                  onChange: setShowGpsInterference,
                  accent: "red" as const,
                  modes: ["conflict"] as Array<"conflict" | "economy">,
                },
              ]),
          {
            id: "refugee",
            label: "난민 캠프",
            detail: showRefugeeCamps ? "난민 수용 시설" : "꺼짐",
            checked: layerPrefs.showRefugeeCamps,
            onChange: setShowRefugeeCamps,
            accent: "orange",
          },
        ],
        footer: (
          <>
            <button
              type="button"
              onClick={() => startTransition(() => void refreshMilAircraft())}
              disabled={milLoading || !showMilitaryActivity}
              className="w-full rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-xs text-red-100 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {milLoading ? "군사 항공기 불러오는 중…" : "군사 항공기 새로고침"}
            </button>
            {milError ? <p className="mt-2 text-xs leading-5 text-red-200">{milError}</p> : null}
          </>
        ),
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showMilitaryBases: enabled,
            showMissileSilos: enabled,
            showStrategicMissileBases: enabled,
            showMissileTestSites: enabled,
            showMissileSiloFields: enabled,
            showMilitaryActivity: enabled,
            showIntelHotspots: enabled,
            ...(isEconomyViewer
              ? {}
              : {
                  showReconSatellites: enabled,
                  showGpsInterference: enabled,
                }),
            showRefugeeCamps: enabled,
          }),
      },
      {
        id: "live",
        title: "실시간 · 사건",
        hint: "화재, 사이버, 선거, 우주",
        items: [
          {
            id: "firms",
            label: "위성 화재 (NASA FIRMS)",
            detail: showFirmsFires
              ? `전장 열감지 ${visibleFirmsFires.length.toLocaleString()} · 폭격추정 ${firmsCombatFireIds.length.toLocaleString()}`
              : firmsError || "꺼짐 · 전장 권역만",
            checked: layerPrefs.showFirmsFires,
            onChange: setShowFirmsFires,
            accent: "orange",
          },
          {
            id: "cyber",
            label: "사이버 공격",
            detail: showCyberIncidents
              ? `${cyberEvents.length.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showCyberIncidents,
            onChange: setShowCyberIncidents,
            accent: "fuchsia",
          },
          {
            id: "election",
            label: "선거 사건",
            detail: showElectionEvents
              ? `${electionEvents.length.toLocaleString()}건`
              : "꺼짐",
            checked: layerPrefs.showElectionEvents,
            onChange: setShowElectionEvents,
            accent: "blue",
          },
          {
            id: "space",
            label: "우주 발사",
            detail: showSpaceLaunches ? "로켓·위성 발사 기록" : "꺼짐",
            checked: layerPrefs.showSpaceLaunches,
            onChange: setShowSpaceLaunches,
            accent: "blue",
          },
        ],
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showFirmsFires: enabled,
            showCyberIncidents: enabled,
            showElectionEvents: enabled,
            showSpaceLaunches: enabled,
          }),
      },
      {
        id: "economy",
        title: "경제 · 제재",
        hint: "허브, 데이터센터, 제재",
        items: [
          {
            id: "air-traffic",
            label: "항공기 운항",
            detail: showAirTraffic
              ? `민항 ${civAircraft.length.toLocaleString()}대 · 군용 제외`
              : "꺼짐",
            checked: layerPrefs.showAirTraffic,
            onChange: setShowAirTraffic,
            accent: "blue",
          },
          {
            id: "economic",
            label: "경제 중심지",
            detail: showEconomicCenters ? "금융·무역 허브" : "꺼짐",
            checked: layerPrefs.showEconomicCenters,
            onChange: setShowEconomicCenters,
            accent: "emerald",
          },
          {
            id: "ai-dc",
            label: "AI 데이터센터",
            detail: showAiDataCenters ? "데이터센터 시설" : "꺼짐",
            checked: layerPrefs.showAiDataCenters,
            onChange: setShowAiDataCenters,
            accent: "blue",
          },
          {
            id: "sanctions",
            label: "제재 대상",
            detail: showSanctionsEntities ? "제재 국가·기업" : "꺼짐",
            checked: layerPrefs.showSanctionsEntities,
            onChange: setShowSanctionsEntities,
            accent: "fuchsia",
          },
        ],
        footer: (
          <>
            <button
              type="button"
              onClick={() => startTransition(() => void refreshCivAircraft())}
              disabled={civLoading || !showAirTraffic}
              className="w-full rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs text-sky-100 transition hover:border-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {civLoading
                ? labelLanguage === "en"
                  ? "Loading civil tracks…"
                  : "민간 항적 불러오는 중…"
                : labelLanguage === "en"
                  ? "Refresh civil tracks"
                  : "민간 항적 새로고침"}
            </button>
            {civError ? <p className="mt-2 text-xs leading-5 text-red-200">{civError}</p> : null}
          </>
        ),
        onToggleAll: (enabled) =>
          toggleCategoryPrefs({
            showAirTraffic: enabled,
            showEconomicCenters: enabled,
            showAiDataCenters: enabled,
            showSanctionsEntities: enabled,
          }),
      },
    ];
    const allowed = new Set(viewerChromePreset.layerCategoryIds);
    const mode = isEconomyViewer ? "economy" : "conflict";
    const MODE_ONLY: Record<string, Array<"conflict" | "economy">> = {
      "military-bases": ["conflict"],
      "military-air": ["conflict"],
      intel: ["conflict"],
      "recon-satellites": ["conflict"],
      "gps-interference": ["conflict"],
      "disguised-vessels": ["conflict"],
      ucdp: ["conflict"],
      "gdelt-war": ["conflict"],
      "gdelt-protest": ["conflict"],
      "telegram-osint": ["conflict"],
      neptun: ["conflict"],
      "tzeva-adom": ["conflict"],
      "ai-dc": ["economy"],
      economic: ["economy"],
      sanctions: ["economy"],
      "air-traffic": ["economy"],
      "us-dfc-supply": ["economy"],
      "bri-trade": ["economy"],
      "gscpi-gauge": ["economy"],
    };
    const filterItems = (items: LayerToggleItem[]): LayerToggleItem[] =>
      items
        .map((item) => {
          const modes = item.modes ?? MODE_ONLY[item.id];
          if (modes && !modes.includes(mode)) return null;
          if (item.options?.length) {
            return { ...item, options: filterItems(item.options) };
          }
          return item;
        })
        .filter((x): x is LayerToggleItem => x != null);
    const filtered = allCategories
      .filter((cat) => allowed.has(cat.id as (typeof viewerChromePreset.layerCategoryIds)[number]))
      .map((cat) => ({ ...cat, items: filterItems(cat.items) }))
      .filter((cat) => cat.items.length > 0);
    return localizeLayerCategories(filtered, labelLanguage === "en" ? "en" : "ko");
    /* eslint-disable react-hooks/exhaustive-deps -- lpg() freezes deps when panel closed; setShow* use togglePref */
  }, [
    layerPanelActive,
    layerPanelReady,
    // 모드가 바뀌면 군사·안보 항목(정찰위성·GPS 재밍) 구성이 달라짐 — 반드시 재계산
    isEconomyViewer,
    lpg(layerPanelGdeltCounts.alliance, 0),
    lpg(layerPanelGdeltCounts.diplomatic, 0),
    lpg(layerPanelGdeltCounts.protest, 0),
    lpg(layerPanelGdeltCounts.war, 0),
    lpg(ukraineGdeltNeonMarkers.length, 0),
    lpg(aisVessels.length, 0),
    lpg(showWeeklyShipMoves, false),
    lpg(weeklyShipMoveCount, 0),
    lpg(showReefWatch, false),
    lpg(reefWatchFeatureCount, 0),
    lpg(reefWatchTrafficCount, 0),
    lpg(reefWatchStatus, "idle"),
    lpg(disguisedVessels.length, 0),
    lpg(disguisedLoading, false),
    lpg(disguisedError, null),
    lpg(armsEmbargoFramePaths.length, 0),
    lpg(cyberEvents.length, 0),
    lpg(disputeZoneOutlineCount, 0),
    lpg(electionEvents.length, 0),
    lpg(firmsError, null),
    lpg(gdeltError, null),
    lpg(gdeltFetchedAt, null),
    lpg(gdeltLoading, false),
    lpg(refreshGdeltEvents, null),
    lpg(showGdeltDiplomatic, false),
    lpg(showGdeltOceanCompetition, false),
    lpg(showGdeltLayers, false),
    lpg(showGdeltProtests, false),
    lpg(showGdeltWar, false),
    lpg(showUkmtoIncidents, false),
    lpg(ukmtoStatus, "idle"),
    lpg(ukmtoIncidents.length, 0),
    lpg(showNavareaWarnings, false),
    lpg(navareaStatus, "idle"),
    lpg(navareaFeatures.length, 0),
    lpg(showMilitaryExercises, false),
    lpg(militaryExercisesStatus, "idle"),
    lpg(militaryExercises.length, 0),
    lpg(labelPlaces.length, 0),
    lpg(globeLod.label, ""),
    lpg(milAircraft.length, 0),
    lpg(milError, null),
    lpg(milLoading, false),
    lpg(civAircraft.length, 0),
    lpg(civError, null),
    lpg(civLoading, false),
    lpg(showAirTraffic, false),
    lpg(railPaths.length, 0),
    lpg(refreshMilAircraft, null),
    lpg(refreshUsCarriers, null),
    lpg(showUsCarriers, false),
    lpg(usCarriers.length, 0),
    lpg(usCarriersLoading, false),
    lpg(showAis, false),
    lpg(showDisguisedVessels, false),
    lpg(showAiDataCenters, false),
    lpg(showArmsEmbargo, false),
    lpg(showCityLabels, false),
    lpg(showConflictZones, false),
    lpg(showCyberIncidents, false),
    lpg(showDiplomaticTension, false),
    lpg(showEastAsiaAdiz, false),
    lpg(showIslandChains, false),
    lpg(showChinaTaiwanIncidents, false),
    lpg(showChinaJapanIncidents, false),
    lpg(showChinaPhilippinesIncidents, false),
    lpg(showUsChinaIncidents, false),
    lpg(showNorthKoreaMissileTests, false),
    lpg(chinaTheaterIncidentMarkers.length, 0),
    lpg(koreaMissileIncidentMarkers.length, 0),
    lpg(showAxisNetwork, false),
    lpg(showBriTradeConnectivity, false),
    lpg(showUsDfcSupplyChain, false),
    lpg(showWarZones, false),
    lpg(showEconomicCenters, false),
    lpg(showElectionEvents, false),
    lpg(showFirmsFires, false),
    lpg(showGasPipelines, false),
    lpg(showSubseaPipelines, false),
    lpg(showIntelHotspots, false),
    lpg(showInternetExchanges, false),
    lpg(showLngTerminals, false),
    lpg(showMilitaryActivity, false),
    lpg(showMilitaryBases, false),
    lpg(showMissileSilos, false),
    lpg(showStrategicMissileBases, false),
    lpg(showMissileTestSites, false),
    lpg(showMissileSiloFields, false),
    lpg(visibleMissileSiloFields, []),
    lpg(showNuclearSites, false),
    lpg(showOilPipelines, false),
    lpg(showPorts, false),
    lpg(showLogisticsRisk, false),
    lpg(showLogisticsStress, false),
    lpg(showGscpiGauge, false),
    lpg(showCriticalNodes, false),
    lpg(showRailGlow, false),
    lpg(showRefugeeCamps, false),
    lpg(showResources, false),
    lpg(showSanctionsEntities, false),
    lpg(showShippingLanes, false),
    lpg(showLsibBoundary, false),
    lpg(visibleLsibBoundary.length, 0),
    lpg(showSpaceLaunches, false),
    lpg(showReconSatellites, false),
    lpg(reconSatCount, 0),
    lpg(reconSatStatus, "idle"),
    lpg(reconSatError, null),
    lpg(showGpsInterference, false),
    lpg(gpsJamStatus, "idle"),
    lpg(gpsJamCellCount, 0),
    lpg(gpsJamDate, null),
    lpg(showSubmarineCables, false),
    lpg(showSubmarineTunnels, false),
    lpg(showTelegramOsint, false),
    lpg(showTzevaAdom, false),
    lpg(showNewfeedsIranAttacks, false),
    lpg(showNeptun, false),
    lpg(showNeptunPreviousTrails, false),
    lpg(showUcdpEvents, false),
    lpg(showUkraineControl, false),
    lpg(ukraineControlDate, null),
    lpg(ukraineControlStatus, "idle"),
    lpg(ukraineRuCellCount, 0),
    lpg(viinaDisplay.lod.mode, "hidden"),
    lpg(ukraineMacroGeoJson.features.length, 0),
    lpg(viinaMeta?.featureCount, 0),
    lpg(telegramAlerts.length, 0),
    lpg(telegramLive, false),
    lpg(telegramStatus, "idle"),
    lpg(tzevaAdomActive.length, 0),
    lpg(tzevaAdomHistory.length, 0),
    lpg(tzevaAdomLive, false),
    lpg(tzevaAdomStatus, "idle"),
    lpg(newfeedsAttacks.length, 0),
    lpg(newfeedsLive, false),
    lpg(newfeedsStatus, "idle"),
    lpg(newfeedsThreatLabel, null),
    lpg(neptunThreats.length, 0),
    lpg(neptunArchivedThreats.length, 0),
    lpg(neptunAlertCount, 0),
    lpg(neptunFetchEnabled, false),
    lpg(neptunLive, false),
    lpg(neptunRenderMode, "hidden"),
    lpg(neptunStatus, "idle"),
    lpg(visibleNeptunArchived.length, 0),
    lpg(visibleNeptunThreats.length, 0),
    lpg(showAirports, false),
    lpg(staticCounts, null),
    lpg(toggleCategoryPrefs, null),
    lpg(visibleCables.length, 0),
    lpg(visibleConflictZones.length, 0),
    lpg(visibleFirmsFires.length, 0),
    lpg(visibleGasPipelines.length, 0),
    lpg(visibleMilitaryBaseAreas.length, 0),
    lpg(visibleOilPipelines.length, 0),
    lpg(visibleShipping.length, 0),
    lpg(visibleStaticPoints.length, 0),
    lpg(viewerChromePreset, null),
    lpg(telegramEmbedMode, false),
    lpg(viinaMeta?.available, false),
    labelLanguage,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */
}
