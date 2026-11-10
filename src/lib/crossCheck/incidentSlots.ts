/**
 * 속보창의 대조 칸.
 * 기사 주소는 그 문장이 실린 곳이라 얇음이다.
 * 둘째 칸은 그 문장과 어긋날 수 있는 원본이다.
 * 선박은 받아 둔 AIS로 본다. 같은 이름이 그때 그 근처면 맞음, 다른 바다에 있으면 어긋남.
 * 맞음은 배가 거기 있었다는 뜻이지 공격이 있었다는 뜻은 아니다.
 * 선명이 없으면 근처 배가 보여도 맞음을 찍지 않는다.
 * 타격은 경보·열·항적·지진이 그 시각 그 근처에 있으면 맞음이다.
 * 정세는 당사자 텔레그램 글이 성명 원문이다. 오신트 글은 넣지 않는다.
 * 국제해사국·레카프·연합해사정보센터의 목록 주소는 원문이 아니다.
 * 그 사건과 맞는 PDF 한 장만 주소가 된다. 싱크탱크 문서는 이 칸에 넣지 않는다.
 * 기록이 없으면 언급 없음이다. 없다고 해서 어긋남이 되지는 않는다.
 */

import type { AisVessel } from "@/data/geoTypes";
import type { StackItem } from "@/lib/incidentStack/build";
import { realVesselName } from "@/lib/incidentStack/shipText";
import { peelUrlsFromText } from "@/lib/liveuamap/peelTitleUrls";
import { classifyOriginalUrl, type OriginalKind } from "@/lib/crossCheck/originalLink";
import {
  feedsWereSearched,
  frontMapReady,
  frontRecord,
  statementHit,
  strikeHitFromFeeds,
  type FrontMap,
  type SensorHit,
  type SensorKind,
  type StatementPost,
  type TrackFix,
} from "@/lib/crossCheck/witnessFeeds";
import type { FirmsFire } from "@/data/geoTypes";
import { matchIncidentToAis } from "@/lib/vesselIncidentMatch";

export type CheckPlace = "ship" | "strike" | "posture" | "front" | "exercise" | "charge" | "closure";

export type CheckResult = "match" | "conflict" | "silent" | "thin" | "original";

export type CheckSlot = {
  id: "report" | "witness";
  place: CheckPlace;
  result: CheckResult;
  sourceName: string;
  href: string | null;
  kind: OriginalKind | null;
  vesselName: string | null;
  /** 우리가 받아 둔 원문. 기사 전문은 넣지 않는다. */
  body: string | null;
  /** 앞부분만 있을 때. 나머지는 href. */
  partial: boolean;
  /** AIS에서 본 그 이름. 맞음·어긋남일 때 */
  observedName: string | null;
  distanceKm: number | null;
  /** 선명 없는 사건 근처에 배가 보였는지 */
  nearby: boolean;
  /** 둘째 칸이 무엇을 봤는지. 없으면 아직 그 기록이 없다. */
  sensor: SensorKind | "ais" | null;
  /** 받아 둔 목록을 실제로 뒤졌는지. 빈 목록은 뒤진 것이 아니다. */
  looked: boolean;
};

export type CheckContext = {
  /** 비어 있거나 없으면 위치를 아직 대조하지 않은 것이다. 빈 수신을 부재로 쓰지 않는다. */
  vessels?: readonly AisVessel[] | null;
  fires?: readonly FirmsFire[] | null;
  tracks?: readonly TrackFix[] | null;
  posts?: readonly StatementPost[] | null;
  /** 경보 이력·지진처럼 카드를 연 뒤에 받아 온 기록 */
  remote?: SensorHit | null;
  remoteLooked?: boolean;
  /** 라이브유에이맵 통제면. 비어 있으면 아직 안 붙인 것이다. */
  front?: FrontMap;
};

function firstLink(text: string | null | undefined) {
  if (!text) return null;
  for (const url of peelUrlsFromText(text).urls) {
    const link = classifyOriginalUrl(url);
    if (link) return link;
  }
  return null;
}

function articleLink(item: StackItem) {
  return (
    classifyOriginalUrl(item.url) ??
    classifyOriginalUrl(item.liveua?.sourceUrl) ??
    firstLink(item.detail)
  );
}

const WITNESS: Record<CheckPlace, string> = {
  ship: "ais",
  strike: "alert",
  posture: "statement",
  front: "record",
  exercise: "notice",
  charge: "charge",
  closure: "notice",
};

function emptyWitness(place: CheckPlace, vesselName: string | null, result: CheckResult): CheckSlot {
  return {
    id: "witness",
    place,
    result,
    sourceName: WITNESS[place],
    href: null,
    kind: null,
    vesselName,
    body: null,
    partial: false,
    observedName: null,
    distanceKm: null,
    nearby: false,
    sensor: null,
    looked: false,
  };
}

