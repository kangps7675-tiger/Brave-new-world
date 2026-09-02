"use client";

import { useMemo } from "react";
import type {
  DisputeArea,
  DisputeOverview,
  MilitaryAircraft,
  TransportPath,
  UsCarrier,
} from "@/data/geoTypes";
import type {
  GlobeDisplayPoint,
  GlobePoint,
  HoverCard,
  PolygonLayerFeature,
} from "@/components/globe/types";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NeptunLiveThreat } from "@/lib/neptun";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import type { MilitaryExercise } from "@/lib/militaryExercises";
import { truncateOverview } from "@/components/globe/formatters";
import { emitHoverLayerId } from "@/lib/hoverLayerBridge";
import {
  HOVER,
  carrierStatusLabel,
  disputeCategoryLabel,
  eventTierLabel,
  hatchStyleLabelLocalized,
  pathKindLabel,
  staticKindLabel,
  tensionLabel,
} from "@/lib/hoverLabels";
import {
  type AxisRelationKind,
  axisRelationKindBlurb,
  axisRelationKindLabel,
} from "@/data/axisNetwork";
import { corridorStatusLabel } from "@/data/strategicCorridors";
import { classifyMilAircraft, milAircraftRoleLabel } from "@/lib/milAircraftKind";
import { formatNeptunLocation, getNeptunTypeLabel } from "@/lib/neptun";
import { aisDisplayTypeLabel } from "@/lib/aisVesselClass";
import {
  firmsCauseBody,
  firmsCauseHint,
  firmsCauseTitle,
  firmsFireSoundLabel,
} from "@/lib/firmsSoundClassify";
import { evidenceTierLabel } from "@/components/EvidenceTierBadge";
import { formatReliabilityForHover } from "@/lib/layerReliability";
import {
  layerIdFromPathKind,
  layerIdFromStaticKind,
  withLayerExplain,
} from "@/lib/layerHoverExplain";
import { UCDP_ATTRIBUTION, UCDP_ATTRIBUTION_SHORT, UCDP_SOURCE_URL } from "@/lib/ucdp";
import { translateOrefTitle, tzevaUi } from "@/lib/tzevaAdomI18n";
import {
  NEWFEEDS_ATTRIBUTION_SHORT,
  severityHint,
  severityLabel,
} from "@/lib/newfeeds";
import {
  localizeNewfeedsCategory,
  localizeNewfeedsLocation,
  localizeNewfeedsSummary,
  localizeNewfeedsTitle,
  newfeedsUi,
} from "@/lib/newfeedsI18n";
import { CHINA_THEATER_DYAD_LABEL, CHINA_THEATER_SEA_LABEL } from "@/data/chinaTheaterIncidentsSeed";
import { KOREA_MISSILE_ANCHOR_LABEL, KOREA_MISSILE_KIND_LABEL } from "@/data/koreaMissileIncidentsSeed";
import { RUSSIA_STRIKE_KIND_LABEL } from "@/data/russiaStrikeIncidentsSeed";
import { DRONE_INCIDENT_KIND_LABEL } from "@/data/europeDroneIncursionSeed";
import {
  provenanceBadgeLabel,
  provenanceHintLine,
  provenanceMetaLine,
  type IncidentProvenance,
} from "@/lib/eventProvenance";
import { ACLED_HOME_URL, HAPI_ATTRIBUTION, HAPI_SOURCE_LINE } from "@/lib/hapiConflictCasualties";
import { isMediazonaCasualtyId } from "@/lib/casualtySkullMarkers";
import { gdeltNewsAlertLabel, formatGdeltNewsHeadline } from "@/lib/gdeltNewsAlert";
import { gdeltLocationTagLabel } from "@/lib/gdeltLocationTags";
import { reconCountryLabel, reconSensorLabel } from "@/lib/reconSatellites";
import { isFreshEvent } from "@/data/eventTiers";
import { findNavareaFeature } from "@/lib/navareaHatch";
import { findMilitaryExercise } from "@/lib/militaryExerciseHatch";
import { EXERCISE_CONFIDENCE_LABEL } from "@/lib/militaryExercises";
import { findUkmtoIncident } from "@/lib/ukmtoHatch";
import { isCombatHazard, getDisputeHatchStyle } from "@/lib/disputeHatch";
import { lookupOceanName } from "@/lib/oceanNames";
import { gpsJamDisclaimer, gpsJamLevelLabel } from "@/lib/gpsJam";
import { isUkraineViinaPolygonLayer } from "@/components/globe/overlayPolygons";

export interface HoverCardParams {
  hoveredCarrier: UsCarrier | null;
  hoveredMilAircraft: MilitaryAircraft | null;
  civAircraft: MilitaryAircraft[];
  hoveredNeptunThreat: NeptunLiveThreat | null;
  hoveredPoint: GlobeDisplayPoint | null;
  hoveredPolygon: PolygonLayerFeature | null;
  hoveredPath: TransportPath | null;
  hoverGlobeCoords: { lat: number; lng: number } | null;
  labelLanguage: LabelLanguage;
  gpsJamDate: string | null;
  ukmtoIncidents: UkmtoIncidentPoint[];
  navareaFeatures: NavareaFeaturePoint[];
  displayMilitaryExercises: MilitaryExercise[];
  disputeFromPath: (path: TransportPath) => DisputeArea | undefined;
  disputeOverviews: Map<string, DisputeOverview>;
}

