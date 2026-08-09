"use client";

import { useMemo } from "react";
import type {
  DisputeArea,
  DisputeOverview,
  MilitaryAircraft,
  TransportPath,
  UsCarrier,
} from "@/data/geoTypes";
import type { GlobeDisplayPoint, HoverCard, PolygonLayerFeature } from "@/components/globe/types";
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
import { ACLED_HOME_URL, HAPI_ATTRIBUTION, HAPI_SOURCE_LINE } from "@/lib/hapiConflictCasualties";
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

/** 호버 대상 → sourceCatalog / 설명 키 */
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
    if (p.displayKind === "casualty-skull") return "hapi-conflict-casualties";
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

/** 레이어 기본 신뢰(공통 스키마)를 호버 카드에 붙인다. 피처 confidence는 기존 meta에 유지. */
export function withLayerReliability(
  card: HoverCard,
  layerId: string | null,
  lang: LabelLanguage,
): HoverCard {
  if (!layerId || card.kind === "ocean") return card;
  const rel = formatReliabilityForHover(layerId, lang);
  if (!rel) return card;
  const layerLine =
    lang === "en" ? `Layer: ${rel.meta}` : `레이어: ${rel.meta}`;
  const meta = card.meta ? `${card.meta} · ${layerLine}` : layerLine;
  const hint = card.hint ? `${card.hint} · ${rel.hint}` : rel.hint;
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

/** 지구본 호버 카드 콘텐츠 조립 — 순수 함수 (테스트·재사용 용이) */
export function buildHoverCard(params: HoverCardParams): HoverCard {
  const layerId = resolveHoverLayerId(params);
  emitHoverLayerId(layerId);
  const lang = params.labelLanguage;
  const withRel = withLayerReliability(buildHoverCardRaw(params), layerId, lang);
  /** 마우스 옆 카드에 “이게 뭔지” 평문 — body가 비었을 때만 채움 */
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
      meta: `${hoveredCarrier.hull} · ${hoveredCarrier.location}`,
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
      detail: `${milAircraftRoleLabel(kind, lang)} · ${
        isCiv ? HOVER.civAircraft(lang) : HOVER.milAircraft(lang)
      }`,
      meta: [
        hoveredMilAircraft.type,
        hoveredMilAircraft.altitude != null ? `${hoveredMilAircraft.altitude} ft` : null,
        hoveredMilAircraft.groundSpeed != null ? `${hoveredMilAircraft.groundSpeed} kn` : null,
        hoveredMilAircraft.track != null ? `${Math.round(hoveredMilAircraft.track)}°` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
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
        .join(" · ") || undefined,
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
              .join(" · ") || undefined,
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
                  : `사망(추정) ${deaths}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
          meta: `${UCDP_ATTRIBUTION_SHORT}${version ? ` ${version}` : ""} · ${UCDP_ATTRIBUTION}`,
          hint: lang === "en" ? `Source: ${UCDP_SOURCE_URL}` : `출처: ${UCDP_SOURCE_URL}`,
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
            ? HOVER.militaryBase(lang)
            : staticKindLabel(hoveredPoint.kind, lang),
        meta:
          hoveredPoint.kind === "military-base"
            ? [
                hoveredPoint.meta?.branch,
                hoveredPoint.meta?.hostCountry || hoveredPoint.meta?.state,
                hoveredPoint.meta?.hostCountry ? "USA" : hoveredPoint.meta?.country,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
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
          .join(" · ") || undefined,
        hint: HOVER.hintDetail(lang),
      };
    }
    if (hoveredPoint.displayKind === "ais") {
      const kind = hoveredPoint.disguised
        ? hoveredPoint.disguisedKind === "arsenal-ship"
          ? "위장·무기고 개조 선박"
          : "위장·다크플리트 선박"
        : hoveredPoint.category === "military"
          ? "군용 함정"
          : hoveredPoint.category === "commercial"
            ? "민간 선박"
            : "선박";
      const typeLabel = aisDisplayTypeLabel(hoveredPoint, lang);
      return {
        kind: "static",
        title: hoveredPoint.shipName || `MMSI ${hoveredPoint.mmsi}`,
        detail: hoveredPoint.disguised
          ? `AIS_Tracker · ${kind}`
          : `AIS · ${kind}`,
        meta: [
          typeLabel,
          hoveredPoint.speedOverGround != null ? `${hoveredPoint.speedOverGround} kn` : null,
          hoveredPoint.sanctionsMatch
            ? `제재 확인 · ${hoveredPoint.sanctionsMatch.list} · ${hoveredPoint.sanctionsMatch.entityName} · 스냅샷 ${hoveredPoint.sanctionsMatch.asOf} 기준`
            : null,
          hoveredPoint.disguised
            ? "출처 https://github.com/arandomguyhere/AIS_Tracker.git"
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
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
        badge: `NASA FIRMS · ${firmsFireSoundLabel(soundKind, lang)} · ${evidenceTierLabel("observed", lang)}`,
        meta: [
          hoveredPoint.frp != null ? `FRP ${hoveredPoint.frp} MW` : null,
          hoveredPoint.confidence ? `신뢰도 ${hoveredPoint.confidence}` : null,
          hoveredPoint.satellite ? `위성 ${hoveredPoint.satellite}` : null,
          hoveredPoint.daynight === "N"
            ? lang === "en"
              ? "Night"
              : "야간"
            : hoveredPoint.daynight === "D"
              ? lang === "en"
                ? "Day"
                : "주간"
              : null,
          acq,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
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
            ? `HAPI · ${hoveredPoint.hapiTag}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        body: localizeNewfeedsSummary(hoveredPoint.summary, labelLanguage) || undefined,
        meta: `${hoveredPoint.sourceName} · ${NEWFEEDS_ATTRIBUTION_SHORT}`,
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
          lang === "en" ? "Ukraine front intensity" : "우크라 전장 강도",
          hoveredPoint.hapiTag ? `HAPI · ${hoveredPoint.hapiTag}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    if (hoveredPoint.displayKind === "china-theater-incident") {
      const dyad = CHINA_THEATER_DYAD_LABEL[hoveredPoint.dyad][lang];
      const sea = CHINA_THEATER_SEA_LABEL[hoveredPoint.sea][lang];
      return {
        kind: "event",
        badge: dyad,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: sea,
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta: "IRONSIGHT dens · SCS / ECS / WestPac",
        hint: lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동",
      };
    }
    if (hoveredPoint.displayKind === "korea-missile-incident") {
      const kind = KOREA_MISSILE_KIND_LABEL[hoveredPoint.kind][lang];
      const anchor = KOREA_MISSILE_ANCHOR_LABEL[hoveredPoint.anchor][lang];
      return {
        kind: "event",
        badge: kind,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: anchor,
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta:
          lang === "en"
            ? "DPRK launch / event dens (no confirmed splash)"
            : "북한 발사·실험 발생지 (탄착 미확정)",
        hint: lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동",
      };
    }
    if (hoveredPoint.displayKind === "russia-strike-incident") {
      const kind = RUSSIA_STRIKE_KIND_LABEL[hoveredPoint.kind][lang];
      return {
        kind: "event",
        badge: kind,
        title: lang === "en" ? hoveredPoint.titleEn : hoveredPoint.titleKo,
        detail: lang === "en" ? "reported · unverified" : "보도 · 미확인",
        body: lang === "en" ? hoveredPoint.bodyEn : hoveredPoint.bodyKo,
        meta:
          lang === "en"
            ? "Ukraine → Russia strike hotspot (no confirmed trajectory)"
            : "우크라 → 러 타격 핫스팟 (궤적 미확정)",
        hint: lang === "en" ? "Click to fly to location" : "클릭하면 해당 위치로 이동",
      };
    }
    if (hoveredPoint.displayKind === "casualty-skull") {
      const place = hoveredPoint.admin1Name || hoveredPoint.id;
      return {
        kind: "static",
        title: lang === "en" ? `Active front · ${place}` : `열린 전선 · ${place}`,
        detail: HAPI_ATTRIBUTION,
        body: hoveredPoint.sourceHint,
        meta: HAPI_SOURCE_LINE,
        hint: lang === "en" ? `Cite ACLED · ${ACLED_HOME_URL}` : `출처 ACLED · ${ACLED_HOME_URL}`,
      };
    }
    if (hoveredPoint.displayKind === "ukraine-gdelt-neon") {
      return {
        kind: "event",
        badge: gdeltNewsAlertLabel(lang),
        title: formatGdeltNewsHeadline(hoveredPoint),
        detail: [
          gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
          hoveredPoint.hapiTag ? `HAPI · ${hoveredPoint.hapiTag}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" · ") || undefined,
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
        ].join(" · "),
        hint:
          langKey === "en"
            ? "Theoretical horizon only — not imaging activity"
            : "이론상 가시권만 — 촬영 활동 아님",
      };
    }
    if (hoveredPoint.displayKind === "telegram-neon") {
      return {
        kind: "event",
        title: hoveredPoint.title || hoveredPoint.label,
        detail:
          lang === "en"
            ? `Telegram OSINT · ${hoveredPoint.label}`
            : `텔레그램 OSINT · ${hoveredPoint.label}`,
        meta: `@${hoveredPoint.id}`,
        hint: lang === "en" ? "Click to fly · half preview in Intel" : "클릭하면 이동 · 전문은 인텔 탭",
      };
    }
    if (hoveredPoint.displayKind === "gdelt-tag-html") {
      return {
        kind: "event",
        badge: `${gdeltNewsAlertLabel(lang)} · ${evidenceTierLabel("unverified", lang)}`,
        title: formatGdeltNewsHeadline(hoveredPoint),
        detail: gdeltLocationTagLabel(hoveredPoint.eventTier, lang),
        meta: [hoveredPoint.country, hoveredPoint.eventDate].filter(Boolean).join(" · ") || undefined,
        hint: HOVER.hintView(lang),
      };
    }

    return {
      kind: "event",
      badge: `${gdeltNewsAlertLabel(lang)} · ${evidenceTierLabel("unverified", lang)}`,
      title: formatGdeltNewsHeadline(hoveredPoint),
      detail: `${eventTierLabel(hoveredPoint.eventTier, lang)}${
        isFreshEvent(hoveredPoint) ? HOVER.freshBreaking(lang) : ""
      }`,
      meta: hoveredPoint.country || hoveredPoint.category,
    };
  }

  if (hoveredPolygon) {
    if (hoveredPolygon.polygonLayer === "country") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: hoveredPolygon.nameLong || HOVER.country(lang),
        meta: [hoveredPolygon.isoA3, hoveredPolygon.continent].filter(Boolean).join(" · ") || undefined,
      };
    }
    if (hoveredPolygon.polygonLayer === "military-base") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: HOVER.militaryBase(lang),
        meta: [hoveredPolygon.component, hoveredPolygon.state, hoveredPolygon.country]
          .filter(Boolean)
          .join(" · ") || undefined,
      };
    }
    if (hoveredPolygon.polygonLayer === "resource-deposit") {
      return {
        kind: "polygon",
        title: hoveredPolygon.name,
        detail: hoveredPolygon.mineral,
        meta: [
          hoveredPolygon.country,
          lang === "en" ? "deposit footprint" : "매장 윤곽",
        ]
          .filter(Boolean)
          .join(" · "),
        hint:
          lang === "en"
            ? "Approximate deposit extent (curated outline)"
            : "매장 범위 개략 윤곽 (큐레이션)",
      };
    }
    if (hoveredPolygon.polygonLayer === "missile-silo-field") {
      return {
        kind: "polygon",
        title: hoveredPolygon.gridId || hoveredPolygon.name,
        detail: lang === "en" ? "PLARF survey grid cell" : "PLARF 후보 조사 격자",
        meta: lang === "en" ? "not a confirmed silo" : "확인 사일로 아님",
        hint:
          lang === "en"
            ? "Area screened for candidate sites — disjoint from known silo fields"
            : "새 후보지 탐색 범위 · 확인된 사일로군과 겹치지 않음",
      };
    }
    if (hoveredPolygon.polygonLayer === "missile-belt") {
      const theaterLabel =
        hoveredPolygon.theater === "china"
          ? lang === "en"
            ? "China PLARF belt"
            : "중국 PLARF 벨트"
          : hoveredPolygon.theater === "russia"
            ? lang === "en"
              ? "Russia RVSN belt"
              : "러시아 RVSN 벨트"
            : hoveredPolygon.theater === "iran"
              ? lang === "en"
                ? "Iran missile belt"
                : "이란 미사일 벨트"
              : lang === "en"
                ? "North Korea missile belt"
                : "북한 미사일 벨트";
      const metaLabel =
        hoveredPolygon.theater === "china"
          ? lang === "en"
            ? "confirmed silo-field complex"
            : "확인 사일로군 단지"
          : hoveredPolygon.theater === "russia"
            ? lang === "en"
              ? "RVSN army / division garrison belt"
              : "RVSN 군단·사단 주둔 벨트"
            : lang === "en"
              ? "evaluative basing belt"
              : "평가용 배치 벨트";
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
            ? `GPS interference · ${pct}%`
            : `GPS 재밍 추정 · ${pct}%`,
        detail: gpsJamLevelLabel(hoveredPolygon.level, lang),
        meta:
          lang === "en"
            ? `${hoveredPolygon.total} aircraft · H3 · ${gpsJamDate ?? "—"}`
            : `관측 ${hoveredPolygon.total}대 · H3 · ${gpsJamDate ?? "—"}`,
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
          ? `${navareaHit.description.slice(0, 157)}…`
          : navareaHit.description;
      return {
        kind: "path",
        title: `NAVAREA ${navareaHit.region} · ${navareaHit.id}`,
        detail:
          labelLanguage === "en"
            ? "In-force navigational warning"
            : "항행경보 · 보라색 구역",
        body: navareaHit.areaHint || shortDesc || undefined,
        meta: [navareaHit.source.toUpperCase(), navareaHit.geometryType]
          .filter(Boolean)
          .join(" · "),
        hint: labelLanguage === "en" ? "Click for brief" : "클릭 · 전보 브리프",
      };
    }
    const exerciseHit = findMilitaryExercise(displayMilitaryExercises, hoveredPath);
    if (exerciseHit) {
      const conf = EXERCISE_CONFIDENCE_LABEL[exerciseHit.confidence];
      return {
        kind: "path",
        title: exerciseHit.title,
        detail:
          labelLanguage === "en" ? "Military exercise zone" : "군사 훈련 구역",
        body: exerciseHit.summary?.slice(0, 160) || exerciseHit.rfGapNote || undefined,
        meta: labelLanguage === "en" ? conf.en : conf.ko,
        hint: labelLanguage === "en" ? "Click for brief" : "클릭 · 전보 브리프",
      };
    }
    const ukmtoHit = findUkmtoIncident(ukmtoIncidents, hoveredPath);
    if (ukmtoHit) {
      return {
        kind: "path",
        title: `UKMTO · ${ukmtoHit.incidentTypeName}`,
        detail:
          labelLanguage === "en"
            ? "Merchant vessel security warning"
            : "상선 보안 경보 · 흑백 빗금",
        body: ukmtoHit.place || ukmtoHit.detail || undefined,
        meta: [ukmtoHit.vesselType, ukmtoHit.pinColour].filter(Boolean).join(" · ") || undefined,
        hint: labelLanguage === "en" ? "Click for brief" : "클릭 · 전보 브리프",
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
          dispute.categories.length ? ` · ${dispute.categories.map((category) => disputeCategoryLabel(category, lang)).join(" · ")}` : ""
        }${overview?.parties?.length ? ` · ${overview.parties.join(" · ")}` : ""}`,
        hint: HOVER.hintDetail(lang),
      };
    }

    /** 반서방 축 점선 — 마우스 옆에서 관계 종류·상대를 바로 읽게 */
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
        fromName && toName ? `${fromName} ↔ ${toName}` : undefined;
      const kindLabel = relationKind
        ? axisRelationKindLabel(relationKind, labelLanguage === "en" ? "en" : "ko")
        : null;

      if (mode === "arms") {
        const category =
          typeof meta.category === "string" && meta.category ? meta.category : null;
        const tiv = typeof meta.tiv === "number" ? meta.tiv : null;
        const count = typeof meta.count === "number" ? meta.count : null;
        const years = typeof meta.years === "string" ? meta.years : null;
        const metaBits = [
          pair,
          tiv != null ? `TIV ${tiv}` : null,
          count != null
            ? labelLanguage === "en"
              ? `${count} deals`
              : `${count}건`
            : null,
          years,
        ].filter(Boolean);
        return {
          kind: "path",
          title:
            fromName && toName
              ? `${fromName} → ${toName}`
              : hoveredPath.name || pathKindLabel("axis-link", lang),
          detail:
            labelLanguage === "en"
              ? `Axis arms transfer${category ? ` · ${category}` : ""}`
              : `축 무기이전${category ? ` · ${category}` : ""}`,
          body:
            labelLanguage === "en"
              ? "Dashed arc · registered conventional transfer summary between axis partners."
              : "점선 · 축 파트너 사이 등록된 재래식 이전 요약입니다.",
          meta: metaBits.length ? metaBits.join(" · ") : undefined,
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
            ? `Axis link${kindLabel ? ` · ${kindLabel}` : ""}`
            : `축 관계망 점선${kindLabel ? ` · ${kindLabel}` : ""}`,
        body: relationKind
          ? axisRelationKindBlurb(relationKind, labelLanguage === "en" ? "en" : "ko")
          : labelLanguage === "en"
            ? "Dashed arc linking anti-Western axis hubs and partners."
            : "반서방 축 허브·파트너를 잇는 점선입니다.",
        meta: [pair, distanceMeta].filter(Boolean).join(" · ") || undefined,
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

/** 지구본 호버 카드 — buildHoverCard 순수 함수를 useMemo로 감싼 얇은 훅 */
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
