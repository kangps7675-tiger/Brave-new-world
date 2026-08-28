/**
 * 전선 사상자 HTML 마커 — HAPI(전선 누적 사망) + Mediazona(우크라 명의 KIA·CSIS WIA).
 */
import type { CasualtySkullHtmlMarker } from "@/components/globe/types";
import type { HapiActiveFront } from "@/lib/hapiConflictCasualties";
import {
  ACLED_HOME_URL,
  GAZA_WAR_START,
  HAPI_ATTRIBUTION_SHORT,
  HAPI_SOURCE_LINE,
  IRAN_WAR_START,
  UKRAINE_FULLSCALE_START,
} from "@/lib/hapiConflictCasualties";
import {
  CASUALTY_ELEGY_LINES,
  WOUNDED_FIXED_NOTE,
} from "@/lib/warCasualtyOverlay";
import type { MediazonaCasualtySnapshot } from "@/lib/mediazonaCasualties";

export const MEDIAZONA_CASUALTY_MARKER_ID = "mediazona-ru-kia";

export function isMediazonaCasualtyId(id: string | undefined): boolean {
  return Boolean(id && id.startsWith("mediazona"));
}

export function isHapiEventsOnly(front: HapiActiveFront): boolean {
  const grayZone =
    front.locationCode === "IRN" || front.theaterId === "china-taiwan";
  return grayZone && front.killed <= 0 && front.events > 0;
}

export function hapiCasualtyKilledLabel(
  locationCode: string,
  useEvents: boolean,
  lang: "ko" | "en",
): string {
  const en = lang === "en";
  if (useEvents) {
    if (locationCode === "IRN") {
      return en ? "Iran political violence events" : "이란 정치폭력 사건";
    }
    return en ? "Political violence events" : "정치폭력 사건";
  }
  if (locationCode === "UKR") {
    return en
      ? `Fatalities since ${UKRAINE_FULLSCALE_START} (ACLED)`
      : "개전 이후 사망 (ACLED)";
  }
  if (locationCode === "IRN") {
    return en
      ? `Fatalities since ${IRAN_WAR_START} (ACLED)`
      : "개전 이후 사망 (ACLED)";
  }
  if (locationCode === "PSE" || locationCode === "ISR" || locationCode === "LBN") {
    return en
      ? `Fatalities since ${GAZA_WAR_START} (ACLED)`
      : "누적 사망 (ACLED)";
  }
  return en ? "Recent fatalities (ACLED)" : "최근 사망 (ACLED)";
}

export function buildHapiCasualtySkullMarker(
  front: HapiActiveFront,
  lang: "ko" | "en",
): CasualtySkullHtmlMarker {
  const en = lang === "en";
  const useEvents = isHapiEventsOnly(front);
  return {
    markerId: `casualty-skull-${front.id}`,
    displayKind: "casualty-skull" as const,
    id: front.id,
    theaterId: front.theaterId,
    locationCode: front.locationCode,
    lat: front.lat,
    lng: front.lng,
    killed: useEvents ? front.events : front.killed,
    wounded: 0,
    killedLabel: hapiCasualtyKilledLabel(front.locationCode, useEvents, lang),
    woundedLabel: en ? "WIA" : "부상",
    asOf: front.periodEnd || "",
    sourceHint: en
      ? `${HAPI_ATTRIBUTION_SHORT} · ${front.admin1Name} · ${front.periodStart}–${front.periodEnd} · ${ACLED_HOME_URL}`
      : `${HAPI_ATTRIBUTION_SHORT} · ${front.admin1Name} · ${front.periodStart}–${front.periodEnd} · ${ACLED_HOME_URL}`,
    elegyLines: en ? CASUALTY_ELEGY_LINES.en : CASUALTY_ELEGY_LINES.ko,
    hideWounded: true,
    territorySpanDeg: front.territorySpanDeg,
    sourceAttribution: HAPI_SOURCE_LINE,
    admin1Name: front.admin1Name,
  };
}

export function buildMediazonaCasualtyMarker(
  snap: MediazonaCasualtySnapshot,
  lang: "ko" | "en",
): CasualtySkullHtmlMarker {
  const en = lang === "en";
  return {
    markerId: `casualty-skull-${MEDIAZONA_CASUALTY_MARKER_ID}`,
    displayKind: "casualty-skull" as const,
    id: MEDIAZONA_CASUALTY_MARKER_ID,
    theaterId: "russia-ukraine",
    locationCode: "UKR",
    lat: snap.marker.lat,
    lng: snap.marker.lng,
    killed: snap.confirmedNamedDeaths,
    wounded: snap.estimatedWounded,
    killedLabel: en ? snap.marker.killedLabelEn : snap.marker.killedLabelKo,
    woundedLabel: en ? snap.marker.woundedLabelEn : snap.marker.woundedLabelKo,
    asOf: snap.confirmedNamedDeathsAsOf,
    sourceHint: en
      ? `Mediazona × BBC named KIA (lower bound) · CSIS WIA estimate · ${snap.confirmedNamedDeathsAsOf}`
      : `Mediazona × BBC 명의 확인 전사(하한) · CSIS 부상 추정 · ${snap.confirmedNamedDeathsAsOf}`,
    elegyLines: en ? CASUALTY_ELEGY_LINES.en : CASUALTY_ELEGY_LINES.ko,
    woundedNote: en ? WOUNDED_FIXED_NOTE.en : WOUNDED_FIXED_NOTE.ko,
    hideWounded: false,
    territorySpanDeg: 5.5,
    sourceAttribution: "Mediazona × BBC · CSIS WIA est.",
    admin1Name: "Donetska",
  };
}