/** í¸ë² ëì â sourceCatalog / ì¤ëª í¤ */
export function resolveHoverLayerId(params: HoverCardParams): string | null {
  if (params.hoveredCarrier) return "us-carriers";
  if (params.hoveredMilAircraft) {
    const isCiv = params.civAircraft.some(
      (a) =>
        a.id === params.hoveredMilAircraft!.id || a.hex === params.hoveredMilAircraft!.hex,
    );
    return isCiv ? "air-traffic" : "military-activity";
  }
  if (params.hoveredNeptunThreat) return "neptun";
  const p = params.hoveredPoint;
  if (p) {
    if (p.displayKind === "ais") {
      return "disguised" in p && p.disguised ? "disguised-vessels" : "ais";
    }
    if (p.displayKind === "mil") return "military-activity";
    if (p.displayKind === "firms-fire") return "firms-fires";
    if (p.displayKind === "tzeva-adom") return "tzeva-adom";
    if (p.displayKind === "newfeeds-attack") return "newfeeds-iran";
    if (p.displayKind === "ukraine-theater-intensity") return "conflict-zones";
    if (p.displayKind === "china-theater-incident") return "china-theater-incidents";
    if (p.displayKind === "korea-missile-incident") return "korea-missile-incidents";
    if (p.displayKind === "russia-strike-incident") return "ukraine-strikes-russia";
    if (p.displayKind === "casualty-skull") {
      const id = "id" in p ? String(p.id) : "";
      if (isMediazonaCasualtyId(id)) return "mediazona-casualties";
      if (id.startsWith("ucdp")) return "ucdp-events";
      return "hapi-conflict-casualties";
    }
    if (p.displayKind === "recon-sat-html") return "recon-satellites";
    if (p.displayKind === "telegram-neon") return "telegram-osint";
    if (p.displayKind === "gdelt-tag-html" || p.displayKind === "ukraine-gdelt-neon") {
      return "conflict-zones";
    }
    if (p.displayKind === "conflict-cluster") return "conflict-zones";
    if (p.displayKind === "static") {
      const kind = "kind" in p ? String((p as { kind?: string }).kind ?? "") : "";
      return layerIdFromStaticKind(kind);
    }
  }
  if (params.hoveredPolygon) {
    if (isUkraineViinaPolygonLayer(params.hoveredPolygon.polygonLayer)) {
      return "viina-ukraine-control";
    }
    const pl = String(params.hoveredPolygon.polygonLayer ?? "");
    if (pl.includes("ukmto")) return "ukmto-incidents";
    if (pl.includes("navarea")) return "navarea-warnings";
    if (pl.includes("exercise")) return "military-exercises";
    if (pl.includes("gps")) return "gps-interference";
    if (pl === "conflict-zone") return "conflict-zones";
    if (pl === "military-base") return "military-bases";
    if (pl === "resource-deposit") return "resource-deposits";
    if (pl === "missile-silo-field" || pl === "missile-belt") return "missile-silos";
  }
  if (params.hoveredPath) {
    return layerIdFromPathKind(params.hoveredPath.kind);
  }
  return null;
}

function neonIncidentHoverExtras(
  point: {
    provenance?: IncidentProvenance;
    sourceUrl?: string;
    gdeltSourceUrl?: string | null;
  },
  lang: LabelLanguage,
  kindBadge: string,
): { badge: string; metaExtra?: string; hintExtra?: string } {
  if (!point.provenance) return { badge: kindBadge };
  const provBadge = provenanceBadgeLabel(point.provenance, lang);
  const url =
    point.provenance === "seed-source"
      ? point.sourceUrl
      : point.gdeltSourceUrl ?? point.sourceUrl;
  return {
    badge: `${kindBadge} · ${provBadge}`,
    metaExtra: provenanceMetaLine(point.provenance, lang, {
      seedSourceUrl: point.sourceUrl,
      gdeltSourceUrl: point.gdeltSourceUrl,
    }),
    hintExtra: provenanceHintLine(point.provenance, lang, url),
  };
}

/** ë ì´ì´ ê¸°ë³¸ ì ë¢°(ê³µíµ ì¤í¤ë§)ë¥¼ í¸ë² ì¹´ëì ë¶ì¸ë¤. í¼ì² confidenceë ê¸°ì¡´ metaì ì ì§. */
export function withLayerReliability(
  card: HoverCard,
  layerId: string | null,
  lang: LabelLanguage,
): HoverCard {
  if (!layerId || card.kind === "ocean") return card;
  const rel = formatReliabilityForHover(layerId, lang);
  if (!rel) return card;
  const layerLine =
    lang === "en" ? `Layer: ${rel.meta}` : `ë ì´ì´: ${rel.meta}`;
  const meta = card.meta ? `${card.meta} Â· ${layerLine}` : layerLine;
  const hint = card.hint ? `${card.hint} Â· ${rel.hint}` : rel.hint;
  if (card.kind === "event" || card.kind === "static") {
    return {
      ...card,
      badge: card.badge ?? rel.badge,
      meta,
      hint,
    };
  }
  return {
    ...card,
    meta,
    hint,
  };
}

/** ì§êµ¬ë³¸ í¸ë² ì¹´ë ì½íì¸  ì¡°ë¦½ â ìì í¨ì (íì¤í¸Â·ì¬ì¬ì© ì©ì´) */
export function buildHoverCard(params: HoverCardParams): HoverCard {
  const layerId = resolveHoverLayerId(params);
  emitHoverLayerId(layerId);
  const lang = params.labelLanguage;
  const withRel = withLayerReliability(buildHoverCardRaw(params), layerId, lang);
  /** ë§ì°ì¤ ì ì¹´ëì âì´ê² ë­ì§â íë¬¸ â bodyê° ë¹ìì ëë§ ì±ì */
  return withLayerExplain(withRel, layerId, lang);
}