function shipWitness(item: StackItem, vessels: readonly AisVessel[] | null | undefined): CheckSlot {
  const vesselName = realVesselName(item.vesselName);
  if (!vessels || vessels.length === 0) {
    return emptyWitness("ship", vesselName, vesselName ? "thin" : "silent");
  }
  const matches = matchIncidentToAis(
    {
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      vesselName,
      vesselType: item.vesselType ?? null,
      utcDateOfIncident: Number.isFinite(item.at) && item.at > 0 ? new Date(item.at).toISOString() : null,
    },
    [...vessels],
  );
  if (!vesselName) {
    return { ...emptyWitness("ship", null, "silent"), nearby: matches.length > 0, sensor: "ais", looked: true };
  }
  const top = matches[0];
  if (top?.grade === "strong") {
    return {
      ...emptyWitness("ship", vesselName, "match"),
      observedName: top.shipName,
      distanceKm: top.distanceKm,
      sensor: "ais",
      looked: true,
    };
  }
  if (top && top.nameScore >= 0.999) {
    return {
      ...emptyWitness("ship", vesselName, "conflict"),
      observedName: top.shipName,
      distanceKm: top.distanceKm,
      sensor: "ais",
      looked: true,
    };
  }
  return { ...emptyWitness("ship", vesselName, "silent"), sensor: "ais", looked: true };
}

export function checkSlots(item: StackItem, place: CheckPlace, ctx?: CheckContext): CheckSlot[] {
  const official = place === "ship" && (item.source === "ukmto" || item.source === "nga");
  const link = official ? firstLink(item.detail) : articleLink(item);
  const body = official ? item.detail?.trim() || null : null;
  const report: CheckSlot = official
    ? {
        id: "report",
        place,
        result: "original",
        sourceName: item.source === "ukmto" ? "UKMTO" : "NGA",
        href: link?.href ?? null,
        kind: link?.kind ?? null,
        vesselName: null,
        body,
        partial: false,
        observedName: null,
        distanceKm: null,
        nearby: false,
        sensor: null,
        looked: false,
      }
    : {
        id: "report",
        place,
        result: "thin",
        sourceName: link ? new URL(link.href).host.replace(/^www\./, "") : "article",
        href: link?.href ?? null,
        kind: link?.kind ?? null,
        vesselName: null,
        body: null,
        partial: false,
        observedName: null,
        distanceKm: null,
        nearby: false,
        sensor: null,
        looked: false,
      };
  const witness =
    place === "ship"
      ? shipWitness(item, ctx?.vessels)
      : place === "strike"
        ? strikeWitness(item, ctx)
        : place === "posture"
          ? postureWitness(item, ctx?.posts)
          : place === "front"
            ? frontWitness(item, ctx?.front)
            : paperWitness(place);
  return [report, witness];
}

function fromHit(place: CheckPlace, hit: SensorHit, looked: boolean): CheckSlot {
  return {
    ...emptyWitness(place, null, hit.result),
    sourceName: hit.sourceName,
    href: hit.href,
    body: hit.body,
    partial: hit.partial,
    distanceKm: hit.distanceKm,
    sensor: hit.sensor,
    looked,
  };
}

/** 훈련·기소·폐쇄는 열이나 전선 면으로 등급을 올리지 않는다. 둘째 문서는 아직 없으면 얇음이다. */
function paperWitness(place: "exercise" | "charge" | "closure"): CheckSlot {
  return { ...emptyWitness(place, null, "thin"), looked: true };
}

function strikeWitness(item: StackItem, ctx: CheckContext | undefined): CheckSlot {
  const hit = strikeHitFromFeeds(item, {
    fires: ctx?.fires,
    tracks: ctx?.tracks,
    posts: ctx?.posts,
    remote: ctx?.remote,
  });
  const looked =
    feedsWereSearched(ctx?.fires) || feedsWereSearched(ctx?.posts) || ctx?.remoteLooked === true || ctx?.remote != null;
  if (!hit) return { ...emptyWitness("strike", null, "silent"), looked };
  return fromHit("strike", hit, true);
}

function postureWitness(item: StackItem, posts: readonly StatementPost[] | null | undefined): CheckSlot {
  const hit = statementHit(item, posts);
  if (hit) return fromHit("posture", hit, true);
  return { ...emptyWitness("posture", null, "silent"), looked: feedsWereSearched(posts) };
}

function frontWitness(item: StackItem, map: FrontMap | undefined): CheckSlot {
  const hit = frontRecord(item, map ?? null);
  if (hit) return fromHit("front", hit, true);
  return { ...emptyWitness("front", null, "silent"), looked: frontMapReady(map ?? null) };
}
