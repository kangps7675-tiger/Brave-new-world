import { buildExerciseBriefingContent, type ExerciseBriefingContent } from "@/components/ExerciseBriefingParchment";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import {
  createAirportPortBadge,
  createCasualtySkullBadge,
  createNuclearStockpileBadge,
  createSituationCalloutBadge,
} from "@/components/globe/markers/htmlMarkerFactories";
import type {
  GlobeDisplayPoint,
  HtmlOverlayMarker,
  NewsStreamNeonMarker,
  Selection,
  StaticGlobePoint,
} from "@/components/globe/types";
import { normalizeLabelText } from "@/components/globe/formatters";
import { frictionDeepDoc, type FrictionTimelineStage } from "@/data/frictionEpisodeDeep";
import type { FrictionEpisode } from "@/data/frictionEpisodes";
import type { MilitaryAircraft, UsCarrier } from "@/data/geoTypes";
import type { NavSelection } from "@/data/navRegions";
import { createAisVesselBadge } from "@/lib/aisVesselMarkers";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import { createChinaTheaterIncidentBadge } from "@/lib/chinaTheaterIncidentMarker";
import { createGdeltLocationTagBadge } from "@/lib/gdeltLocationTagMarker";
import { createInfraStaticBadge, isHtmlStaticKind } from "@/lib/infraStaticMarkers";
import { createIranNewsNeonBadge, type IranNewsNeonAttack } from "@/lib/iranNewsNeonMarker";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { createFrictionPinElement, createFrictionStageCalloutElement, createEventPinElement } from "@/lib/locationPinMarker";
import { createFinancialHubMarkerElement } from "@/lib/financialMarketHubMarkers";
import { createKoreaMissileIncidentBadge } from "@/lib/koreaMissileIncidentMarker";
import { createRussiaStrikeIncidentBadge } from "@/lib/russiaStrikeIncidentMarker";
import { createMilAircraftBadge } from "@/lib/milAircraftMarkers";
import { createMilitaryExerciseMarkerElement } from "@/lib/militaryExerciseMarkers";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import { createNeonRippleIncidentBadge } from "@/lib/neonRippleIncidentMarker";
import { createNeptunImpactFlashElement } from "@/lib/neptunImpactFlash";
import type { NeptunLiveThreat } from "@/lib/neptun";
import { createNeptunThreatBadge } from "@/lib/neptunTrackMarker";
import {
  localizeNewfeedsLocation,
  localizeNewfeedsTitle,
} from "@/lib/newfeedsI18n";
import { createReconSatelliteBadge } from "@/lib/reconSatelliteMarkers";
import { createReefWatchFeatureMarkerElement, createReefWatchTrafficMarkerElement } from "@/lib/reefWatchMarkers";
import { createSafecastGaugeBadge } from "@/lib/safecastRadiationMarker";
import { createShipMovementPinElement } from "@/lib/shipMovements/globeOverlay";
import type { PublicShipObservation } from "@/lib/shipMovements/types";
import { createUkraineGdeltNeonBadge } from "@/lib/ukraineGdeltNeonMarker";
import { createUkraineSettlementLabelElement } from "@/lib/ukraineSettlementLabels";
import { createUsCarrierBadge } from "@/lib/usCarrierMarkers";
import {
  cuesForAisVessel,
  emitLayerClickSounds,
} from "@/lib/infraClickSounds";
import type { AudioEventId } from "@/data/audioManifest";

/**
 * Everything `createDashboardHtmlOverlayElement` needs from the owning
 * `GlobeDashboard` component. Refs and state setters are injected here
 * instead of closed over, so the ~400-line displayKind switch can live
 * outside the component (Stage 3 extraction).
 *
 * The dependency shape mirrors the original `useCallback` dependency array
 * in GlobeDashboard.tsx exactly — do not "clean up" unused-looking fields
 * without checking the call site, since several are read from ref/current
 * values or from state that intentionally isn't in the memo deps (stable
 * setters, refs).
 */
