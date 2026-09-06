/**
 * 좌표 없는 승인 관측을 본문·지명 텍스트로 지구본에 올린다.
 * DB를 바꾸지 않고 표시용으로만 좌표를 채운다.
 */

import {
  findGazetteerEntry,
  gazetteerLabel,
  WEST_PACIFIC_GAZETTEER,
  type GazetteerEntry,
} from "@/data/westPacificGazetteer";
import {
  extractRelativeLocationFromText,
  geocodeObservation,
} from "@/lib/shipMovements/geocode";
import type { PublicShipObservation } from "@/lib/shipMovements/types";

/** 위치 문구가 전혀 없을 때 — 필리핀해 중심 추정 데스크 포인트 */
const WESTPAC_DESK = {
  lat: 18.5,
  lng: 140.0,
  precisionKm: 900,
} as const;

function hasFiniteCoords(o: PublicShipObservation): boolean {
  return (
    o.lat != null &&
    o.lng != null &&
    Number.isFinite(o.lat) &&
    Number.isFinite(o.lng)
  );
}

function observationTextBlob(o: PublicShipObservation): string {
  return [
    o.locationLabel,
    o.missingLocationNote,
    o.summary,
    o.title,
    ...(o.evidenceQuotes || []),
  ]
    .filter(Boolean)
    .join("\n");
}

/** 본문에서 가장 긴 별칭 매칭 지명 */
export function findBestGazetteerInText(text: string): GazetteerEntry | null {
  if (!text.trim()) return null;

  // 상대위치 패턴의 지명 우선
  const relative = extractRelativeLocationFromText(text);
  if (relative?.placeName) {
    const hit = findGazetteerEntry(relative.placeName);
    if (hit) return hit;
  }

  const lower = text.toLowerCase().normalize("NFKC");
  let best: GazetteerEntry | null = null;
  let bestLen = 0;

  for (const entry of WEST_PACIFIC_GAZETTEER) {
    for (const alias of [entry.nameEn, entry.nameKo, ...entry.aliases]) {
      const a = alias.toLowerCase().normalize("NFKC").trim();
      if (a.length < 3) continue;
      if ((lower.includes(a) || text.includes(alias)) && a.length > bestLen) {
        best = entry;
        bestLen = a.length;
      }
    }
  }
  return best;
}

/**
 * 좌표가 없으면 본문/지명으로 추정 좌표를 채운다.
 * 이미 좌표가 있으면 원본 유지.
 */
export function softPlacePublicObservation(
  o: PublicShipObservation,
): PublicShipObservation {
  if (hasFiniteCoords(o)) {
    return o.mapEligible ? o : { ...o, mapEligible: true };
  }

  const blob = observationTextBlob(o);
  const relative = extractRelativeLocationFromText(blob);

  if (relative) {
    const geo = geocodeObservation({
      vesselName: o.vesselName,
      hullNumber: o.hullNumber,
      navy: o.navyLabel,
      navyCode: o.navyCode,
      observedAt: o.observedAt,
      location: {
        raw: relative.raw,
        placeName: relative.placeName,
        bearingDeg: relative.bearingDeg,
        distanceKm: relative.distanceKm,
        directionText: relative.directionText,
      },
      evidenceQuotes: o.evidenceQuotes,
      vesselConfidence: o.vesselConfidence,
    });
    if (geo.lat != null && geo.lng != null) {
      return {
        ...o,
        lat: geo.lat,
        lng: geo.lng,
        mapEligible: true,
        locationStatus: geo.locationStatus,
        method: geo.method,
        precisionKm: geo.precisionKm,
        confidence: o.confidence === "observed" ? o.confidence : "estimated",
        locationLabel:
          o.locationLabel ||
          (geo.locationLabelKo && geo.locationLabelEn
            ? geo.locationLabelKo
            : geo.locationLabelKo || geo.locationLabelEn),
      };
    }
  }

  const entry = findBestGazetteerInText(blob);
  if (entry) {
    const status =
      entry.kind === "sea" ? ("broad" as const) : ("chokepoint" as const);
    const method =
      entry.kind === "sea"
        ? ("gazetteer-sea" as const)
        : entry.kind === "axis"
          ? ("gazetteer-axis" as const)
          : ("gazetteer-point" as const);
    return {
      ...o,
      lat: entry.lat,
      lng: entry.lng,
      mapEligible: true,
      locationStatus: status,
      method,
      precisionKm: Math.max(entry.defaultPrecisionKm, entry.kind === "sea" ? 120 : 30),
      confidence: "estimated",
      locationLabel: o.locationLabel || gazetteerLabel(entry, "ko"),
    };
  }

  // 마지막: 서태평양 데스크 포인트 — 목록에만 있던 건도 글로브에 표시
  return {
    ...o,
    lat: WESTPAC_DESK.lat,
    lng: WESTPAC_DESK.lng,
    mapEligible: true,
    precisionKm: WESTPAC_DESK.precisionKm,
    confidence: "estimated",
    method: "none",
    locationLabel:
      o.locationLabel ||
      o.missingLocationNote ||
      "위치 미상 · 서태평양 추정",
  };
}

export function softPlacePublicObservations(
  observations: PublicShipObservation[],
): PublicShipObservation[] {
  return observations.map(softPlacePublicObservation);
}
