"use client";

import type { MutableRefObject } from "react";
import type { FeatureCollection } from "geojson";
import type { PausedMapGlobeProps } from "@/components/globe/PausedMapGlobeView";
import type { ConflictZoneFeature, DisputeArea, DisputeOverview, TransportPath } from "@/data/geoTypes";
import type {
  FirmsFireGlobePoint,
  GlobeDisplayPoint,
  GlobeLabel,
  HtmlOverlayMarker,
  PolygonLayerFeature,
  PulseRingPoint,
  ViewState,
} from "@/components/globe/types";
import type { GlobeTextureConfig } from "@/lib/mapStyles";
import type { BasemapMode } from "@/lib/basemapMode";
import type { BasemapTone } from "@/lib/basemapTone";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AxisHubId } from "@/data/axisNetwork";
import type { AirRaidFocusBox } from "@/lib/airRaidFocus";
import type { NeptunPathElevationMode } from "@/lib/neptunFlightArc";
import type { GlobeLod } from "@/lib/globeLod";
import type { TensionHeatmapLayer } from "@/lib/tensionHeatmap";

import { pathLayerColors, infraColors } from "@/components/globe/constants";
import { warHeatmapColor, diplomaticHeatmapColor } from "@/lib/tensionHeatmap";
import { getZoomOutScale } from "@/lib/zoomScale";
import { EXTREME_ZOOM_ALTITUDE } from "@/lib/globeCamera";
import { staticPointColor, staticPointRadius } from "@/lib/staticGlobe";
import {
  aisCommercialPointColor,
  aisDisplayTypeLabel,
  aisMilitaryMapPointColor,
  isAisAspectHullMarker,
} from "@/lib/aisVesselClass";
import { aisVesselHeadingDeg } from "@/lib/aisVesselMarkers";
import { milAircraftMarkerRotationDeg } from "@/lib/milAircraftMarkers";
import { CARRIER_MARKER_ROOT_CLASS } from "@/lib/usCarrierMarkers";
import { applyCasualtyOverlayMetrics, getCasualtyOverlayScale } from "@/lib/warCasualtyOverlay";
import { applyNuclearOverlayScale, getNuclearOverlayScale } from "@/lib/nuclearStockpiles";
import { applyHtmlOverlayPointerEvents } from "@/components/globe/htmlOverlayPointerEvents";
import {
  getPlaceLabelColor,
  getPlaceLabelDotRadius,
  getPlaceLabelSize,
  getPlaceLabelTier,
} from "@/lib/placeLabelColors";
import { escapeHtml, getSafePlaceLabel, hostFromUrl, truncateOverview } from "@/components/globe/formatters";
import { hubById } from "@/data/hubNav";
import { AXIS_HUB_META } from "@/data/axisNetwork";
import {
  COUNTRY_BORDER_PATH_COLOR,
  COUNTRY_FILL_ALTITUDE,
  COUNTRY_TEXTURE_MODE_FILL,
  POLYGON_NO_STROKE,
} from "@/lib/countryColors";
import { mineralDepositFill, mineralDepositStroke } from "@/lib/resourceDepositStyle";
import { gpsJamDisclaimer, gpsJamLevelLabel } from "@/lib/gpsJam";
import {
  isUkraineViinaPolygonLayer,
  ukraineCombatZoneStroke,
  ukraineHatchStroke,
  ukraineThinOutlineStroke,
} from "@/components/globe/overlayPolygons";
import {
  getConflictZoneHatchColor,
  getConflictZoneOutlineColor,
  getDisputeHatchColor,
  getDisputeHatchStyle,
  getDisputeOutlineColor,
  isCombatHazard,
  parseConflictHatchGrade,
  TENSION_GRADE_STYLES,
} from "@/lib/disputeHatch";
import { briTradeStrokeWidth } from "@/lib/briTradePaths";
import { usDfcSupplyStrokeWidth } from "@/lib/usDfcSupplyPaths";
import { airRaidFocusBoxPolygon, isAirRaidFocusPath } from "@/lib/airRaidFocus";
import { HOVER, hatchStyleLabelLocalized, pathKindLabel, tensionLabel } from "@/lib/hoverLabels";
import { isFreshEvent, TIER_LABELS } from "@/data/eventTiers";
import { translateOrefRegion, translateOrefTitle, tzevaUi } from "@/lib/tzevaAdomI18n";
import {
  localizeNewfeedsCategory,
  localizeNewfeedsLocation,
  localizeNewfeedsSummary,
  localizeNewfeedsTitle,
  newfeedsUi,
} from "@/lib/newfeedsI18n";
import { NEWFEEDS_ATTRIBUTION_SHORT, severityColor, severityHint, severityLabel } from "@/lib/newfeeds";
import {
  ARMS_EMBARGO_STROKE_WIDTH,
  CONFLICT_ZONE_ALTITUDE,
  FLOW_PATH_KINDS,
  INFRA_STROKE,
  INTEL_MISSILE_ARC,
  INTEL_NASA_FIRE,
  STATIC_KIND_LABELS,
  TZEVA_ADOM_MARKER,
  UKRAINE_COMBAT_ZONE_LINE,
  UKRAINE_CONTESTED_FILL,
  UKRAINE_CONTESTED_STROKE,
  UKRAINE_CONTROL_ALTITUDE,
  UKRAINE_RU_CLAIM_LINE,
  UKRAINE_RU_FILL,
  UKRAINE_RU_FRONT_LINE,
  UKRAINE_RU_OCCUPIED_LINE,
  UKRAINE_RU_STROKE,
  UKRAINE_UA_CLAIM_LINE,
  UKRAINE_UA_FILL,
  UKRAINE_UA_FRONT_LINE,
  UKRAINE_UA_GAIN_LINE,
  UKRAINE_UA_OCCUPIED_LINE,
  UKRAINE_UA_STROKE,
  US_BASE_ALTITUDE,
  US_BASE_FILL,
  US_BASE_STROKE,
} from "@/components/globe/constants";