export type CreateDashboardHtmlOverlayElementDeps = {
  layerAltitudeRef: { current: number };
  layerAltitude: number;
  labelLanguage: LabelLanguage;
  isEconomyViewer: boolean;
  showLogisticsStress: boolean;
  chokeGlowColorById: Record<string, string> | undefined;
  usCarrierLabelOffsets: Map<string, number>;
  displayMilitaryExercises: MilitaryExercise[];
  combinedShipMovesMap: PublicShipObservation[];
  activeFrictionEpisode: FrictionEpisode | null;

  skipNextGlobeClickRef: { current: boolean };

  handleHtmlMarkerHover: (point: GlobeDisplayPoint | null) => void;
  openIntelFromCoords: (lat: number, lng: number, altitude?: number) => void;
  openSelection: (next: Selection) => void;
  flyTo: (
    lat: number,
    lng: number,
    altitude?: number,
    durationMs?: number,
    camera?: { pitch?: number; bearing?: number },
  ) => void;
  handleAirRaidFocus: (
    target: AirRaidFocusTarget,
    kind: AirRaidSirenKind,
    options?: { deferSirenUntilArrive?: boolean; skipSiren?: boolean },
  ) => void;
  handleCarrierSelect: (carrier: UsCarrier) => void;
  handleMilAircraftSelect: (aircraft: MilitaryAircraft) => void;
  handleCivAircraftSelect: (aircraft: MilitaryAircraft) => void;
  handleInfraStaticClick: (point: {
    kind: string;
    lat: number;
    lng: number;
    id?: string;
    name?: string;
    meta?: Record<string, string | number | null>;
  }) => void;
  handleNeptunThreatSelect: (threat: NeptunLiveThreat) => void;
  selectFrictionStage: (stage: FrictionTimelineStage) => void;
  clearRegionNavSelection: () => void;
  closeEconInsight: () => void;

  setHoveredCarrier: (carrier: UsCarrier | null) => void;
  setHoveredMilAircraft: (aircraft: MilitaryAircraft | null) => void;
  setHoveredNeptunThreat: (threat: NeptunLiveThreat | null) => void;
  setSelected: (selection: Selection | null) => void;
  setEconNavSelection: (selection: NavSelection | null) => void;
  setEconNewsPanelReveal: (value: boolean) => void;
  setIntelSheetOpen: (value: boolean) => void;
  setNewsPerspectives: (marker: NewsStreamNeonMarker | null) => void;
  setEconomyAttackReaction: (value: { ageMinutes: number; title: string } | null) => void;
  setExerciseBriefing: (content: ExerciseBriefingContent | null) => void;
  setShipMovesSelectedId: (id: string | null) => void;
};

/**
 * MapLibre/react-globe.gl `htmlElement` factory for the dashboard's combined
 * HTML overlay layer. Dispatches on `displayKind` to the per-feature marker
 * factory (mostly pure functions living under `src/lib/*Marker*.ts` and
 * `src/components/globe/markers/htmlMarkerFactories.ts`), wiring in
 * dashboard callbacks (hover, click-to-select, fly-to, briefings) via `deps`.
 *
 * Moved out of GlobeDashboard.tsx verbatim (Stage 3 refactor) — behavior is
 * unchanged, only the closure variables became `deps.*` accesses.
 */