function buildHoverCardRaw(params: HoverCardParams): HoverCard {
  const {
    hoveredCarrier,
    hoveredMilAircraft,
    civAircraft,
    hoveredNeptunThreat,
    hoveredPoint,
    hoveredPolygon,
    hoveredPath,
    hoverGlobeCoords,
    labelLanguage,
    gpsJamDate,
    ukmtoIncidents,
    navareaFeatures,
    displayMilitaryExercises,
    disputeFromPath,
    disputeOverviews,
  } = params;

  const lang = labelLanguage;
  if (hoveredCarrier) {
    const operational = hoveredCarrier.status === "deployed";
    return {
      kind: "static",
      title: hoveredCarrier.name,
      detail: HOVER.usCarrierDetail(carrierStatusLabel(hoveredCarrier.status, lang), lang),
      badge: operational ? HOVER.operational(lang) : undefined,
      meta: `${hoveredCarrier.hull} Â· ${hoveredCarrier.location}`,
    };
  }
  if (hoveredMilAircraft) {
    const kind = classifyMilAircraft(hoveredMilAircraft);
    const isCiv = civAircraft.some(
      (a) => a.id === hoveredMilAircraft.id || a.hex === hoveredMilAircraft.hex,
    );
    return {
      kind: "event",
      title: hoveredMilAircraft.callsign || hoveredMilAircraft.hex.toUpperCase(),
      detail: `${milAircraftRoleLabel(kind, lang)} Â· ${
        isCiv ? HOVER.civAircraft(lang) : HOVER.milAircraft(lang)
      }`,
      meta: [
        hoveredMilAircraft.type,
        hoveredMilAircraft.altitude != null ? `${hoveredMilAircraft.altitude} ft` : null,
        hoveredMilAircraft.groundSpeed != null ? `${hoveredMilAircraft.groundSpeed} kn` : null,
        hoveredMilAircraft.track != null ? `${Math.round(hoveredMilAircraft.track)}Â°` : null,
      ]
        .filter(Boolean)
        .join(" Â· ") || undefined,
      hint: HOVER.hintDetail(lang),
    };
  }
  if (hoveredNeptunThreat) {
    return {
      kind: "event",
      title: getNeptunTypeLabel(hoveredNeptunThreat.type, lang),
      detail: HOVER.neptunTrack(lang),
      meta: [
        formatNeptunLocation(hoveredNeptunThreat),
        hoveredNeptunThreat.confidenceLevel,
        hoveredNeptunThreat.velocity?.speedKmh
          ? `${Math.round(hoveredNeptunThreat.velocity.speedKmh)} km/h`
          : null,
        hoveredNeptunThreat.predictedHeading != null
          ? HOVER.heading(Math.round(hoveredNeptunThreat.predictedHeading), lang)
          : null,
      ]
        .filter(Boolean)
        .join(" Â· ") || undefined,
      body: hoveredNeptunThreat.explanationShort || undefined,
    };
  }
  if (hoveredPoint) {
    if (hoveredPoint.displayKind === "static") {
      if (
        hoveredPoint.kind === "chokepoint" ||
        hoveredPoint.kind === "logistics-hub" ||
        hoveredPoint.kind === "submarine-tunnel"
      ) {
        const riskNote = hoveredPoint.meta?.riskNote;
        const relatedTickers = hoveredPoint.meta?.relatedTickers;
        const throughput = hoveredPoint.meta?.throughput;
        return {
          kind: "static",
          title: hoveredPoint.name,
          detail: staticKindLabel(hoveredPoint.kind, lang),
          body: typeof riskNote === "string" ? riskNote : undefined,
          meta:
            [
              typeof throughput === "string" ? throughput : null,
              typeof relatedTickers === "string"
                ? HOVER.relatedTickers(relatedTickers, lang)
                : null,
            ]
              .filter(Boolean)
              .join(" Â· ") || undefined,
          hint: HOVER.hintFlyZone(lang),
        };
      }
      if (hoveredPoint.kind === "ucdp-event") {
        const m = hoveredPoint.meta ?? {};
        const deaths =
          typeof m.fatalities_best === "number"
            ? m.fatalities_best
            : typeof m.deaths === "number"
              ? m.deaths
              : null;
        const year = typeof m.year === "number" ? m.year : null;
        const vType =
          typeof m.violenceType === "string"
            ? m.violenceType
            : typeof m.type === "string"
              ? m.type
              : null;
        const country = typeof m.country === "string" ? m.country : null;
        const date = typeof m.date === "string" ? m.date : null;
        const version =
          typeof m.sourceDatasetVersion === "string" ? m.sourceDatasetVersion : null;
        return {
          kind: "static",
          title: hoveredPoint.name,
          detail: staticKindLabel(hoveredPoint.kind, lang),
          body:
            [
              country,
              date || (year != null ? String(year) : null),
              vType,
              deaths != null
                ? lang === "en"
                  ? `fatalities (best) ${deaths}`
                  : `ì¬ë§(ì¶ì ) ${deaths}`
                : null,
            ]
              .filter(Boolean)
              .join(" Â· ") || undefined,
          meta: `${UCDP_ATTRIBUTION_SHORT}${version ? ` ${version}` : ""} Â· ${UCDP_ATTRIBUTION}`,
          hint: lang === "en" ? `Source: ${UCDP_SOURCE_URL}` : `ì¶ì²: ${UCDP_SOURCE_URL}`,
        };
      }
      const firstMeta = hoveredPoint.meta
        ? Object.entries(hoveredPoint.meta).find(([, value]) => value != null && value !== "")
        : null;
      return {
        kind: "static",
        title: hoveredPoint.name,
        detail:
          hoveredPoint.kind === "military-base"
            ? HOVER.militaryBase(lang, hoveredPoint.meta?.country)
            : staticKindLabel(hoveredPoint.kind, lang),
        meta:
          hoveredPoint.kind === "military-base"
            ? [
                hoveredPoint.meta?.branch,
                hoveredPoint.meta?.operator,
                hoveredPoint.meta?.hostCountry || hoveredPoint.meta?.state,
                hoveredPoint.meta?.country,
              ]
                .filter(Boolean)
                .join(" Â· ") || undefined
            : firstMeta
              ? `${firstMeta[0]}: ${firstMeta[1]}`
              : undefined,
      };
    }
    if (hoveredPoint.displayKind === "mil") {
      return {
        kind: "event",
        title: hoveredPoint.callsign || hoveredPoint.hex || "Military aircraft",
        detail: HOVER.milAircraft(lang),
        meta: [
          hoveredPoint.type,
          hoveredPoint.registration,
          hoveredPoint.altitude != null ? `${hoveredPoint.altitude} ft` : null,
          hoveredPoint.groundSpeed != null ? `${hoveredPoint.groundSpeed} kn` : null,
          hoveredPoint.squawk ? `SQK ${hoveredPoint.squawk}` : null,
          hoveredPoint.bellingcatMilitary
            ? "Bellingcat adsb-history mil hex"
            : null,
        ]
          .filter(Boolean)
          .join(" Â· ") || undefined,
        hint: HOVER.hintDetail(lang),
      };
    }
    if (hoveredPoint.displayKind === "ais") {
      const kind = hoveredPoint.disguised
        ? hoveredPoint.disguisedKind === "arsenal-ship"
          ? "ìì¥Â·ë¬´ê¸°ê³  ê°ì¡° ì ë°"
          : "ìì¥Â·ë¤í¬íë¦¬í¸ ì ë°"
        : hoveredPoint.category === "military"
          ? "êµ°ì© í¨ì "
          : hoveredPoint.category === "commercial"
            ? "ë¯¼ê° ì ë°"
            : "ì ë°";
      const typeLabel = aisDisplayTypeLabel(hoveredPoint, lang);
      return {
        kind: "static",
        title: hoveredPoint.shipName || `MMSI ${hoveredPoint.mmsi}`,
        detail: hoveredPoint.disguised
          ? `AIS_Tracker Â· ${kind}`
          : `AIS Â· ${kind}`,
        meta: [
          typeLabel,
          hoveredPoint.speedOverGround != null ? `${hoveredPoint.speedOverGround} kn` : null,
          hoveredPoint.sanctionsMatch
            ? `ì ì¬ íì¸ Â· ${hoveredPoint.sanctionsMatch.list} Â· ${hoveredPoint.sanctionsMatch.entityName} Â· ì¤ëì· ${hoveredPoint.sanctionsMatch.asOf} ê¸°ì¤`
            : null,
          hoveredPoint.disguised
            ? "ì¶ì² https://github.com/arandomguyhere/AIS_Tracker.git"
            : null,
        ]
          .filter(Boolean)
          .join(" Â· ") || undefined,
        hint: HOVER.hintDetail(lang),
      };
    }
    if (hoveredPoint.displayKind === "firms-fire") {
      const soundKind = hoveredPoint.soundKind;
      const acq =
        [hoveredPoint.acqDate, hoveredPoint.acqTime].filter(Boolean).join(" ") || null;
      return {
        kind: "static",
        title: firmsCauseTitle(soundKind, lang),
        detail: firmsCauseBody(soundKind, lang),
        badge: `NASA FIRMS Â· ${firmsFireSoundLabel(soundKind, lang)} Â· ${evidenceTierLabel("observed", lang)}`,
        meta: [
          hoveredPoint.frp != null ? `FRP ${hoveredPoint.frp} MW` : null,
          hoveredPoint.confidence ? `ì ë¢°ë ${hoveredPoint.confidence}` : null,
          hoveredPoint.satellite ? `ìì± ${hoveredPoint.satellite}` : null,
          hoveredPoint.daynight === "N"
            ? lang === "en"
              ? "Night"
              : "ì¼ê°"
            : hoveredPoint.daynight === "D"
              ? lang === "en"
                ? "Day"
                : "ì£¼ê°"
              : null,
          acq,
        ]
          .filter(Boolean)
          .join(" Â· ") || undefined,
        hint: firmsCauseHint(soundKind, lang),
      };
    }
    if (hoveredPoint.displayKind === "conflict-cluster") {
      return {
        kind: "polygon",
        title: hoveredPoint.name,
        detail: HOVER.aiWarZone(tensionLabel(hoveredPoint.tension, lang), lang),
        meta: HOVER.countSuffix(hoveredPoint.eventCount, lang),
        hint: HOVER.hintDetail(lang),
      };
    }
    if (hoveredPoint.displayKind === "tzeva-adom") {
      return {
        kind: "event",
        title: translateOrefTitle(hoveredPoint.title || hoveredPoint.region, labelLanguage),
        detail: tzevaUi("brand", labelLanguage),
        meta: hoveredPoint.active ? HOVER.active(lang) : hoveredPoint.alertDate,
      };
    }
    if (hoveredPoint.displayKind === "newfeeds-attack") {
      const sev = hoveredPoint.severity;
      const langKey = labelLanguage === "en" ? "en" : "ko";
      return {
        kind: "event",
        badge: severityLabel(sev, langKey),
        title: localizeNewfeedsTitle(hoveredPoint.title, labelLanguage),
        detail: [
          severityHint(sev, langKey),
          localizeNewfeedsCategory(hoveredPoint.category, labelLanguage),
          localizeNewfeedsLocation(hoveredPoint.location, labelLanguage),
          hoveredPoint.hapiTag
            ? `HAPI Â· ${hoveredPoint.hapiTag}`
            : null,
        ]
          .filter(Boolean)
          .join(" Â· "),
        body: localizeNewfeedsSummary(hoveredPoint.summary, labelLanguage) || undefined,
        meta: `${hoveredPoint.sourceName} Â· ${NEWFEEDS_ATTRIBUTION_SHORT}`,
        hint: newfeedsUi("hoverHint", labelLanguage),
      };
    }
    if (hoveredPoint.displayKind === "ukraine-theater-intensity") {
      const sev = hoveredPoint.severity;
      const langKey = labelLanguage === "en" ? "en" : "ko";
      return {
        kind: "event",
        badge: severityLabel(sev, langKey),
        title: hoveredPoint.title,
        detail: [
          lang === "en" ? "Ukraine front intensity" : "ì°í¬ë¼ ì ì¥ ê°ë",
          hoveredPoint.hapiTag ? `HAPI Â· ${hoveredPoint.hapiTag}` : null,
        ]
          .filter(Boolean)
          .join(" Â· "),
      };
    }
    if (hoveredPoint.displayKind === "china-theater-incident") {
      const dyad = CHINA_THEATER_DYAD_LABEL[hoveredPoint.dyad][lang];
      const sea = CHINA_THEATER_SEA_LABEL[hoveredPoint.sea][lang];
      const prov = neonIncidentHoverExtras(hoveredPoint, lang, dyad);
      return {
        kind: "event",
        badge: prov.badge,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: sea,
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta: [prov.metaExtra, "IRONSIGHT dens · SCS / ECS / WestPac"].filter(Boolean).join(" · "),
        hint: prov.hintExtra ?? (lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동"),
      };
    }
    if (hoveredPoint.displayKind === "korea-missile-incident") {
      const kind = KOREA_MISSILE_KIND_LABEL[hoveredPoint.kind][lang];
      const anchor = KOREA_MISSILE_ANCHOR_LABEL[hoveredPoint.anchor][lang];
      const prov = neonIncidentHoverExtras(hoveredPoint, lang, kind);
      return {
        kind: "event",
        badge: prov.badge,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: anchor,
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta: [
          prov.metaExtra,
          lang === "en"
            ? "DPRK launch / event dens (no confirmed splash)"
            : "북한 발사·시험 발생지 (탄착 미확정)",
        ]
          .filter(Boolean)
          .join(" · "),
        hint: prov.hintExtra ?? (lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동"),
      };
    }
    if (hoveredPoint.displayKind === "russia-strike-incident") {
      const kind = RUSSIA_STRIKE_KIND_LABEL[hoveredPoint.kind][lang];
      const prov = neonIncidentHoverExtras(hoveredPoint, lang, kind);
      return {
        kind: "event",
        badge: prov.badge,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: lang === "en" ? "reported · unverified" : "보도 · 미확인",
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta: [
          prov.metaExtra,
          lang === "en"
            ? "Ukraine → Russia strike hotspot (no confirmed trajectory)"
            : "우크라 → 러 타격 핫스팟 (궤적 미확정)",
        ]
          .filter(Boolean)
          .join(" · "),
        hint: prov.hintExtra ?? (lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동"),
      };
    }
    if (hoveredPoint.displayKind === "europe-drone-incident") {
      const kind = DRONE_INCIDENT_KIND_LABEL[hoveredPoint.kind][lang];
      const prov = neonIncidentHoverExtras(hoveredPoint, lang, kind);
      return {
        kind: "event",
        badge: prov.badge,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: lang === "en" ? "reported · unverified" : "보도 · 미확인",
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta: [
          prov.metaExtra,
          lang === "en"
            ? "NATO airspace / airport drone incidents (attribution often unclear)"
            : "나토 영공·공항 드론 사건 (출처 불명·미확인 다수)",
        ]
          .filter(Boolean)
          .join(" · "),
        hint: prov.hintExtra ?? (lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동"),
      };
    }
    if (hoveredPoint.displayKind === "casualty-skull") {
      const place = hoveredPoint.admin1Name || hoveredPoint.id;
      if (isMediazonaCasualtyId(hoveredPoint.id)) {
        return {
          kind: "static",
          title: lang === "en" ? "Ukraine Â· named casualties" : "ì°í¬ë¼ Â· ëªì ì¬ìì",
          detail: hoveredPoint.sourceAttribution || "Mediazona Ã BBC Â· CSIS",
          body: hoveredPoint.sourceHint,
          meta: hoveredPoint.killedLabel,
          hint:
            lang === "en"
              ? "Named RU KIA lower bound Â· CSIS WIA estimate"
              : "ëªì íì¸ ì ì¬(íí) Â· CSIS ë¶ì ì¶ì ",
        };
      }
      return {
        kind: "static",
        title: lang === "en" ? `Active front Â· ${place}` : `ì´ë¦° ì ì  Â· ${place}`,
        detail: HAPI_ATTRIBUTION,
        body: hoveredPoint.sourceHint,
        meta: HAPI_SOURCE_LINE,
        hint: lang === "en" ? `Cite ACLED Â· ${ACLED_HOME_URL}` : `ì¶ì² ACLED Â· ${ACLED_HOME_URL}`,
      };
    }
    if (hoveredPoint.displayKind === "ukraine-gdelt-neon") {
      return {
        kind: "event",
        badge: gdeltNewsAlertLabel(lang),
        title: formatGdeltNewsHeadline(hoveredPoint),
        detail: [
          gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
          hoveredPoint.hapiTag ? `HAPI Â· ${hoveredPoint.hapiTag}` : null,
        ]
          .filter(Boolean)
          .join(" Â· "),
        meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" Â· ") || undefined,
        hint: HOVER.hintView(lang),
      };
    }
    if (hoveredPoint.displayKind === "recon-sat-html") {
      const langKey = lang === "en" ? "en" : "ko";
      return {
        kind: "static",
        title: hoveredPoint.name,
        detail: [
          reconCountryLabel(hoveredPoint.country, langKey),
          reconSensorLabel(hoveredPoint.sensor, langKey),
          `${hoveredPoint.altKm.toFixed(0)} km`,
        ].join(" Â· "),
        hint:
          langKey === "en"
            ? "Theoretical horizon only â not imaging activity"
            : "ì´ë¡ ì ê°ìê¶ë§ â ì´¬ì íë ìë",
      };
    }
    if (hoveredPoint.displayKind === "telegram-neon") {
      return {
        kind: "event",
        title: hoveredPoint.title || hoveredPoint.label,
        detail:
          lang === "en"
            ? `Telegram OSINT Â· ${hoveredPoint.label}`
            : `íë ê·¸ë¨ OSINT Â· ${hoveredPoint.label}`,
        meta: `@${hoveredPoint.id}`,
        hint: lang === "en" ? "Click to fly Â· half preview in Intel" : "í´ë¦­íë©´ ì´ë Â· ì ë¬¸ì ì¸í í­",
      };
    }
    if (hoveredPoint.displayKind === "gdelt-tag-html") {
      return {
        kind: "event",
        badge: `${gdeltNewsAlertLabel(lang)} Â· ${evidenceTierLabel("unverified", lang)}`,
        title: formatGdeltNewsHeadline(hoveredPoint),
        detail: gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
        meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" Â· ") || undefined,
        hint: HOVER.hintView(lang),
      };
    }

    const gdeltPoint = hoveredPoint as GlobePoint;
    return {
      kind: "event",
      badge: `${gdeltNewsAlertLabel(lang)} Â· ${evidenceTierLabel("unverified", lang)}`,
      title: formatGdeltNewsHeadline(gdeltPoint),
      detail: `${eventTierLabel(gdeltPoint.eventTier ?? "war", lang)}${
        isFreshEvent(gdeltPoint) ? HOVER.freshBreaking(lang) : ""
      }`,
      meta: gdeltPoint.country || gdeltPoint.category,
    };
  }

  if (hoveredPolygon) {
    if (hoveredPolygon.polygonLayer === "country") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: hoveredPolygon.nameLong || HOVER.country(lang),
        meta: [hoveredPolygon.isoA3, hoveredPolygon.continent].filter(Boolean).join(" Â· ") || undefined,
      };
    }
    if (hoveredPolygon.polygonLayer === "military-base") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: HOVER.militaryBase(lang, hoveredPolygon.country),
        meta: [hoveredPolygon.component, hoveredPolygon.state, hoveredPolygon.country]
          .filter(Boolean)
          .join(" Â· ") || undefined,
      };
    }
    if (hoveredPolygon.polygonLayer === "resource-deposit") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: hoveredPolygon.mineral,
        meta: [
          hoveredPolygon.country,
          lang === "en" ? "deposit footprint" : "ë§¤ì¥ ì¤ê³½",
        ]
          .filter(Boolean)
          .join(" Â· "),
        hint:
          lang === "en"
            ? "Approximate deposit extent (curated outline)"
            : "ë§¤ì¥ ë²ì ê°ëµ ì¤ê³½ (íë ì´ì)",
      };
    }
    if (hoveredPolygon.polygonLayer === "missile-silo-field") {
      return {
        kind: "polygon",
        title: hoveredPolygon.gridId || hoveredPolygon.name,
        detail: lang === "en" ? "PLARF survey grid cell" : "PLARF íë³´ ì¡°ì¬ ê²©ì",
        meta: lang === "en" ? "not a confirmed silo" : "íì¸ ì¬ì¼ë¡ ìë",
        hint:
          lang === "en"
            ? "Area screened for candidate sites â disjoint from known silo fields"
            : "ì íë³´ì§ íì ë²ì Â· íì¸ë ì¬ì¼ë¡êµ°ê³¼ ê²¹ì¹ì§ ìì",
      };
    }
    if (hoveredPolygon.polygonLayer === "missile-belt") {
      const isNavalDomain = hoveredPolygon.domain === "naval";
      const theaterLabel = isNavalDomain
        ? lang === "en"
          ? "Russia Northern Fleet (naval)"
          : "ë¬ìì ë¶ë°©í¨ë (í´êµ°)"
        : hoveredPolygon.theater === "china"
          ? lang === "en"
            ? "China PLARF belt"
            : "ì¤êµ­ PLARF ë²¨í¸"
          : hoveredPolygon.theater === "russia"
            ? lang === "en"
              ? "Russia RVSN belt"
              : "ë¬ìì RVSN ë²¨í¸"
            : hoveredPolygon.theater === "iran"
              ? lang === "en"
                ? "Iran missile belt"
                : "ì´ë ë¯¸ì¬ì¼ ë²¨í¸"
              : lang === "en"
                ? "North Korea missile belt"
                : "ë¶í ë¯¸ì¬ì¼ ë²¨í¸";
      const metaLabel = isNavalDomain
        ? lang === "en"
          ? "naval bastion / strike-range sector (not RVSN)"
          : "í´êµ° ë²¤í¸Â·ì¬ê±°ë¦¬ê¶ (RVSN ìë)"
        : hoveredPolygon.theater === "china"
          ? lang === "en"
            ? "confirmed silo-field complex"
            : "íì¸ ì¬ì¼ë¡êµ° ë¨ì§"
          : hoveredPolygon.theater === "russia"
            ? lang === "en"
              ? "RVSN army / division garrison belt"
              : "RVSN êµ°ë¨Â·ì¬ë¨ ì£¼ë ë²¨í¸"
            : lang === "en"
              ? "evaluative basing belt"
              : "íê°ì© ë°°ì¹ ë²¨í¸";
      return {
        kind: "polygon",
        title: lang === "en" ? hoveredPolygon.nameEn : hoveredPolygon.name,
        detail: theaterLabel,
        meta: metaLabel,
        hint: lang === "en" ? hoveredPolygon.noteEn : hoveredPolygon.noteKo,
      };
    }
    if (hoveredPolygon.polygonLayer === "conflict-zone") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: HOVER.aiWarZone(tensionLabel(hoveredPolygon.tension, lang), lang),
        meta: HOVER.countSuffix(hoveredPolygon.eventCount, lang),
      };
    }
    if (hoveredPolygon.polygonLayer === "gps-jam") {
      const pct = Math.round(hoveredPolygon.ratio * 100);
      return {
        kind: "polygon",
        title:
          lang === "en"
            ? `GPS interference Â· ${pct}%`
            : `GPS ì¬ë° ì¶ì  Â· ${pct}%`,
        detail: gpsJamLevelLabel(hoveredPolygon.level, lang),
        meta:
          lang === "en"
            ? `${hoveredPolygon.total} aircraft Â· H3 Â· ${gpsJamDate ?? "â"}`
            : `ê´ì¸¡ ${hoveredPolygon.total}ë Â· H3 Â· ${gpsJamDate ?? "â"}`,
        hint: gpsJamDisclaimer(lang),
      };
    }
    if (isUkraineViinaPolygonLayer(hoveredPolygon.polygonLayer)) {
      const status =
        hoveredPolygon.polygonLayer === "ukraine-ru"
          ? HOVER.uaRu(lang)
          : hoveredPolygon.polygonLayer === "ukraine-ua"
            ? HOVER.uaUa(lang)
            : HOVER.uaContested(lang);
      return {
        kind: "polygon",
        title: hoveredPolygon.name || status,
        detail: HOVER.ukraineFront(status, lang),
        meta: hoveredPolygon.adm1 || hoveredPolygon.nameLong || undefined,
        hint: HOVER.hintView(lang),
      };
    }
  }

  if (hoveredPath) {
    const navareaHit = findNavareaFeature(navareaFeatures, hoveredPath);
    if (navareaHit) {
      const shortDesc =
        navareaHit.description.length > 160
          ? `${navareaHit.description.slice(0, 157)}â¦`
          : navareaHit.description;
      return {
        kind: "path",
        title: `NAVAREA ${navareaHit.region} Â· ${navareaHit.id}`,
        detail:
          labelLanguage === "en"
            ? "In-force navigational warning"
            : "í­íê²½ë³´ Â· ë³´ë¼ì êµ¬ì­",
        body: navareaHit.areaHint || shortDesc || undefined,
        meta: [navareaHit.source.toUpperCase(), navareaHit.geometryType]
          .filter(Boolean)
          .join(" Â· "),
        hint: labelLanguage === "en" ? "Click for brief" : "í´ë¦­ Â· ì ë³´ ë¸ë¦¬í",
      };
    }
    const exerciseHit = findMilitaryExercise(displayMilitaryExercises, hoveredPath);
    if (exerciseHit) {
      const conf = EXERCISE_CONFIDENCE_LABEL[exerciseHit.confidence];
      return {
        kind: "path",
        title: exerciseHit.title,
        detail:
          labelLanguage === "en" ? "Military exercise zone" : "êµ°ì¬ íë ¨ êµ¬ì­",
        body: exerciseHit.summary?.slice(0, 160) || exerciseHit.rfGapNote || undefined,
        meta: labelLanguage === "en" ? conf.en : conf.ko,
        hint: labelLanguage === "en" ? "Click for brief" : "í´ë¦­ Â· ì ë³´ ë¸ë¦¬í",
      };
    }
    const ukmtoHit = findUkmtoIncident(ukmtoIncidents, hoveredPath);
    if (ukmtoHit) {
      return {
        kind: "path",
        title: `UKMTO Â· ${ukmtoHit.incidentTypeName}`,
        detail:
          labelLanguage === "en"
            ? "Merchant vessel security warning"
            : "ìì  ë³´ì ê²½ë³´ Â· íë°± ë¹ê¸",
        body: ukmtoHit.place || ukmtoHit.detail || undefined,
        meta: [ukmtoHit.vesselType, ukmtoHit.pinColour].filter(Boolean).join(" Â· ") || undefined,
        hint: labelLanguage === "en" ? "Click for brief" : "í´ë¦­ Â· ì ë³´ ë¸ë¦¬í",
      };
    }
    const dispute =
      hoveredPath.kind === "dispute-zone" || hoveredPath.kind === "dispute-hatch"
        ? disputeFromPath(hoveredPath)
        : undefined;
    if (dispute) {
      const overview = disputeOverviews.get(dispute.id);
      const overviewText = overview?.overviewKo
        ? truncateOverview(overview.overviewKo)
        : dispute.note || undefined;
      return {
        kind: "path",
        title: dispute.name,
        detail: HOVER.disputeBorder(
          hatchStyleLabelLocalized(getDisputeHatchStyle(dispute), lang, Boolean(dispute && isCombatHazard(dispute))),
          lang,
        ),
        body: overviewText,
        meta: `${isCombatHazard(dispute) ? HOVER.combatPrefix(lang) : ""}${HOVER.tensionPrefix(
          tensionLabel(dispute.tension, lang),
          lang,
        )}${
          dispute.categories.length ? ` Â· ${dispute.categories.map((category) => disputeCategoryLabel(category, lang)).join(" Â· ")}` : ""
        }${overview?.parties?.length ? ` Â· ${overview.parties.join(" Â· ")}` : ""}`,
        hint: HOVER.hintDetail(lang),
      };
    }

    /** CRINK ì¶ ì ì  â ë§ì°ì¤ ììì ê´ê³ ì¢ë¥Â·ìëë¥¼ ë°ë¡ ì½ê² */
    if (hoveredPath.kind === "axis-link") {
      const meta = hoveredPath.meta ?? {};
      const mode = meta.mode === "arms" ? "arms" : "network";
      const relationRaw = typeof meta.relationKind === "string" ? meta.relationKind : "";
      const relationKind = (
        ["patronage", "arms", "energy", "hybrid", "diplomatic"] as const
      ).includes(relationRaw as AxisRelationKind)
        ? (relationRaw as AxisRelationKind)
        : mode === "arms"
          ? "arms"
          : null;
      const fromName =
        typeof meta.fromName === "string" && meta.fromName
          ? meta.fromName
          : typeof meta.from === "string"
            ? meta.from
            : "";
      const toName =
        typeof meta.toName === "string" && meta.toName
          ? meta.toName
          : typeof meta.to === "string"
            ? meta.to
            : "";
      const pair =
        fromName && toName ? `${fromName} â ${toName}` : undefined;
      const kindLabel = relationKind
        ? axisRelationKindLabel(relationKind, labelLanguage === "en" ? "en" : "ko")
        : null;
      const statusLabel = corridorStatusLabel(
        typeof meta.status === "string" ? meta.status : null,
        labelLanguage === "en" ? "en" : "ko",
      );

      if (mode === "arms") {
        const category =
          typeof meta.category === "string" && meta.category ? meta.category : null;
        const tiv = typeof meta.tiv === "number" ? meta.tiv : null;
        const count = typeof meta.count === "number" ? meta.count : null;
        const years = typeof meta.years === "string" ? meta.years : null;
        const metaBits = [
          pair,
          statusLabel,
          tiv != null ? `TIV ${tiv}` : null,
          count != null
            ? labelLanguage === "en"
              ? `${count} deals`
              : `${count}ê±´`
            : null,
          years,
        ].filter(Boolean);
        return {
          kind: "path",
          title:
            fromName && toName
              ? `${fromName} â ${toName}`
              : hoveredPath.name || pathKindLabel("axis-link", lang),
          detail:
            labelLanguage === "en"
              ? `Axis arms transfer${category ? ` Â· ${category}` : ""}${statusLabel ? ` Â· ${statusLabel}` : ""}`
              : `ì¶ ë¬´ê¸°ì´ì ${category ? ` Â· ${category}` : ""}${statusLabel ? ` Â· ${statusLabel}` : ""}`,
          body:
            statusLabel && meta.status === "under-construction"
              ? labelLanguage === "en"
                ? "Route geometry is mapped, but this corridor is still under construction â no completion glint."
                : "ì¤ì¸¡ ê²½ë¡ë¡ íìíì§ë§ ìì§ ê±´ì¤ì¤ì´ë¼ ìê³µ ê¸ë¦°í¸ë ììµëë¤."
              : labelLanguage === "en"
                ? "Dashed arc Â· registered conventional transfer summary between axis partners."
                : "ì ì  Â· ì¶ íí¸ë ì¬ì´ ë±ë¡ë ì¬ëì ì´ì  ìì½ìëë¤.",
          meta: metaBits.length ? metaBits.join(" Â· ") : undefined,
        };
      }

      const distanceMeta =
        hoveredPath.lengthKm && Number.isFinite(hoveredPath.lengthKm)
          ? HOVER.pathLength(hoveredPath.lengthKm.toLocaleString(), lang)
          : undefined;
      return {
        kind: "path",
        title: hoveredPath.name || pathKindLabel("axis-link", lang),
        detail:
          labelLanguage === "en"
            ? `Axis link${kindLabel ? ` Â· ${kindLabel}` : ""}${statusLabel ? ` Â· ${statusLabel}` : ""}`
            : `ì¶ ê´ê³ë§ ì ì ${kindLabel ? ` Â· ${kindLabel}` : ""}${statusLabel ? ` Â· ${statusLabel}` : ""}`,
        body:
          statusLabel && meta.status === "under-construction"
            ? labelLanguage === "en"
              ? "Mapped corridor still under construction â shown without completion glint."
              : "ì¤ì¸¡ íëì´ì§ë§ ìì§ ê±´ì¤ì¤ â ìê³µ ê¸ë¦°í¸ ìì´ íìí©ëë¤."
            : relationKind
              ? axisRelationKindBlurb(relationKind, labelLanguage === "en" ? "en" : "ko")
              : labelLanguage === "en"
                ? "Dashed arc linking CRINK hubs and partners."
                : "CRINK íë¸Â·íí¸ëë¥¼ ìë ì ì ìëë¤.",
        meta: [pair, statusLabel, distanceMeta].filter(Boolean).join(" Â· ") || undefined,
      };
    }

    if (hoveredPath.kind === "strategic-corridor") {
      const meta = hoveredPath.meta ?? {};
      const statusLabel = corridorStatusLabel(
        typeof meta.status === "string" ? meta.status : null,
        labelLanguage === "en" ? "en" : "ko",
      );
      const category =
        typeof meta.category === "string" ? meta.category : null;
      const rank =
        typeof meta.scalerank === "number"
          ? meta.scalerank
          : typeof hoveredPath.scalerank === "number"
            ? hoveredPath.scalerank
            : null;
      const legMode =
        typeof meta.legMode === "string" ? meta.legMode : null;
      const distanceMeta =
        hoveredPath.lengthKm && Number.isFinite(hoveredPath.lengthKm)
          ? HOVER.pathLength(hoveredPath.lengthKm.toLocaleString(), lang)
          : undefined;
      const categoryLabel =
        category === "military-logistics"
          ? labelLanguage === "en"
            ? "Military logistics"
            : "êµ°ì ì´ì¡"
          : category === "sanctions-evasion"
            ? labelLanguage === "en"
              ? "Sanctions evasion"
              : "ì ì¬ ì°í"
            : labelLanguage === "en"
              ? "Trade corridor"
              : "ë¬´ì­ íë";
      return {
        kind: "path",
        title: hoveredPath.name || pathKindLabel("strategic-corridor", lang),
        detail: [
          categoryLabel,
          statusLabel,
          rank != null ? `rank ${rank}` : null,
          legMode,
          meta.gaugeBreak === 1
            ? labelLanguage === "en"
              ? "gauge-break"
              : "ê¶¤ê°ë³ê²½"
            : meta.euRailGateway === 1
              ? labelLanguage === "en"
                ? "EU gateway"
                : "EU ê²ì´í¸ì¨ì´"
              : null,
        ]
          .filter(Boolean)
          .join(" Â· "),
        body:
          statusLabel && meta.status === "under-construction"
            ? labelLanguage === "en"
              ? "Mapped corridor still under construction â shown without completion glint."
              : "ì¤ì¸¡ íëì´ì§ë§ ìì§ ê±´ì¤ì¤ â ìê³µ ê¸ë¦°í¸ ìì´ íìí©ëë¤."
            : labelLanguage === "en"
              ? "Click for Eurostat ton-km sparkline Â· Comtrade USD dual signal Â· LOD from corridor ranks."
              : "í´ë¦­ ì Eurostat ton-km ìê³ì´ Â· Comtrade USD ì´ì¤ ì í¸ Â· LODë ì ë íë ë­í¬.",
        meta: distanceMeta,
        hint: HOVER.hintDetail(lang),
      };
    }

    const detail = pathKindLabel(hoveredPath.kind, lang);
    const distanceMeta =
      hoveredPath.lengthKm && Number.isFinite(hoveredPath.lengthKm)
        ? HOVER.pathLength(hoveredPath.lengthKm.toLocaleString(), lang)
        : undefined;
    if (
      hoveredPath.kind === "neptun-trail" ||
      hoveredPath.kind === "neptun-projection" ||
      hoveredPath.kind === "neptun-trail-archived"
    ) {
      return {
        kind: "path",
        title: hoveredPath.name || detail,
        detail,
        meta: distanceMeta,
        body:
          hoveredPath.kind === "neptun-projection"
            ? HOVER.neptunProjection(lang)
            : HOVER.neptunTrailBody(lang),
      };
    }
    return {
      kind: "path",
      title: hoveredPath.name || detail,
      detail,
      meta: distanceMeta,
    };
  }
  if (hoverGlobeCoords) {
    const ocean = lookupOceanName(
      hoverGlobeCoords.lat,
      hoverGlobeCoords.lng,
      labelLanguage,
    );
    return {
      kind: "ocean",
      title: ocean.title,
      detail: ocean.detail,
    };
  }

  return {
    kind: "ocean",
    title: HOVER.ocean(lang),
    detail: HOVER.oceanDetail(lang),
  };
}