export interface UseGlobeMapGlobePropsParams {
  showLeftPanel: boolean;
  globeTextures: GlobeTextureConfig;
  basemapMode: BasemapMode;
  ultraLite: boolean;
  mapInteractiveLayerIds: readonly string[];
  showIslandChains: boolean;
  configureGlobe: () => void;
  handleGlobeMouseMove: (coords: { lat: number; lng: number } | null) => void;
  tensionHeatmaps: TensionHeatmapLayer[];
  isCameraMoving: boolean;
  globeDisplayPoints: GlobeDisplayPoint[];
  firmsDisplayPoints: FirmsFireGlobePoint[];
  viewState: ViewState;
  basemapTone: BasemapTone;
  firmsCombatFireIds: string[];
  labelLanguage: LabelLanguage;
  setHoveredPoint: (point: GlobeDisplayPoint | null) => void;
  handleGlobePointClick: (point: GlobeDisplayPoint) => void;
  conflictClusterRings: PulseRingPoint[];
  htmlOverlayMarkers: HtmlOverlayMarker[];
  createHtmlOverlayElement: (point: object) => HTMLElement;
  isViinaCloseZoom: boolean;
  showUkraineControl: boolean;
  layerAltitudeRef: MutableRefObject<number>;
  globeLabels: GlobeLabel[];
  showCityLabels: boolean;
  polygonDataWithUkraine: PolygonLayerFeature[];
  hubHighlightIsos: Set<string> | null;
  activeHubId: AxisHubId | null;
  gpsJamDate: string | null;
  handlePolygonClick: (feature: PolygonLayerFeature) => void;
  isCompactUi: boolean;
  setHoveredPolygon: (feature: PolygonLayerFeature | null) => void;
  globePaths: TransportPath[];
  airRaidFocusPaths: TransportPath[];
  airRaidFocusBox: AirRaidFocusBox | null;
  ukraineMacroGeoJson: FeatureCollection;
  ukraineMicroGeoJson: FeatureCollection;
  axisHubCountriesGeoJson: FeatureCollection;
  neptunPathElevation: NeptunPathElevationMode;
  tonedPathColors: ReturnType<typeof pathLayerColors>;
  tonedInfraColors: ReturnType<typeof infraColors>;
  tonedArmsEmbargoStroke: string;
  showRailGlow: boolean;
  globeLod: GlobeLod;
  disputeOverviews: Map<string, DisputeOverview>;
  disputeFromPath: (path: TransportPath) => DisputeArea | undefined;
  conflictZoneFromPath: (path: TransportPath) => ConflictZoneFeature | undefined;
  handlePathClick: (path: TransportPath) => void;
  setHoveredPath: (path: TransportPath | null) => void;
  handleGlobeClick: (coords: { lat: number; lng: number }) => void;
}

/** GlobeDashboard의 PausedMapGlobeView 접근자(pointColor·pathColor·polygon* 등) 전부를 이곳으로 이동.
 *  동작 변경 없이 로직만 이동 — 반환값은 GlobeMapCanvas에 그대로 스프레드된다. */