export function createDashboardHtmlOverlayElement(
  point: object,
  deps: CreateDashboardHtmlOverlayElementDeps,
): HTMLElement {
  const item = point as HtmlOverlayMarker;
  const alt = deps.layerAltitudeRef.current;
  if (item.displayKind === "event") {
    return createEventPinElement(
      item,
      alt,
      {
        onHover: deps.handleHtmlMarkerHover,
        onClick: (eventPoint) => {
          deps.openIntelFromCoords(eventPoint.lat, eventPoint.lng, 0.92);
        },
      },
      { newsAlert: true },
    );
  }
  if (item.displayKind === "us-carrier-html") {
    return createUsCarrierBadge(
      item,
      {
        onHover: deps.setHoveredCarrier,
        onClick: deps.handleCarrierSelect,
      },
      { labelOffsetY: deps.usCarrierLabelOffsets.get(item.id) ?? 0 },
    );
  }
  if (item.displayKind === "recon-sat-html") {
    return createReconSatelliteBadge(
      item,
      {
        onHover: (sat) => {
          if (!sat) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover(sat);
        },
        onClick: (sat) => {
          deps.skipNextGlobeClickRef.current = true;
          emitLayerClickSounds(
            [{ eventId: "recon-satellite" as AudioEventId, volumeScale: 0.85, durationMs: 5000 }],
            { altitude: deps.layerAltitude },
          );
          deps.openSelection({ kind: "recon-sat", item: sat });
          deps.flyTo(sat.lat, sat.lng, 1.35);
        },
      },
      {
        lang: deps.labelLanguage === "en" ? "en" : "ko",
        // 전역 궤도 헤일로에서는 라벨 끄고 아이콘만 — 지도 줌에서만 이름
        showLabel: deps.layerAltitude < 1.35,
        orbitHalo: deps.layerAltitude > 1.35,
      },
    );
  }
  if (item.displayKind === "mil-html" || item.displayKind === "civ-html") {
    const isCiv = item.displayKind === "civ-html";
    return createMilAircraftBadge(
      item,
      {
        onHover: deps.setHoveredMilAircraft,
        onClick: isCiv ? deps.handleCivAircraftSelect : deps.handleMilAircraftSelect,
      },
      {
        lang: deps.labelLanguage,
        palette: isCiv ? "civil" : "military",
      },
    );
  }
  if (item.displayKind === "ais-html") {
    const mapBearingDeg =
      typeof (item as { mapBearingDeg?: number }).mapBearingDeg === "number"
        ? ((item as unknown as { mapBearingDeg: number }).mapBearingDeg)
        : 0;
    return createAisVesselBadge(
      item,
      {
        onHover: (vessel) => {
          if (!vessel) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover({
            ...vessel,
            markerId: item.markerId,
            displayKind: "ais",
          });
        },
        onClick: (vessel) => {
          deps.skipNextGlobeClickRef.current = true;
          emitLayerClickSounds(
            cuesForAisVessel({
              disguised: Boolean(vessel.disguised),
              militaryKind: vessel.militaryKind,
            }),
            { altitude: deps.layerAltitude },
          );
          deps.openSelection({ kind: "ais", item: vessel });
          deps.flyTo(vessel.lat, vessel.lng, 0.45);
        },
      },
      { lang: deps.labelLanguage, mapBearingDeg },
    );
  }
  if (item.displayKind === "gdelt-tag-html") {
    return createGdeltLocationTagBadge(
      item,
      alt,
      {
        onHover: deps.handleHtmlMarkerHover,
        onClick: (event) => {
          deps.openIntelFromCoords(event.lat, event.lng, 0.92);
        },
      },
    );
  }
  if (item.displayKind === "ukraine-gdelt-neon") {
    return createUkraineGdeltNeonBadge(
      item,
      deps.labelLanguage === "en" ? "en" : "ko",
      {
        onHover: (ev) => {
          if (!ev) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover(ev);
        },
        onClick: (event) => {
          deps.skipNextGlobeClickRef.current = true;
          deps.openIntelFromCoords(event.lat, event.lng, 0.92);
        },
      },
    );
  }
  if (item.displayKind === "news-stream-neon") {
    const kindLabel =
      item.kind === "war"
        ? deps.labelLanguage === "en"
          ? "War / front"
          : "전쟁·전선"
        : item.kind === "diplomatic"
          ? deps.labelLanguage === "en"
            ? "Diplomatic"
            : "외교"
          : deps.labelLanguage === "en"
            ? "Tension"
            : "긴장";
    return createNeonRippleIncidentBadge(
      {
        markerId: item.markerId,
        accent: item.accent,
        intensity: item.intensity,
        title: `${kindLabel}\n${item.title}`,
        ariaLabel: item.title,
        perspectiveCount: item.perspectives?.length ?? 1,
      },
      {
        onClick: () => {
          deps.skipNextGlobeClickRef.current = true;
          deps.flyTo(item.lat, item.lng, 0.85);
          const views = item.perspectives ?? [];
          if (views.length >= 2) {
            deps.setSelected(null);
            deps.clearRegionNavSelection();
            deps.setEconNavSelection(null);
            deps.setEconNewsPanelReveal(false);
            deps.closeEconInsight();
            deps.setIntelSheetOpen(false);
            deps.setNewsPerspectives(item);
            return;
          }
          const link = views[0]?.link || item.link;
          if (link) window.open(link, "_blank", "noopener,noreferrer");
        },
      },
    );
  }
  if (item.displayKind === "telegram-neon") {
    return createNeonRippleIncidentBadge(
      {
        markerId: item.markerId,
        accent: "white",
        intensity: item.intensity,
        title: `Telegram · ${item.label}\n${item.title}`,
        ariaLabel:
          deps.labelLanguage === "en"
            ? `Telegram alert · ${item.label}`
            : `텔레그램 속보 · ${item.label}`,
      },
      {
        onClick: () => {
          deps.skipNextGlobeClickRef.current = true;
          deps.flyTo(item.lat, item.lng, 0.72);
        },
      },
    );
  }
  if (item.displayKind === "situation-callout") {
    return createSituationCalloutBadge(item);
  }
  if (item.displayKind === "casualty-skull") {
    return createCasualtySkullBadge(item, alt);
  }
  if (item.displayKind === "china-theater-incident") {
    return createChinaTheaterIncidentBadge(
      item,
      deps.labelLanguage === "en" ? "en" : "ko",
      {
        onHover: (inc) => {
          if (!inc) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover(inc as unknown as GlobeDisplayPoint);
        },
        onClick: (inc) => {
          deps.skipNextGlobeClickRef.current = true;
          deps.flyTo(inc.lat, inc.lng, 0.72);
          if (inc.sourceUrl) {
            window.open(inc.sourceUrl, "_blank", "noopener,noreferrer");
          } else {
            deps.openIntelFromCoords(inc.lat, inc.lng, 0.92);
          }
        },
      },
    );
  }
  if (item.displayKind === "korea-missile-incident") {
    return createKoreaMissileIncidentBadge(
      item,
      deps.labelLanguage === "en" ? "en" : "ko",
      {
        onHover: (inc) => {
          if (!inc) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover(inc as unknown as GlobeDisplayPoint);
        },
        onClick: (inc) => {
          deps.skipNextGlobeClickRef.current = true;
          emitLayerClickSounds(
            [{ eventId: "ballistic-travel" as AudioEventId, volumeScale: 0.8, durationMs: 5000 }],
            { altitude: deps.layerAltitude },
          );
          deps.flyTo(inc.lat, inc.lng, 0.72);
          deps.openIntelFromCoords(inc.lat, inc.lng, 0.92);
        },
      },
    );
  }
  if (item.displayKind === "russia-strike-incident") {
    return createRussiaStrikeIncidentBadge(
      item,
      deps.labelLanguage === "en" ? "en" : "ko",
      {
        onHover: (inc) => {
          if (!inc) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover(inc as unknown as GlobeDisplayPoint);
        },
        onClick: (inc) => {
          deps.skipNextGlobeClickRef.current = true;
          emitLayerClickSounds(
            [{ eventId: "ballistic-travel" as AudioEventId, volumeScale: 0.8, durationMs: 5000 }],
            { altitude: deps.layerAltitude },
          );
          deps.flyTo(inc.lat, inc.lng, 0.72);
          deps.openIntelFromCoords(inc.lat, inc.lng, 0.92);
        },
      },
    );
  }
  if (item.displayKind === "newfeeds-attack") {
    return createIranNewsNeonBadge(
      item as IranNewsNeonAttack,
      deps.labelLanguage === "en" ? "en" : "ko",
      {
        onHover: (atk) => {
          if (!atk) {
            deps.handleHtmlMarkerHover(null);
            return;
          }
          deps.handleHtmlMarkerHover(atk as unknown as GlobeDisplayPoint);
        },
        onClick: (atk) => {
          deps.skipNextGlobeClickRef.current = true;
          deps.handleAirRaidFocus(
            {
              lat: atk.lat,
              lng: atk.lng,
              label:
                localizeNewfeedsLocation(atk.location, deps.labelLanguage) ||
                localizeNewfeedsTitle(atk.title, deps.labelLanguage),
            },
            "newfeeds",
          );
          if (deps.isEconomyViewer) {
            const pub = atk.publishedAt ? Date.parse(atk.publishedAt) : NaN;
            const ageMinutes = Number.isFinite(pub)
              ? Math.max(0, Math.round((Date.now() - pub) / 60_000))
              : 60;
            deps.setEconomyAttackReaction({
              ageMinutes,
              title:
                localizeNewfeedsTitle(atk.title, deps.labelLanguage) || atk.title,
            });
          }
        },
      },
    );
  }
  if (item.displayKind === "nuclear-icbm") {
    return createNuclearStockpileBadge(
      item,
      deps.labelLanguage === "en" ? "en" : "ko",
      alt,
    );
  }
  if (item.displayKind === "safecast-gauge") {
    return createSafecastGaugeBadge(item, deps.labelLanguage === "en" ? "en" : "ko");
  }
  if (item.displayKind === "ua-settlement-html") {
    return createUkraineSettlementLabelElement(
      normalizeLabelText(item.name) || "마을",
      item.tier,
    );
  }
  if (item.displayKind === "neptun-html") {
    return createNeptunThreatBadge(item, {
      onHover: deps.setHoveredNeptunThreat,
      onClick: deps.handleNeptunThreatSelect,
    });
  }
  if (item.displayKind === "neptun-impact") {
    return createNeptunImpactFlashElement(item);
  }
  if (item.displayKind === "friction-pin") {
    return createFrictionPinElement(item.color, item.label);
  }
  if (item.displayKind === "military-exercise-html") {
    return createMilitaryExerciseMarkerElement(item, () => {
      deps.skipNextGlobeClickRef.current = true;
      const exercise = deps.displayMilitaryExercises.find((candidate) => candidate.id === item.id);
      if (exercise) {
        const brief = buildExerciseBriefingContent(
          exercise,
          deps.labelLanguage === "en" ? "en" : "ko",
        );
        if (brief) deps.setExerciseBriefing(brief);
      }
      deps.flyTo(item.lat, item.lng, 0.72);
    });
  }
  if (item.displayKind === "financial-hub-html") {
    return createFinancialHubMarkerElement(
      item,
      deps.labelLanguage === "en" ? "en" : "ko",
    );
  }
  if (item.displayKind === "reefwatch-feature-html") {
    return createReefWatchFeatureMarkerElement(item, () => {
      deps.skipNextGlobeClickRef.current = true;
      deps.flyTo(item.lat, item.lng, 0.42);
      deps.openIntelFromCoords(item.lat, item.lng, 0.92);
    });
  }
  if (item.displayKind === "reefwatch-traffic-html") {
    return createReefWatchTrafficMarkerElement(item, () => {
      deps.skipNextGlobeClickRef.current = true;
      deps.flyTo(item.lat, item.lng, 0.35);
    });
  }
  if (item.displayKind === "ship-movement-html") {
    return createShipMovementPinElement(
      item.label,
      item.confidence,
      item.vesselConfidence === "low",
      () => {
        deps.skipNextGlobeClickRef.current = true;
        const obs = deps.combinedShipMovesMap.find((o) => o.id === item.id);
        if (obs) {
          deps.setShipMovesSelectedId(obs.id);
          deps.openSelection({ kind: "ship-movement", item: obs });
        }
        deps.flyTo(item.lat, item.lng, 0.85);
      },
    );
  }
  if (item.displayKind === "friction-stage") {
    return createFrictionStageCalloutElement(item.order, item.label, item.active, () => {
      const deep = frictionDeepDoc(deps.activeFrictionEpisode?.id ?? "");
      const stage = deep?.stages.find((st) => st.id === item.id);
      if (stage) deps.selectFrictionStage(stage);
    });
  }
  if (item.displayKind === "static" && isHtmlStaticKind(item.kind)) {
    return createInfraStaticBadge(
      {
        ...item,
        ...(item.kind === "chokepoint" &&
        deps.showLogisticsStress &&
        deps.chokeGlowColorById?.[item.id]
          ? {
              stressLevel: (() => {
                const hex = deps.chokeGlowColorById[item.id];
                if (hex === "#f87171") return "elevated";
                if (hex === "#fbbf24") return "watch";
                if (hex === "#34d399") return "normal";
                return "unknown";
              })(),
            }
          : {}),
      },
      {
        onHover: (p) => deps.handleHtmlMarkerHover(p as GlobeDisplayPoint | null),
        onClick: (p) => {
          deps.skipNextGlobeClickRef.current = true;
          deps.handleInfraStaticClick(p);
        },
      },
      { lang: deps.labelLanguage },
    );
  }
  return createAirportPortBadge(item as StaticGlobePoint, deps.handleHtmlMarkerHover, alt);
}
