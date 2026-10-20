"use client";

import { useCallback, useEffect } from "react";
import { buildExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import { type AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import { createDashboardHtmlOverlayElement } from "@/components/globe/markers/createDashboardHtmlOverlayElement";
import type { CreateDashboardHtmlOverlayElementDeps } from "@/components/globe/markers/createDashboardHtmlOverlayElement";
import type {
  GlobeDisplayPoint,
  PolygonLayerFeature,
  Selection,
} from "@/components/globe/types";
import type {
  AisVessel,
  ConflictEvent,
  DisputeArea,
  MilitaryAircraft,
  StaticPoint,
  TransportPath,
  UsCarrier,
} from "@/data/geoTypes";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import {
  AIR_RAID_FLY_ALTITUDE,
  AIR_RAID_FLY_MS,
  AIR_RAID_FOCUS_HATCH_MS,
  AIR_RAID_SIREN_DELAY_MS,
  buildAirRaidFocusBox,
  buildAirRaidFocusHatchPaths,
  playAirRaidSirenAfterFly,
  type AirRaidFocusBox,
  type AirRaidSirenKind,
} from "@/lib/airRaidFocus";
import { selectedAxisLinkFromPath, type SelectedAxisLink } from "@/lib/axisLinkSelection";
import { selectedCorridorFromPath, type SelectedCorridor } from "@/lib/corridorSelection";
import { resolveDisputeCenter } from "@/lib/disputeCenter";
import { recordInterestFromSelection } from "@/lib/interest/recordInterest";
import {
  CARRIER_CLICK_CUES,
  cuesForAircraft,
  cuesForAisVessel,
  cuesForPathKind,
  cuesForStaticKind,
  emitLayerClickSounds,
  MIL_BASE_CUES,
} from "@/lib/infraClickSounds";
import type { LayerPrefs } from "@/lib/layerPrefs";
import { findMilitaryExercise } from "@/lib/militaryExerciseHatch";
import { findNavareaFeature, type NavareaFeaturePoint } from "@/lib/navareaHatch";
import { localizeNewfeedsLocation, localizeNewfeedsTitle } from "@/lib/newfeedsI18n";
import { trackEvent } from "@/lib/trackClient";
import { findUkmtoIncident, type UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import type { GevContactRow } from "@/lib/gevLiveTrack";

export type UseMapInteractionHandlersOptions = Pick<
  CreateDashboardHtmlOverlayElementDeps,
  | "layerAltitudeRef"
  | "layerAltitude"
  | "labelLanguage"
  | "isEconomyViewer"
  | "showLogisticsStress"
  | "chokeGlowColorById"
  | "usCarrierLabelOffsets"
  | "displayMilitaryExercises"
  | "combinedShipMovesMap"
  | "activeFrictionEpisode"
  | "activeTerritorialEpisode"
  | "skipNextGlobeClickRef"
  | "handleHtmlMarkerHover"
  | "openIntelFromCoords"
  | "flyTo"
  | "handleNeptunThreatSelect"
  | "selectFrictionStage"
  | "selectTerritorialStage"
  | "clearRegionNavSelection"
  | "closeEconInsight"
  | "setHoveredCarrier"
  | "setHoveredMilAircraft"
  | "setHoveredNeptunThreat"
  | "setSelected"
  | "setEconNavSelection"
  | "setEconNewsPanelReveal"
  | "setIntelSheetOpen"
  | "setNewsPerspectives"
  | "setEconomyAttackReaction"
  | "setExerciseBriefing"
  | "setShipMovesSelectedId"
  | "setShipMovesFocusGroupKey"
> & {
  isConflictViewer: boolean;
  /** 최신 레이어 prefs — 공습 사이렌 조건 판정용 */
  layerPrefsLiveRef: { current: LayerPrefs };
  historyImmersionRef: { current: boolean };
  /** 공습 포커스 빗금 자동 해제 타이머 id */
  airRaidFocusClearRef: { current: number | null };
  lastGlobeClickAt: { current: number };

  aisVessels: AisVessel[];
  milAircraft: MilitaryAircraft[];
  civAircraft: MilitaryAircraft[];
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];

  dismissLayerPanel: (...args: [boolean?]) => void;
  openCriticalNodeInsight: (criticalNodeId: string, compact: boolean) => void;
  openUkmtoBrief: (incident: UkmtoIncidentPoint) => void;
  openNavareaBrief: (feature: NavareaFeaturePoint) => void;
  disputeFromPath: (path: TransportPath) => DisputeArea | undefined;

  setAirRaidFocusBox: (box: AirRaidFocusBox | null) => void;
  setAirRaidFocusPaths: (paths: TransportPath[]) => void;
  setHubBriefOpen: (value: boolean) => void;
  setFrictionEpisodeBrief: (episode: FrictionEpisode | null) => void;
  setLivingTaiwanOpen: (value: boolean) => void;
  setHoveredPoint: (point: GlobeDisplayPoint | null) => void;
  setHoveredPolygon: (feature: PolygonLayerFeature | null) => void;
  setHoveredPath: (path: TransportPath | null) => void;
  setSelectedAxisLink: (link: SelectedAxisLink | null) => void;
  setSelectedCorridor: (corridor: SelectedCorridor | null) => void;
  setArmsHighlightPair: (pair: { a: string; b: string } | null) => void;
};

/**
 * 지도·글로브 클릭/호버 핸들러 묶음 — GlobeDashboard에서 추출 (분리 Phase C).
 * openSelection · 공습 포커스 · 항모/항공기/AIS 선택 · HTML 오버레이 엘리먼트 팩토리 ·
 * point/path/polygon/globe 클릭 라우팅.
 */
export function useMapInteractionHandlers(opts: UseMapInteractionHandlersOptions) {
  const {
    layerAltitudeRef,
    layerAltitude,
    labelLanguage,
    isEconomyViewer,
    isConflictViewer,
    showLogisticsStress,
    chokeGlowColorById,
    usCarrierLabelOffsets,
    displayMilitaryExercises,
    combinedShipMovesMap,
    activeFrictionEpisode,
    activeTerritorialEpisode,
    skipNextGlobeClickRef,
    layerPrefsLiveRef,
    historyImmersionRef,
    airRaidFocusClearRef,
    lastGlobeClickAt,
    aisVessels,
    milAircraft,
    civAircraft,
    ukmtoIncidents,
    navareaFeatures,
    handleHtmlMarkerHover,
    openIntelFromCoords,
    flyTo,
    handleNeptunThreatSelect,
    selectFrictionStage,
    selectTerritorialStage,
    clearRegionNavSelection,
    closeEconInsight,
    dismissLayerPanel,
    openCriticalNodeInsight,
    openUkmtoBrief,
    openNavareaBrief,
    disputeFromPath,
    setAirRaidFocusBox,
    setAirRaidFocusPaths,
    setHubBriefOpen,
    setFrictionEpisodeBrief,
    setLivingTaiwanOpen,
    setHoveredPoint,
    setHoveredCarrier,
    setHoveredMilAircraft,
    setHoveredNeptunThreat,
    setHoveredPolygon,
    setHoveredPath,
    setSelected,
    setSelectedAxisLink,
    setSelectedCorridor,
    setArmsHighlightPair,
    setEconNavSelection,
    setEconNewsPanelReveal,
    setIntelSheetOpen,
    setNewsPerspectives,
    setEconomyAttackReaction,
    setExerciseBriefing,
    setShipMovesSelectedId,
    setShipMovesFocusGroupKey,
  } = opts;

  const handleAirRaidFocus = useCallback(
    (
      target: AirRaidFocusTarget,
      kind: AirRaidSirenKind,
      options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
    ) => {
      flyTo(target.lat, target.lng, AIR_RAID_FLY_ALTITUDE, AIR_RAID_FLY_MS);
      // 공습경보 레이어 OFF면 사이렌 없음 (시각 포커스·빗금만)
      // 자동 fly: 도착 직후 재생 (delay ≈ fly duration)
      if (!options?.skipSiren) {
        const sirenDelay = options?.deferSirenUntilArrive
          ? AIR_RAID_FLY_MS
          : AIR_RAID_SIREN_DELAY_MS;
        playAirRaidSirenAfterFly(kind, sirenDelay, () => {
          // 자동 개입: 레이어 OFF여도 도착 직후 사이렌 (newfeeds 제외)
          if (options?.deferSirenUntilArrive) return kind !== "newfeeds";
          const prefs = layerPrefsLiveRef.current;
          if (kind === "tzeva") return prefs.showTzevaAdom;
          if (kind === "neptun") return prefs.showNeptun;
          return false;
        });
      }
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
        airRaidFocusClearRef.current = null;
      }
      const box = buildAirRaidFocusBox(target.lat, target.lng, kind);
      setAirRaidFocusBox(box);
      setAirRaidFocusPaths(
        buildAirRaidFocusHatchPaths(target.lat, target.lng, kind, target.label),
      );
      airRaidFocusClearRef.current = window.setTimeout(() => {
        setAirRaidFocusPaths([]);
        setAirRaidFocusBox(null);
        airRaidFocusClearRef.current = null;
      }, AIR_RAID_FOCUS_HATCH_MS);
    },
    [flyTo],
  );

  useEffect(() => {
    return () => {
      if (airRaidFocusClearRef.current != null) {
        window.clearTimeout(airRaidFocusClearRef.current);
      }
    };
  }, []);

  const openSelection = useCallback((next: Selection) => {
    dismissLayerPanel(true);
    setNewsPerspectives(null);
    setIntelSheetOpen(false);
    setEconNavSelection(null);
    setEconNewsPanelReveal(false);
    closeEconInsight();
    // 우측 분석 패널과 관점/양피지 동시 오픈 금지
    setHubBriefOpen(false);
    setFrictionEpisodeBrief(null);
    setLivingTaiwanOpen(false);
    if (!historyImmersionRef.current) {
      clearRegionNavSelection();
    }
    setSelected(next);
    recordInterestFromSelection(next);
  }, [clearRegionNavSelection, closeEconInsight, dismissLayerPanel]);

  const handleGevContactSelect = useCallback(
    (row: GevContactRow) => {
      if (row.kind === "ais") {
        const mmsi = row.id.replace(/^ais:/, "");
        const vessel = aisVessels.find((v) => v.mmsi === mmsi || v.id === mmsi);
        if (vessel) {
          openSelection({ kind: "ais", item: vessel });
          flyTo(vessel.lat, vessel.lng, 0.45);
        }
        return;
      }
      const hex = row.id.replace(/^(military|civil):/, "");
      if (row.kind === "military") {
        const ac = milAircraft.find((a) => a.hex === hex || a.id === hex);
        if (ac) {
          openSelection({ kind: "mil", item: ac, traffic: "military" });
          flyTo(ac.lat, ac.lng, 0.55);
        }
        return;
      }
      const ac = civAircraft.find((a) => a.hex === hex || a.id === hex);
      if (ac) {
        openSelection({ kind: "mil", item: ac, traffic: "civil" });
        flyTo(ac.lat, ac.lng, 0.55);
      }
    },
    [aisVessels, civAircraft, flyTo, milAircraft, openSelection],
  );

  function handlePointClick(event: ConflictEvent) {
    openIntelFromCoords(event.lat, event.lng, 0.92);
  }

  const handleCarrierSelect = useCallback((carrier: UsCarrier) => {
    emitLayerClickSounds(CARRIER_CLICK_CUES, { altitude: layerAltitude });
    openSelection({ kind: "us-carrier", item: carrier });
    flyTo(carrier.lat, carrier.lng, 0.75);
  }, [flyTo, layerAltitude, openSelection]);

  const handleMilAircraftSelect = useCallback((aircraft: MilitaryAircraft) => {
    emitLayerClickSounds(cuesForAircraft("military"), { altitude: layerAltitude });
    openSelection({ kind: "mil", item: aircraft, traffic: "military" });
    flyTo(aircraft.lat, aircraft.lng, 0.55);
  }, [flyTo, layerAltitude, openSelection]);

  const handleCivAircraftSelect = useCallback((aircraft: MilitaryAircraft) => {
    emitLayerClickSounds(cuesForAircraft("civil"), { altitude: layerAltitude });
    openSelection({ kind: "mil", item: aircraft, traffic: "civil" });
    flyTo(aircraft.lat, aircraft.lng, 0.55);
  }, [flyTo, layerAltitude, openSelection]);

  /**
   * 선박(AIS) — DOM Marker에서 symbol 레이어로 이전 (aisVesselSymbols.ts).
   * handleGlobePointClick의 "ais" 분기(저줌 map-points용)와 동일 로직 —
   * 여기는 고줌 symbol 레이어 클릭용.
   */
  const handleAisSymbolSelect = useCallback((vessel: AisVessel) => {
    skipNextGlobeClickRef.current = true;
    emitLayerClickSounds(
      cuesForAisVessel({
        disguised: Boolean(vessel.disguised),
        militaryKind: vessel.militaryKind,
      }),
      { altitude: layerAltitude },
    );
    openSelection({ kind: "ais", item: vessel });
    flyTo(vessel.lat, vessel.lng, 0.45);
  }, [flyTo, layerAltitude, openSelection, skipNextGlobeClickRef]);

  const handleAisSymbolHover = useCallback(
    (vessel: AisVessel | null) => {
      handleHtmlMarkerHover(vessel as unknown as GlobeDisplayPoint | null);
    },
    [handleHtmlMarkerHover],
  );

  const handleInfraStaticClick = useCallback(
    (point: { kind: string; lat: number; lng: number; id?: string; name?: string; meta?: Record<string, string | number | null> }) => {
      emitLayerClickSounds(cuesForStaticKind(point.kind), { altitude: layerAltitude });
      if (point.kind === "chokepoint") {
        openSelection({ kind: "chokepoint", item: point as StaticPoint });
      } else if (point.kind === "airport" || point.kind === "port") {
        openSelection({ kind: "static-infra", item: point as StaticPoint });
      }
      flyTo(point.lat, point.lng, point.kind === "airport" ? 0.55 : 0.72);
    },
    [flyTo, layerAltitude, openSelection],
  );

  const createHtmlOverlayElement = useCallback(
    (point: object) =>
      createDashboardHtmlOverlayElement(point, {
        layerAltitudeRef,
        layerAltitude,
        labelLanguage,
        isEconomyViewer,
        showLogisticsStress,
        chokeGlowColorById,
        usCarrierLabelOffsets,
        displayMilitaryExercises,
        combinedShipMovesMap,
        activeFrictionEpisode,
        activeTerritorialEpisode,
        skipNextGlobeClickRef,
        handleHtmlMarkerHover,
        openIntelFromCoords,
        openSelection,
        flyTo,
        handleAirRaidFocus,
        handleCarrierSelect,
        handleMilAircraftSelect,
        handleCivAircraftSelect,
        handleInfraStaticClick,
        handleNeptunThreatSelect,
        selectFrictionStage,
        selectTerritorialStage,
        clearRegionNavSelection,
        closeEconInsight,
        setHoveredCarrier,
        setHoveredMilAircraft,
        setHoveredNeptunThreat,
        setSelected,
        setEconNavSelection,
        setEconNewsPanelReveal,
        setIntelSheetOpen,
        setNewsPerspectives,
        setEconomyAttackReaction,
        setExerciseBriefing,
        setShipMovesSelectedId,
        setShipMovesFocusGroupKey,
      }),
    [
      activeFrictionEpisode,
      activeTerritorialEpisode,
      combinedShipMovesMap,
      displayMilitaryExercises,
      flyTo,
      handleAirRaidFocus,
      handleCarrierSelect,
      handleCivAircraftSelect,
      handleHtmlMarkerHover,
      handleInfraStaticClick,
      handleMilAircraftSelect,
      handleNeptunThreatSelect,
      labelLanguage,
      isEconomyViewer,
      showLogisticsStress,
      chokeGlowColorById,
      openIntelFromCoords,
      openSelection,
      clearRegionNavSelection,
      closeEconInsight,
      selectFrictionStage,
      selectTerritorialStage,
      usCarrierLabelOffsets,
      layerAltitude,
      setShipMovesFocusGroupKey,
    ],
  );

  function handleGlobePointClick(point: GlobeDisplayPoint) {
    if (
      point.displayKind === "static" ||
      point.displayKind === "mil" ||
      point.displayKind === "ais" ||
      point.displayKind === "firms-fire" ||
      point.displayKind === "conflict-cluster"
    ) {
      if (point.displayKind === "mil") {
        skipNextGlobeClickRef.current = true;
        emitLayerClickSounds(cuesForAircraft("military"), { altitude: layerAltitude });
        openSelection({ kind: "mil", item: point, traffic: "military" });
        flyTo(point.lat, point.lng, 0.55);
        return;
      }
      if (point.displayKind === "ais") {
        skipNextGlobeClickRef.current = true;
        emitLayerClickSounds(
          cuesForAisVessel({
            disguised: Boolean((point as AisVessel & { disguised?: boolean }).disguised),
            militaryKind: (point as AisVessel).militaryKind,
          }),
          { altitude: layerAltitude },
        );
        openSelection({ kind: "ais", item: point });
        flyTo(point.lat, point.lng, 0.45);
        return;
      }
      if (point.displayKind === "conflict-cluster") {
        skipNextGlobeClickRef.current = true;
        openIntelFromCoords(point.lat, point.lng, 0.85);
        return;
      }
      if (point.displayKind === "firms-fire") {
        flyTo(point.lat, point.lng, 0.65);
        return;
      }
      if (
        point.displayKind === "static" &&
        point.kind === "critical-node"
      ) {
        skipNextGlobeClickRef.current = true;
        const nodeId = String(point.meta?.criticalNodeId ?? "");
        if (nodeId) {
          flyTo(point.lat, point.lng, 0.72, 900, { pitch: 55, bearing: -20 });
          openCriticalNodeInsight(nodeId, isConflictViewer);
        }
        return;
      }
      if (point.displayKind === "static") {
        skipNextGlobeClickRef.current = true;
        handleInfraStaticClick(point);
        return;
      }
      return;
    }
    if (point.displayKind === "tzeva-adom") {
      handleAirRaidFocus(
        {
          lat: point.lat,
          lng: point.lng,
          label: point.region || point.title,
        },
        "tzeva",
      );
      return;
    }
    if (point.displayKind === "newfeeds-attack") {
      handleAirRaidFocus(
        {
          lat: point.lat,
          lng: point.lng,
          label:
            localizeNewfeedsLocation(point.location, labelLanguage) ||
            localizeNewfeedsTitle(point.title, labelLanguage),
        },
        "newfeeds",
      );
      if (isEconomyViewer) {
        const pub = point.publishedAt ? Date.parse(point.publishedAt) : NaN;
        const ageMinutes = Number.isFinite(pub)
          ? Math.max(0, Math.round((Date.now() - pub) / 60_000))
          : 60;
        setEconomyAttackReaction({
          ageMinutes,
          title: localizeNewfeedsTitle(point.title, labelLanguage) || point.title,
        });
      }
      return;
    }
    if (point.displayKind === "event") {
      handlePointClick(point);
    }
  }

  function handlePathClick(path: TransportPath) {
    const pathCues = cuesForPathKind(path.kind);
    if (pathCues) {
      emitLayerClickSounds(pathCues, { altitude: layerAltitude });
    }

    if (path.kind === "axis-link") {
      const link = selectedAxisLinkFromPath(path);
      if (!link) return;
      skipNextGlobeClickRef.current = true;
      setSelectedCorridor(null);
      setSelectedAxisLink(link);
      setArmsHighlightPair({ a: link.from, b: link.to });
      trackEvent("axis_link_click", {
        pathId: link.pathId,
        kind: link.relationKind ?? link.mode,
        from: link.from,
        to: link.to,
      });
      flyTo(link.midLat, link.midLng, 1.35);
      return;
    }

    if (path.kind === "crink-infra") {
      const category = String(path.meta?.crinkCategory ?? "");
      // 철도·도로 망 제외 — 공항·항만 등 고정 인프라만 선택 패널
      if (category !== "aeroway" && category !== "harbour") return;
      const mid = path.points[Math.floor(path.points.length / 2)] ?? path.points[0];
      if (!mid) return;
      skipNextGlobeClickRef.current = true;
      const kind = category === "aeroway" ? "airport" : "port";
      openSelection({
        kind: "static-infra",
        item: {
          id: path.id,
          kind,
          name: path.name || (kind === "airport" ? "Airport" : "Port"),
          lat: mid.lat,
          lng: mid.lng,
          tier: 1,
          meta: {
            crinkCategory: category,
            region: path.meta?.region ?? null,
            osmId: path.meta?.osmId ?? null,
          },
        },
      });
      flyTo(mid.lat, mid.lng, kind === "airport" ? 0.55 : 0.72);
      return;
    }

    if (path.kind === "strategic-corridor") {
      const corridor = selectedCorridorFromPath(path);
      if (!corridor) return;
      skipNextGlobeClickRef.current = true;
      setSelectedAxisLink(null);
      setSelectedCorridor(corridor);
      trackEvent("strategic_corridor_click", {
        corridorId: corridor.corridorId,
        gaugeBreak: corridor.gaugeBreak,
        euRailGateway: corridor.euRailGateway,
      });
      flyTo(corridor.midLat, corridor.midLng, corridor.gaugeBreak ? 0.55 : 1.1);
      return;
    }

    if (path.kind === "dispute-zone" || path.kind === "conflict-hatch") {
      const incident = findUkmtoIncident(ukmtoIncidents, path);
      if (incident) {
        openUkmtoBrief(incident);
        return;
      }
      const navarea = findNavareaFeature(navareaFeatures, path);
      if (navarea) {
        openNavareaBrief(navarea);
        return;
      }
      const exercise = findMilitaryExercise(displayMilitaryExercises, path);
      if (exercise) {
        const brief = buildExerciseBriefingContent(
          exercise,
          labelLanguage === "en" ? "en" : "ko",
        );
        if (brief) setExerciseBriefing(brief);
        return;
      }
    }

    const dispute =
      path.kind === "dispute-zone" || path.kind === "dispute-hatch"
        ? disputeFromPath(path)
        : undefined;
    if (!dispute) return;

    skipNextGlobeClickRef.current = true;
    const center = resolveDisputeCenter(dispute);
    openIntelFromCoords(center.lat, center.lng, 0.88);
  }

  function handlePolygonClick(feature: PolygonLayerFeature) {
    if (feature.polygonLayer === "country") {
      openSelection({ kind: "country", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 1.05);
      return;
    }

    if (feature.polygonLayer === "military-base") {
      emitLayerClickSounds(MIL_BASE_CUES, { altitude: layerAltitude });
      flyTo(feature.center.lat, feature.center.lng, 0.55);
      return;
    }

    if (feature.polygonLayer === "resource-deposit") {
      skipNextGlobeClickRef.current = true;
      flyTo(feature.center.lat, feature.center.lng, 0.7);
      return;
    }

    if (feature.polygonLayer === "missile-silo-field") {
      skipNextGlobeClickRef.current = true;
      emitLayerClickSounds(
        [{ eventId: "missile-silo", volumeScale: 0.55, durationMs: 5000 }],
        { altitude: layerAltitude },
      );
      flyTo(feature.center.lat, feature.center.lng, 0.55);
      return;
    }

    if (feature.polygonLayer === "missile-belt") {
      skipNextGlobeClickRef.current = true;
      flyTo(feature.center.lat, feature.center.lng, 0.72);
      return;
    }

    if (feature.polygonLayer === "conflict-zone") {
      openIntelFromCoords(feature.center.lat, feature.center.lng, 0.85);
      return;
    }

    if (
      feature.polygonLayer === "ukraine-ru" ||
      feature.polygonLayer === "ukraine-ua" ||
      feature.polygonLayer === "ukraine-contested"
    ) {
      openSelection({ kind: "ukraine-control", item: feature });
      flyTo(feature.center.lat, feature.center.lng, 0.72);
      return;
    }

    if (feature.polygonLayer === "gps-jam") {
      skipNextGlobeClickRef.current = true;
      flyTo(feature.center.lat, feature.center.lng, 1.15);
    }
  }

  function handleGlobeClick(coords: { lat: number; lng: number }) {
    if (skipNextGlobeClickRef.current) {
      skipNextGlobeClickRef.current = false;
      return;
    }

    // 빈 영역 클릭 시 이전 선택/호버 정보를 정리해 잔상 툴팁을 제거
    setSelected(null);
    setHoveredPoint(null);
    setHoveredCarrier(null);
    setHoveredMilAircraft(null);
    setHoveredPolygon(null);
    setHoveredPath(null);
    setSelectedAxisLink(null);
    setSelectedCorridor(null);
    setArmsHighlightPair(null);

    const now = Date.now();
    if (now - lastGlobeClickAt.current < 320) {
      flyTo(coords.lat, coords.lng, 0.12);
    }
    lastGlobeClickAt.current = now;
  }

  return {
    openSelection,
    handleAirRaidFocus,
    handleGevContactSelect,
    handlePointClick,
    handleCarrierSelect,
    handleMilAircraftSelect,
    handleCivAircraftSelect,
    handleAisSymbolSelect,
    handleAisSymbolHover,
    handleInfraStaticClick,
    createHtmlOverlayElement,
    handleGlobePointClick,
    handlePathClick,
    handlePolygonClick,
    handleGlobeClick,
  };
}