export function useGlobeMapGlobeProps(
  params: UseGlobeMapGlobePropsParams,
): Omit<PausedMapGlobeProps, "ref"> {
  const {
    showLeftPanel,
    globeTextures,
    basemapMode,
    ultraLite,
    mapInteractiveLayerIds,
    showIslandChains,
    configureGlobe,
    handleGlobeMouseMove,
    tensionHeatmaps,
    isCameraMoving,
    globeDisplayPoints,
    firmsDisplayPoints,
    viewState,
    basemapTone,
    firmsCombatFireIds,
    labelLanguage,
    setHoveredPoint,
    handleGlobePointClick,
    conflictClusterRings,
    htmlOverlayMarkers,
    createHtmlOverlayElement,
    isViinaCloseZoom,
    showUkraineControl,
    layerAltitudeRef,
    globeLabels,
    showCityLabels,
    polygonDataWithUkraine,
    hubHighlightIsos,
    activeHubId,
    gpsJamDate,
    handlePolygonClick,
    isCompactUi,
    setHoveredPolygon,
    globePaths,
    airRaidFocusPaths,
    airRaidFocusBox,
    ukraineMacroGeoJson,
    ukraineMicroGeoJson,
    axisHubCountriesGeoJson,
    neptunPathElevation,
    tonedPathColors,
    tonedInfraColors,
    tonedArmsEmbargoStroke,
    showRailGlow,
    globeLod,
    disputeOverviews,
    disputeFromPath,
    conflictZoneFromPath,
    handlePathClick,
    setHoveredPath,
    handleGlobeClick,
  } = params;

  return {
    interactionPaused: showLeftPanel,
    mapStyleUrl: globeTextures.mapStyleUrl,
    backgroundColor: globeTextures.backgroundColor,
    basemapMode,
    ultraLite,
    interactiveLayerIds: mapInteractiveLayerIds,
    showIslandChains,
    onGlobeReady: configureGlobe,
    onGlobeMouseMove: handleGlobeMouseMove,
    heatmapsData: tensionHeatmaps,
    heatmapPoints: (layer: { points: { lat: number; lng: number; weight: number }[] }) =>
      layer.points,
    heatmapPointLat: (point: { lat: number }) => point.lat,
    heatmapPointLng: (point: { lng: number }) => point.lng,
    heatmapPointWeight: (point: { weight: number }) => point.weight,
    heatmapBandwidth: (layer: { bandwidth: number }) => layer.bandwidth,
    heatmapColorSaturation: (layer: { colorSaturation: number }) =>
      isCameraMoving
        ? Math.max(0.45, layer.colorSaturation * 0.7)
        : layer.colorSaturation,
    heatmapColorFn: (layer: { tier: "war" | "diplomatic" }) =>
      layer.tier === "war" ? warHeatmapColor : diplomaticHeatmapColor,
    heatmapBaseAltitude: () => 0.003,
    heatmapTopAltitude: () => (isCameraMoving ? 0.0048 : 0.006),
    heatmapsTransitionDuration: 0,
    pointsData: globeDisplayPoints,
    firmsFiresData: firmsDisplayPoints,
    firmsLat: (fire: FirmsFireGlobePoint) => fire.lat,
    firmsLng: (fire: FirmsFireGlobePoint) => fire.lng,
    firmsCause: (fire: FirmsFireGlobePoint) => fire.soundKind,
    firmsFrp: (fire: FirmsFireGlobePoint) => fire.frp,
    firmsAngularRadius: (fire: FirmsFireGlobePoint) => {
      const frp = fire.frp ?? 0;
      const base = frp >= 50 ? 0.28 : frp >= 20 ? 0.22 : 0.17;
      return base * getZoomOutScale(viewState.altitude);
    },
    pointLat: (point: GlobeDisplayPoint) => point.lat,
    pointLng: (point: GlobeDisplayPoint) => point.lng,
    pointColor: (point: GlobeDisplayPoint) => {
      if (point.displayKind === "static") {
        if (point.kind === "critical-node") {
          const risk = String(point.meta?.risk ?? "");
          const role = String(point.meta?.focusRole ?? "");
          if (role === "primary") return "rgba(250, 204, 21, 0.98)";
          if (role === "cascade") return "rgba(52, 211, 153, 0.95)";
          if (risk === "critical") return "rgba(251, 113, 133, 0.95)";
          if (risk === "high") return "rgba(251, 191, 36, 0.92)";
          return "rgba(110, 231, 183, 0.88)";
        }
        return staticPointColor(point.kind, basemapTone);
      }
      if (point.displayKind === "mil") return "rgba(248, 113, 113, 0.92)";
      if (point.displayKind === "ais") {
        if (point.category === "military") {
          const hex = aisMilitaryMapPointColor(point.militaryKind);
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.92)`;
        }
        return aisCommercialPointColor(point.shipType);
      }
      if (point.displayKind === "firms-fire") {
        return INTEL_NASA_FIRE;
      }
      if (point.displayKind === "tzeva-adom") {
        return TZEVA_ADOM_MARKER;
      }
      if (point.displayKind === "newfeeds-attack") {
        return severityColor(point.severity);
      }
      if (point.displayKind === "conflict-cluster") {
        if (point.tension === "high") return "rgba(239, 68, 68, 0.92)";
        if (point.tension === "medium") return "rgba(249, 115, 22, 0.9)";
        return "rgba(250, 204, 21, 0.88)";
      }

      return "rgba(148, 163, 184, 0.8)";
    },
    pointRadius: (point: GlobeDisplayPoint) => {
      const alt = viewState.altitude;
      if (point.displayKind === "static") return staticPointRadius(point.kind, alt);
      if (point.displayKind === "mil") return 0.22 * getZoomOutScale(alt);
      if (point.displayKind === "ais") {
        return (point.category === "military" ? 0.2 : 0.14) * getZoomOutScale(alt);
      }
      if (point.displayKind === "firms-fire") {
        const frp = point.frp ?? 0;
        const base = frp >= 50 ? 0.28 : frp >= 20 ? 0.22 : 0.17;
        return base * getZoomOutScale(alt);
      }
      if (point.displayKind === "tzeva-adom") {
        return (point.active ? 0.42 : 0.28) * getZoomOutScale(alt);
      }
      if (point.displayKind === "newfeeds-attack") {
        const base =
          point.severity === "major"
            ? 0.32
            : point.severity === "high"
              ? 0.28
              : point.severity === "medium"
                ? 0.24
                : 0.16;
        return base * getZoomOutScale(alt);
      }
      if (point.displayKind === "conflict-cluster") {
        const base = point.tension === "high" ? 0.55 : point.tension === "medium" ? 0.42 : 0.32;
        return (
          Math.min(0.7, base + Math.log10(Math.max(10, point.eventCount)) * 0.08) *
          getZoomOutScale(alt)
        );
      }

      return 0.15 * getZoomOutScale(alt);
    },
    pointAltitude: () => 0.004,
    pointResolution:
      viewState.altitude < EXTREME_ZOOM_ALTITUDE ? 6 : isCameraMoving ? 8 : 14,
    pointsMerge: false,
    pointLabel: (point: GlobeDisplayPoint) => {
      if (point.displayKind === "static") {
        const metaLines = point.meta
          ? Object.entries(point.meta)
              .filter(([, value]) => value != null && value !== "")
              .slice(0, 3)
              .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(String(value))}`)
              .join("<br/>")
          : "";
        return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(STATIC_KIND_LABELS[point.kind])}</strong><br/>
                    ${escapeHtml(point.name)}
                    ${metaLines ? `<br/>${metaLines}` : ""}
                  </div>
                `;
      }
      if (point.displayKind === "mil") {
        return `
                  <div style="max-width: 280px">
                    <strong>군사 항공기 (ADS-B)</strong><br/>
                    ${escapeHtml(point.callsign || point.hex)}
                    ${point.type ? `<br/>기종 ${escapeHtml(point.type)}` : ""}
                    ${point.registration ? `<br/>등록 ${escapeHtml(point.registration)}` : ""}
                    ${point.altitude != null ? `<br/>고도 ${escapeHtml(String(point.altitude))} ft` : ""}
                    ${point.groundSpeed != null ? `<br/>속도 ${escapeHtml(String(point.groundSpeed))} kn` : ""}
                    ${point.track != null ? `<br/>침로 ${escapeHtml(String(Math.round(point.track)))}°` : ""}
                    ${point.squawk ? `<br/>스쿼크 ${escapeHtml(point.squawk)}` : ""}
                    ${point.emergency ? `<br/>비상 ${escapeHtml(point.emergency)}` : ""}
                  </div>
                `;
      }
      if (point.displayKind === "ais") {
        const kind =
          point.category === "military"
            ? "군용 함정"
            : point.category === "commercial"
              ? "민간 선박"
              : "선박";
        const typeLabel = aisDisplayTypeLabel(point, labelLanguage);
        return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(kind)} (AIS)</strong><br/>
                    ${escapeHtml(point.shipName || `MMSI ${point.mmsi}`)}
                    ${typeLabel ? `<br/>유형 ${escapeHtml(typeLabel)}` : ""}
                    ${point.speedOverGround != null ? `<br/>속력 ${escapeHtml(String(point.speedOverGround))} kn` : ""}
                  </div>
                `;
      }
      if (point.displayKind === "firms-fire") {
        const isBomb = firmsCombatFireIds.includes(point.id);
        return `
                  <div style="max-width: 280px">
                    <strong>${isBomb ? "폭격·화재 추정 (NASA FIRMS)" : "위성 화재 탐지 (NASA FIRMS)"}</strong><br/>
                    ${isBomb ? "전쟁 뉴스 인근 열감지<br/>" : ""}
                    ${point.acqDate ? `관측 ${escapeHtml(point.acqDate)}` : "관측 시각 미상"}
                    ${point.acqTime ? ` ${escapeHtml(point.acqTime)} UTC` : ""}
                    ${point.frp != null ? `<br/>FRP ${escapeHtml(String(point.frp))} MW` : ""}
                    ${point.confidence ? `<br/>신뢰도 ${escapeHtml(point.confidence)}` : ""}
                    ${point.satellite ? `<br/>${escapeHtml(point.satellite)}` : ""}
                  </div>
                `;
      }
      if (point.displayKind === "conflict-cluster") {
        return `
                  <div style="max-width: 280px">
                    <strong>AI 전쟁지역 (데모)</strong><br/>
                    ${escapeHtml(point.name)}<br/>
                    이벤트 ${point.eventCount.toLocaleString()} · 긴장도 ${escapeHtml(point.tension)}
                  </div>
                `;
      }
      if (point.displayKind === "tzeva-adom") {
        const regionKo = translateOrefRegion(point.region || "", labelLanguage);
        const titleKo = translateOrefTitle(point.title || point.region || "", labelLanguage);
        return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(tzevaUi("brand", labelLanguage))}</strong><br/>
                    ${escapeHtml(titleKo)}
                    ${regionKo ? `<br/>${escapeHtml(regionKo)}` : ""}
                  </div>
                `;
      }
      if (point.displayKind === "newfeeds-attack") {
        const sevLabel = severityLabel(point.severity, labelLanguage);
        const sevHint = severityHint(point.severity, labelLanguage);
        const title = localizeNewfeedsTitle(point.title, labelLanguage);
        const summary = localizeNewfeedsSummary(point.summary, labelLanguage);
        const location = localizeNewfeedsLocation(point.location, labelLanguage);
        const category = localizeNewfeedsCategory(point.category, labelLanguage);
        return `
                  <div style="max-width: 300px">
                    <strong>${escapeHtml(newfeedsUi("popupBrand", labelLanguage))}</strong><br/>
                    <span style="opacity:.9">${escapeHtml(sevLabel)}</span>
                    <span style="opacity:.65"> — ${escapeHtml(sevHint)}</span><br/>
                    ${escapeHtml(title)}
                    ${summary ? `<br/><span style="opacity:.8">${escapeHtml(summary.slice(0, 160))}${summary.length > 160 ? "…" : ""}</span>` : ""}
                    ${location ? `<br/>${escapeHtml(location)}` : ""}
                    ${category ? `<br/>${escapeHtml(category)}` : ""}
                    <br/><span style="opacity:.75">${escapeHtml(point.sourceName)} · ${escapeHtml(NEWFEEDS_ATTRIBUTION_SHORT)}</span>
                  </div>
                `;
      }
      if (point.displayKind !== "event") return "";

      const tier = point.eventTier ?? "war";
      return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(TIER_LABELS[tier])}</strong>
                    ${isFreshEvent(point) ? " · <span style='color:#facc15'>최신 속보</span>" : ""}<br/>
                    ${escapeHtml(point.category)}${point.eventDate ? ` · ${escapeHtml(point.eventDate)}` : ""}<br/>
                    ${point.actor1Country || point.actor2Country ? `행위자 ${escapeHtml(point.actor1Country || "?")} ↔ ${escapeHtml(point.actor2Country || "?")}<br/>` : ""}
                    ${escapeHtml(hostFromUrl(point.sourceUrl))}
                  </div>
                `;
    },
    onPointHover: (point: GlobeDisplayPoint | null) => {
      setHoveredPoint(point);
    },
    onPointClick: (point: GlobeDisplayPoint) => handleGlobePointClick(point),
    ringsData: conflictClusterRings,
    ringLat: (point: PulseRingPoint) => point.lat,
    ringLng: (point: PulseRingPoint) => point.lng,
    ringAltitude: () => 0.005,
    ringColor: (point: PulseRingPoint) => {
      if (point.pulseKind === "recon-horizon") {
        return point.color;
      }
      if (point.pulseKind === "choke-glow") {
        const base = point.color ?? "rgba(251, 146, 60, 1)";
        if (base.startsWith("#")) {
          // hex → rgba with glow alpha
          const hex = base.replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, ${0.22 + point.glow * 0.28})`;
        }
        return `rgba(251, 146, 60, ${0.22 + point.glow * 0.28})`;
      }
      if (point.pulseKind === "claim" || point.pulseKind === "friction") {
        return point.color;
      }
      if (point.pulseKind === "ship-movement") {
        return point.color;
      }
      if (point.pulseKind === "firms-bomb") {
        const frp = point.frp ?? 0;
        if (frp >= 50) return "rgba(255, 69, 0, 0.7)";
        if (frp >= 20) return "rgba(239, 68, 68, 0.62)";
        return "rgba(251, 146, 60, 0.55)";
      }
      if (point.tension === "high") return "rgba(239,68,68,0.55)";
      if (point.tension === "medium") return "rgba(249,115,22,0.5)";
      return "rgba(250,204,21,0.45)";
    },
    ringMaxRadius: (point: PulseRingPoint) => {
      const scale = getZoomOutScale(viewState.altitude);
      if (point.pulseKind === "recon-horizon") {
        return point.radiusScale;
      }
      if (point.pulseKind === "choke-glow") {
        return (2.4 + point.glow * 2.2) * scale;
      }
      if (point.pulseKind === "claim" || point.pulseKind === "friction") {
        return point.radiusScale * scale;
      }
      if (point.pulseKind === "ship-movement") {
        return point.radiusScale * scale;
      }
      if (point.pulseKind === "firms-bomb") {
        const frp = point.frp ?? 0;
        const base = frp >= 50 ? 2.4 : frp >= 20 ? 1.9 : 1.45;
        return base * scale;
      }
      const base =
        point.tension === "high" ? 1.8 : point.tension === "medium" ? 1.35 : 1.0;
      return base * scale;
    },
    ringPropagationSpeed: (point: PulseRingPoint) => {
      if (point.pulseKind === "recon-horizon") return 0.35;
      if (point.pulseKind === "choke-glow") return 0.55;
      if (point.pulseKind === "claim" || point.pulseKind === "friction") return 0.85;
      if (point.pulseKind === "ship-movement") return 0.55;
      return 2.2;
    },
    htmlElementsData: htmlOverlayMarkers,
    htmlLat: (point: HtmlOverlayMarker) =>
      point.displayKind === "recon-sat-html"
        ? (point.orbitLat ?? point.lat)
        : point.lat,
    htmlLng: (point: HtmlOverlayMarker) =>
      point.displayKind === "recon-sat-html"
        ? (point.orbitLng ?? point.lng)
        : point.lng,
    htmlAltitude: (point: HtmlOverlayMarker) =>
      point.displayKind === "casualty-skull"
        ? 0.0008
        : point.displayKind === "recon-sat-html"
          ? 0.012
          : 0.004,
    htmlElement: createHtmlOverlayElement,
    htmlRotation: (point: HtmlOverlayMarker) => {
      if (point.displayKind === "recon-sat-html") {
        return point.headingDeg ?? 0;
      }
      if (point.displayKind === "mil-html" || point.displayKind === "civ-html") {
        return milAircraftMarkerRotationDeg(point);
      }
      if (point.displayKind === "ais-html") {
        // 수상전투함·잠수함·그림자함대: 8방위 실루엣이 진행 방향을 담음 → Marker 회전 없음
        if (isAisAspectHullMarker(point.militaryKind) || point.disguised) return 0;
        return aisVesselHeadingDeg(point) ?? 0;
      }
      return 0;
    },
    htmlRotationAlignment: (point: HtmlOverlayMarker) => {
      if (point.displayKind === "recon-sat-html") {
        return "map";
      }
      if (point.displayKind === "mil-html" || point.displayKind === "civ-html") {
        return "map";
      }
      if (point.displayKind === "ais-html") {
        if (isAisAspectHullMarker(point.militaryKind) || point.disguised) {
          return "viewport";
        }
        return "map";
      }
      return "viewport";
    },
    htmlElementVisibilityModifier: (el: HTMLElement, isVisible: boolean) => {
      el.style.opacity = isVisible ? "1" : "0";
      applyHtmlOverlayPointerEvents(el, isVisible);
      if (el.classList.contains(CARRIER_MARKER_ROOT_CLASS)) {
        const stackY = Number(el.dataset.stackOffsetY || 0);
        el.style.transform = isVisible
          ? `translate(-50%, calc(-50% + ${stackY}px)) scale(1)`
          : `translate(-50%, calc(-50% + ${stackY}px)) scale(0.86)`;
        return;
      }
      if (el.classList.contains("casualty-skull-marker")) {
        const span = Number(el.dataset.territorySpan || 10);
        const scale = getCasualtyOverlayScale(
          layerAltitudeRef.current,
          Number.isFinite(span) ? span : 10,
        );
        applyCasualtyOverlayMetrics(el, scale, isVisible);
        el.style.pointerEvents = isVisible ? "auto" : "none";
        return;
      }
      if (el.classList.contains("nuclear-icbm-marker")) {
        const scale = getNuclearOverlayScale(layerAltitudeRef.current);
        applyNuclearOverlayScale(el, scale, isVisible);
        el.style.pointerEvents = isVisible ? "auto" : "none";
        return;
      }
      if (el.classList.contains("gdelt-news-alert-marker")) {
        el.style.transform = isVisible
          ? "translate(-50%, -100%) scale(1)"
          : "translate(-50%, -100%) scale(0.86)";
        return;
      }
      if (el.classList.contains("situation-callout") || el.classList.contains("ua-callout")) {
        el.style.transform = isVisible
          ? "translate(-50%, -100%) scale(1)"
          : "translate(-50%, -100%) scale(0.86)";
        return;
      }
      if (el.classList.contains("neon-ripple-incident-marker")) {
        el.style.transform = isVisible
          ? "translate(-50%, -50%) scale(1)"
          : "translate(-50%, -50%) scale(0.86)";
        return;
      }
      if (el.classList.contains("friction-episode-pin") || el.classList.contains("friction-stage-callout")) {
        el.style.transform = isVisible
          ? "translate(-50%, -100%) scale(1)"
          : "translate(-50%, -100%) scale(0.86)";
        return;
      }
      if (el.classList.contains("ship-movement-pin")) {
        el.style.transform = isVisible
          ? "translate(-50%, -50%) scale(1)"
          : "translate(-50%, -50%) scale(0.86)";
        return;
      }
      el.style.transform = isVisible
        ? "translate(-50%, -50%) scale(1)"
        : "translate(-50%, -50%) scale(0.86)";
    },
    htmlTransitionDuration: isViinaCloseZoom && showUkraineControl ? 0 : 280,
    labelsData: globeLabels,
    labelLat: (item: GlobeLabel) => item.lat,
    labelLng: (item: GlobeLabel) => item.lng,
    labelText: (item: GlobeLabel) => getSafePlaceLabel(item, labelLanguage),
    labelSize: (item: GlobeLabel) =>
      getPlaceLabelSize(
        getPlaceLabelTier(item.population, item.type, item.scalerank),
        viewState.altitude,
      ),
    labelIncludeDot: () => true,
    labelDotRadius: (item: GlobeLabel) =>
      getPlaceLabelDotRadius(
        getPlaceLabelTier(item.population, item.type, item.scalerank),
        viewState.altitude,
      ),
    labelColor: (item: GlobeLabel) => {
      const tier = getPlaceLabelTier(item.population, item.type, item.scalerank);
      return getPlaceLabelColor(tier, showCityLabels, basemapTone);
    },
    labelResolution: 2,
    labelsTransitionDuration: 0,
    labelAltitude: () => 0.006,
    polygonsData: polygonDataWithUkraine,
    polygonGeoJsonGeometry: (feature: PolygonLayerFeature) => feature.geometry,
    polygonCapColor: (feature: PolygonLayerFeature) => {
      if (feature.polygonLayer === "country") {
        if (
          hubHighlightIsos &&
          feature.isoA3 &&
          hubHighlightIsos.has(feature.isoA3) &&
          activeHubId
        ) {
          const isHub = feature.isoA3 === hubById(activeHubId)?.iso;
          return isHub
            ? AXIS_HUB_META[activeHubId].color.replace(/,\s*[\d.]+\)$/, ", 0.28)")
            : AXIS_HUB_META[activeHubId].color.replace(/,\s*[\d.]+\)$/, ", 0.14)");
        }
        return COUNTRY_TEXTURE_MODE_FILL;
      }
      if (feature.polygonLayer === "military-base") return US_BASE_FILL;
      if (feature.polygonLayer === "resource-deposit") {
        return mineralDepositFill(feature.mineral);
      }
      if (feature.polygonLayer === "missile-silo-field") {
        return "rgba(180, 83, 9, 0.18)";
      }
      if (feature.polygonLayer === "missile-belt") {
        if (feature.tier === "tactical") return "rgba(248, 113, 113, 0.2)";
        if (feature.tier === "operational") return "rgba(234, 88, 12, 0.22)";
        if (feature.tier === "strategic") return "rgba(153, 27, 27, 0.26)";
        return "rgba(185, 28, 28, 0.24)";
      }
      if (feature.polygonLayer === "conflict-zone") {
        return COUNTRY_TEXTURE_MODE_FILL;
      }
      if (feature.polygonLayer === "ukraine-ru") return UKRAINE_RU_FILL;
      if (feature.polygonLayer === "ukraine-ua") return UKRAINE_UA_FILL;
      if (feature.polygonLayer === "ukraine-contested") return UKRAINE_CONTESTED_FILL;
      if (feature.polygonLayer === "gps-jam") {
        const hex = feature.fill;
        const a = feature.level === "high" ? "0.42" : "0.28";
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${a})`;
      }
      return COUNTRY_TEXTURE_MODE_FILL;
    },
    polygonFillOpacity: (feature: PolygonLayerFeature) => {
      if (isUkraineViinaPolygonLayer(feature.polygonLayer)) return 1;
      if (feature.polygonLayer === "gps-jam") return 1;
      if (feature.polygonLayer === "resource-deposit") return 0.88;
      if (feature.polygonLayer === "missile-silo-field") return 0.55;
      if (feature.polygonLayer === "missile-belt") return 0.5;
      return 0.72;
    },
    // sideColor 미설정 — falsy(undefined)는 polished 파서에서 런타임 오류 유발
    polygonStrokeColor: (feature: PolygonLayerFeature) => {
      if (feature.polygonLayer === "country") {
        if (
          hubHighlightIsos &&
          feature.isoA3 &&
          hubHighlightIsos.has(feature.isoA3) &&
          activeHubId
        ) {
          return AXIS_HUB_META[activeHubId].color;
        }
        return POLYGON_NO_STROKE;
      }
      if (feature.polygonLayer === "military-base") return US_BASE_STROKE;
      if (feature.polygonLayer === "resource-deposit") {
        return mineralDepositStroke(feature.mineral);
      }
      if (feature.polygonLayer === "missile-silo-field") {
        return "rgba(180, 83, 9, 0.55)";
      }
      if (feature.polygonLayer === "missile-belt") {
        if (feature.tier === "operational") return "rgba(251, 146, 60, 0.8)";
        if (feature.tier === "strategic" || feature.tier === "silo-field") {
          return "rgba(220, 38, 38, 0.85)";
        }
        return "rgba(248, 113, 113, 0.75)";
      }
      if (feature.polygonLayer === "conflict-zone") return "rgba(248,113,113,0.7)";
      if (feature.polygonLayer === "ukraine-ru") return UKRAINE_RU_STROKE;
      if (feature.polygonLayer === "ukraine-ua") return UKRAINE_UA_STROKE;
      if (feature.polygonLayer === "ukraine-contested") return UKRAINE_CONTESTED_STROKE;
      if (feature.polygonLayer === "gps-jam") {
        const hex = feature.fill;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},0.85)`;
      }
      return POLYGON_NO_STROKE;
    },
    polygonAltitude: (feature: PolygonLayerFeature) => {
      if (feature.polygonLayer === "country") return COUNTRY_FILL_ALTITUDE;
      if (feature.polygonLayer === "military-base") return US_BASE_ALTITUDE;
      if (feature.polygonLayer === "resource-deposit") return 0.0035;
      if (feature.polygonLayer === "missile-silo-field") return 0.0025;
      if (feature.polygonLayer === "missile-belt") return 0.003;
      if (feature.polygonLayer === "conflict-zone") return CONFLICT_ZONE_ALTITUDE;
      if (feature.polygonLayer === "gps-jam") return 0.01;
      if (isUkraineViinaPolygonLayer(feature.polygonLayer)) {
        return UKRAINE_CONTROL_ALTITUDE;
      }
      return COUNTRY_FILL_ALTITUDE;
    },
    polygonsTransitionDuration: 0,
    polygonLabel: (feature: PolygonLayerFeature) => {
      if (isViinaCloseZoom && isUkraineViinaPolygonLayer(feature.polygonLayer)) {
        return "";
      }
      if (feature.polygonLayer === "country") {
        return `
                      <div style="max-width: 280px">
                        <strong>${escapeHtml(feature.name)}</strong><br/>
                        ${escapeHtml(feature.nameLong || feature.name)}
                        ${feature.isoA3 ? `<br/>${escapeHtml(feature.isoA3)}` : ""}
                        ${feature.continent ? ` · ${escapeHtml(feature.continent)}` : ""}
                      </div>
                    `;
      }

      if (feature.polygonLayer === "military-base") {
        const meta = [
          feature.component,
          feature.jointBase,
          feature.state,
          feature.country,
        ]
          .filter(Boolean)
          .map((value) => escapeHtml(String(value)))
          .join(" · ");
        return `
                      <div style="max-width: 300px">
                        <strong>미군기지</strong><br/>
                        ${escapeHtml(feature.name)}
                        ${meta ? `<br/>${meta}` : ""}
                      </div>
                    `;
      }

      if (feature.polygonLayer === "conflict-zone") {
        const aiLine =
          typeof feature.aiScore === "number"
            ? `<br/>AI 신뢰도 ${feature.aiScore}%`
            : "";
        return `
                      <div style="max-width: 300px">
                        <strong>AI 전쟁지역 (데모)</strong><br/>
                        ${escapeHtml(feature.name)}<br/>
                        이벤트 ${feature.eventCount.toLocaleString()} · 긴장도 ${escapeHtml(feature.tension)}${aiLine}
                      </div>
                    `;
      }

      if (feature.polygonLayer === "gps-jam") {
        const pct = Math.round(feature.ratio * 100);
        const level = escapeHtml(gpsJamLevelLabel(feature.level, labelLanguage === "en" ? "en" : "ko"));
        const disc = escapeHtml(gpsJamDisclaimer(labelLanguage === "en" ? "en" : "ko"));
        return `
                      <div style="max-width: 320px">
                        <strong>${labelLanguage === "en" ? "GPS interference" : "GPS 재밍 추정"} · ${pct}%</strong><br/>
                        ${level}<br/>
                        ${labelLanguage === "en" ? "Aircraft" : "관측 항공기"} ${feature.total.toLocaleString()}
                        ${gpsJamDate ? ` · ${escapeHtml(gpsJamDate)}` : ""}
                        <br/><span style="opacity:0.65;font-size:10px">${disc}</span>
                      </div>
                    `;
      }

      return "";
    },
    onPolygonClick: (feature: PolygonLayerFeature) => handlePolygonClick(feature),
    onPolygonHover: isCompactUi
      ? undefined
      : (feature: PolygonLayerFeature | null) => {
          setHoveredPolygon(feature);
        },
    pathsData: globePaths,
    priorityPathsData: airRaidFocusPaths,
    focusFillGeoJson: airRaidFocusBox
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                fill: "rgba(185, 28, 28, 0.34)",
                fillOpacity: 0.34,
              },
              geometry: airRaidFocusBoxPolygon(airRaidFocusBox),
            },
          ],
        }
      : null,
    ukraineMacroGeoJson,
    ukraineMicroGeoJson,
    axisHubCountriesGeoJson,
    pathPoints: (path: TransportPath) => path.points,
    pathPointLat: (point: { lat: number; lng: number }) => point.lat,
    pathPointLng: (point: { lat: number; lng: number }) => point.lng,
    pathPointAlt: (point: { lat: number; lng: number; alt?: number }) =>
      point.alt ?? 0,
    pathResolution: (path: TransportPath) =>
      path.kind === "neptun-trail" ||
      path.kind === "neptun-projection" ||
      path.kind === "neptun-trail-archived"
        ? neptunPathElevation === "elevated"
          ? 2.2
          : neptunPathElevation === "low"
            ? 1.8
            : 1.4
        : 2,
    pathsTransitionDuration: 0,
    pathColor: (path: TransportPath) => {
      if (path.accentColor) return path.accentColor;
      if (path.kind === "coastline") return globeTextures.coastlineColor;
      if (path.kind === "country-border") {
        return globeTextures.vectorBase ? globeTextures.borderColor : COUNTRY_BORDER_PATH_COLOR;
      }
      if (path.kind === "oil-pipeline") return tonedPathColors["oil-pipeline"];
      if (path.kind === "gas-pipeline") return tonedPathColors["gas-pipeline"];
      if (path.kind === "subsea-pipeline") return tonedPathColors["subsea-pipeline"];
      if (FLOW_PATH_KINDS.has(path.kind)) return INTEL_MISSILE_ARC;
      if (path.kind === "dispute-boundary") return "rgba(251, 191, 36, 0.92)";
      if (path.kind === "lsib-boundary") {
        // RANK 1(공식 국경)=슬레이트 실선 · RANK 2/3(분쟁·특수선)=붉은 점선
        return (path.scalerank ?? 1) >= 2
          ? "rgba(244, 63, 94, 0.88)"
          : "rgba(148, 163, 184, 0.6)";
      }
      if (path.kind === "dispute-zone") {
        const dispute = disputeFromPath(path);
        if (dispute) return getDisputeOutlineColor(dispute);
        const zone = conflictZoneFromPath(path);
        if (zone) return getConflictZoneOutlineColor(zone);
        return "rgba(251, 146, 60, 0.92)";
      }
      if (path.kind === "dispute-hatch") {
        const dispute = disputeFromPath(path);
        return dispute ? getDisputeHatchColor(dispute) : "rgba(251, 146, 60, 0.55)";
      }
      if (path.kind === "conflict-hatch") {
        const grade = parseConflictHatchGrade(path.id);
        if (grade) return TENSION_GRADE_STYLES[grade].hatch;
        const zone = conflictZoneFromPath(path);
        if (zone) return getConflictZoneHatchColor(zone);
        return TENSION_GRADE_STYLES.medium.hatch;
      }
      if (path.kind === "shipping-lane") return tonedPathColors["shipping-lane"];
      if (path.kind === "submarine-cable") return tonedPathColors["submarine-cable"];
      if (path.kind === "ship-movement-trail") {
        return path.accentColor || "rgba(34, 211, 238, 0.7)";
      }
      if (path.kind === "arms-embargo") return tonedArmsEmbargoStroke;
      if (path.kind === "msr") return "rgba(250, 204, 21, 0.9)";
      if (
        path.kind === "ukraine-ru-occupied" ||
        path.kind === "ukraine-ru-occupied-hatch"
      ) {
        return UKRAINE_RU_OCCUPIED_LINE;
      }
      if (
        path.kind === "ukraine-ua-occupied" ||
        path.kind === "ukraine-ua-occupied-hatch"
      ) {
        return UKRAINE_UA_OCCUPIED_LINE;
      }
      if (
        path.kind === "ukraine-ru-claim" ||
        path.kind === "ukraine-ru-claim-hatch"
      ) {
        return UKRAINE_RU_CLAIM_LINE;
      }
      if (
        path.kind === "ukraine-ua-claim" ||
        path.kind === "ukraine-ua-claim-hatch"
      ) {
        return UKRAINE_UA_CLAIM_LINE;
      }
      if (path.kind === "ukraine-ua-front" || path.kind === "ukraine-ua-gain") {
        return path.kind === "ukraine-ua-gain" ? UKRAINE_UA_GAIN_LINE : UKRAINE_UA_FRONT_LINE;
      }
      if (
        path.kind === "ukraine-ru-front" ||
        path.kind === "ukraine-contested-front"
      ) {
        return UKRAINE_RU_FRONT_LINE;
      }
      if (path.kind === "ukraine-combat-zone") return UKRAINE_COMBAT_ZONE_LINE;
      if (path.kind === "ua-advance" || path.kind === "ua-axis") {
        return UKRAINE_UA_FRONT_LINE;
      }
      if (path.kind === "ru-advance" || path.kind === "ru-axis") {
        return UKRAINE_RU_FRONT_LINE;
      }
      return showRailGlow ? tonedInfraColors.rail.glow : tonedInfraColors.rail.dim;
    },
    pathStroke: (path: TransportPath) => {
      if (isAirRaidFocusPath(path)) {
        if (path.kind === "dispute-zone") return 4.2;
        if (path.kind === "conflict-hatch") return 1.15;
      }
      if (path.kind === "neptun-trail") return 1.55;
      if (path.kind === "neptun-trail-archived") return 1.2;
      if (path.kind === "recon-orbit") return 1.35;
      if (path.kind === "neptun-projection") return 1.05;
      if (path.kind === "axis-link") return 1.35;
      if (path.kind === "bri-trade") return Math.max(2.4, briTradeStrokeWidth(path));
      if (path.kind === "us-dfc-supply") return Math.max(2.4, usDfcSupplyStrokeWidth(path));
      if (path.kind === "coastline") return 0.38;
      if (path.kind === "country-border") {
        return globeTextures.vectorBase
          ? globeTextures.borderStrokeWidth
          : 1.05;
      }
      if (path.kind === "dispute-boundary") return 0.52;
      if (path.kind === "lsib-boundary") return (path.scalerank ?? 1) >= 2 ? 0.85 : 0.55;
      if (path.kind === "dispute-zone") return 1.35;
      if (path.kind === "dispute-hatch") return 0.55;
      if (path.kind === "conflict-hatch") return 0.62;
      if (path.kind === "shipping-lane") return 0.48;
      if (path.kind === "ship-movement-trail") return 1.15;
      if (path.kind === "submarine-cable") {
        // 해저 케이블: cable widthMode (줌아웃↑ · 줌인 최소 ~0.55)
        return 0.55;
      }
      if (
        path.kind === "oil-pipeline" ||
        path.kind === "gas-pipeline" ||
        path.kind === "subsea-pipeline"
      ) {
        // 전역에서도 노선이 보이도록 굵게 (z-fight 완화는 path alt)
        if (globeLod.tier === "global") return 2.15;
        if (globeLod.tier === "continent") return 1.85;
        return 1.35;
      }
      if (path.kind === "arms-embargo") return ARMS_EMBARGO_STROKE_WIDTH;
      if (path.kind === "msr") return 0.55;
      if (
        path.kind === "ukraine-ru-occupied" ||
        path.kind === "ukraine-ua-occupied" ||
        path.kind === "ukraine-ru-claim" ||
        path.kind === "ukraine-ua-claim"
      ) {
        return ukraineThinOutlineStroke(globeLod.tier);
      }
      if (
        path.kind === "ukraine-ru-occupied-hatch" ||
        path.kind === "ukraine-ua-occupied-hatch" ||
        path.kind === "ukraine-ru-claim-hatch" ||
        path.kind === "ukraine-ua-claim-hatch"
      ) {
        return ukraineHatchStroke(globeLod.tier);
      }
      if (path.kind === "ukraine-ua-gain") {
        return ukraineThinOutlineStroke(globeLod.tier);
      }
      if (
        path.kind === "ukraine-ru-front" ||
        path.kind === "ukraine-contested-front" ||
        path.kind === "ukraine-ua-front"
      ) {
        return ukraineThinOutlineStroke(globeLod.tier);
      }
      if (path.kind === "ukraine-combat-zone") {
        return ukraineCombatZoneStroke(globeLod.tier);
      }
      if (path.kind === "ua-advance" || path.kind === "ua-axis") {
        return Math.max(0.85, ukraineThinOutlineStroke(globeLod.tier));
      }
      if (path.kind === "ru-advance" || path.kind === "ru-axis") {
        return Math.max(0.85, ukraineThinOutlineStroke(globeLod.tier));
      }
      return showRailGlow ? INFRA_STROKE.rail.glow : INFRA_STROKE.rail.dim;
    },
    pathDashLength: (path: TransportPath) => {
      if (path.kind === "neptun-projection") return 0.28;
      if (path.kind === "neptun-trail-archived") return 0.22;
      if (path.kind === "ship-movement-trail") {
        return path.meta?.dashed ? 0.28 : 0;
      }
      if (path.kind === "ua-advance" || path.kind === "ru-advance") return 0.42;
      if (path.kind === "ukraine-ru-claim" || path.kind === "ukraine-ua-claim") {
        return 0.22;
      }
      if (path.kind === "lsib-boundary") {
        return (path.scalerank ?? 1) >= 2 ? 0.3 : 0;
      }
      // DFC·BRI는 MapLibre에서 점선 data-driven이 얇게/안 보이는 경우가 있어 실선 유지
      if (path.kind === "bri-trade" || path.kind === "us-dfc-supply") return 0;
      return FLOW_PATH_KINDS.has(path.kind) ? 0.35 : 0;
    },
    pathDashGap: (path: TransportPath) => {
      if (path.kind === "neptun-projection") return 0.16;
      if (path.kind === "neptun-trail-archived") return 0.14;
      if (path.kind === "ship-movement-trail") {
        return path.meta?.dashed ? 0.16 : 0;
      }
      if (path.kind === "ua-advance" || path.kind === "ru-advance") return 0.18;
      if (path.kind === "ukraine-ru-claim" || path.kind === "ukraine-ua-claim") {
        return 0.14;
      }
      if (path.kind === "lsib-boundary") {
        return (path.scalerank ?? 1) >= 2 ? 0.16 : 0;
      }
      return FLOW_PATH_KINDS.has(path.kind) ? 0.12 : 0;
    },
    pathDashAnimateTime: (path: TransportPath) => {
      if (
        path.kind === "neptun-projection" ||
        path.kind === "neptun-trail" ||
        path.kind === "neptun-trail-archived"
      ) {
        return 0;
      }
      return FLOW_PATH_KINDS.has(path.kind) ? 3500 : 0;
    },
    pathLabel: (path: TransportPath) => {
      const lang = labelLanguage;
      const dispute =
        path.kind === "dispute-zone" || path.kind === "dispute-hatch"
          ? disputeFromPath(path)
          : undefined;
      if (dispute) {
        const overview = disputeOverviews.get(dispute.id);
        const hatch = hatchStyleLabelLocalized(getDisputeHatchStyle(dispute), lang, Boolean(dispute && isCombatHazard(dispute)));
        const combatLine = isCombatHazard(dispute)
          ? `${escapeHtml(
              lang === "en"
                ? "Active combat · elevated risk"
                : "실전투·폭격 · 피해가중",
            )}<br/>`
          : "";
        const overviewLine = overview?.overviewKo
          ? `<br/><span style="opacity:0.85">${escapeHtml(truncateOverview(overview.overviewKo, 180))}</span>`
          : dispute.note
            ? `<br/>${escapeHtml(dispute.note)}`
            : "";
        return `
                  <div style="max-width: 300px">
                    <strong>${escapeHtml(dispute.name)}</strong><br/>
                    ${escapeHtml(HOVER.disputeBorder(hatch, lang))}<br/>
                    ${combatLine}
                    ${escapeHtml(HOVER.tensionPrefix(tensionLabel(dispute.tension, lang), lang))}
                    ${overviewLine}
                    <br/><span style="opacity:0.6;font-size:10px">${escapeHtml(HOVER.hintDetail(lang))}</span>
                  </div>
                `;
      }
      if (path.kind === "lsib-boundary") {
        const status = path.meta?.status ? String(path.meta.status) : "";
        const rank = path.scalerank ?? 1;
        const rankLine =
          rank >= 2
            ? escapeHtml(lang === "en" ? "Disputed / special line" : "분쟁·특수선")
            : escapeHtml(lang === "en" ? "Official boundary" : "공식 국경선");
        return `
                    <div style="max-width: 280px">
                      <strong>${escapeHtml(path.name || pathKindLabel(path.kind, lang))}</strong><br/>
                      ${rankLine}${status ? `<br/><span style="opacity:0.8">${escapeHtml(status)}</span>` : ""}
                      <br/><span style="opacity:0.55;font-size:10px">LSIB v11.4 · US Dept. of State</span>
                    </div>
                  `;
      }
      const kindLabel = pathKindLabel(path.kind, lang);
      const lengthLabel =
        path.lengthKm && Number.isFinite(path.lengthKm)
          ? `<br/>${escapeHtml(HOVER.pathLength(path.lengthKm.toLocaleString(), lang))}`
          : "";
      return `
                  <div style="max-width: 280px">
                    <strong>${escapeHtml(path.name || kindLabel)}</strong><br/>
                    ${escapeHtml(kindLabel)}
                    ${lengthLabel}
                  </div>
                `;
    },
    onPathHover: isCompactUi
      ? undefined
      : (path: TransportPath | null) => {
          setHoveredPath(path);
        },
    onPathClick: (path: TransportPath) => handlePathClick(path),
    onGlobeClick: (coords: { lat: number; lng: number }) => handleGlobeClick(coords),
  };
}