/** ì§êµ¬ë³¸ í¸ë² ì¹´ë â buildHoverCard ìì í¨ìë¥¼ useMemoë¡ ê°ì¼ ìì í */
export function useHoverCard(params: HoverCardParams): HoverCard {
  const {
    disputeFromPath,
    disputeOverviews,
    hoveredCarrier,
    hoveredMilAircraft,
    civAircraft,
    hoverGlobeCoords,
    hoveredNeptunThreat,
    hoveredPath,
    hoveredPoint,
    hoveredPolygon,
    labelLanguage,
    gpsJamDate,
    ukmtoIncidents,
    navareaFeatures,
    displayMilitaryExercises,
  } = params;

  return useMemo<HoverCard>(
    () =>
      buildHoverCard({
        disputeFromPath,
        disputeOverviews,
        hoveredCarrier,
        hoveredMilAircraft,
        civAircraft,
        hoverGlobeCoords,
        hoveredNeptunThreat,
        hoveredPath,
        hoveredPoint,
        hoveredPolygon,
        labelLanguage,
        gpsJamDate,
        ukmtoIncidents,
        navareaFeatures,
        displayMilitaryExercises,
      }),
    [
      disputeFromPath,
      disputeOverviews,
      hoveredCarrier,
      hoveredMilAircraft,
      civAircraft,
      hoverGlobeCoords,
      hoveredNeptunThreat,
      hoveredPath,
      hoveredPoint,
      hoveredPolygon,
      labelLanguage,
      gpsJamDate,
      ukmtoIncidents,
      navareaFeatures,
      displayMilitaryExercises,
    ],
  );
}
