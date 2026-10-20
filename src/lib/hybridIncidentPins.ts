/**
 * 하이브리드전 사건 핀 — 세슘 지구본용.
 *
 * 두 갈래를 한 목록으로 합친다:
 *  - Liveuamap 속보 중 `hybrid` 태그가 붙은 것 (좌표는 피드 제공)
 *  - RSS 뉴스 중 분류기가 하이브리드전으로 본 것 (좌표는 제목·요약·사진 설명의 지명)
 * RSS 쪽은 위치가 도시 단위로 확인된 것만 핀으로 올린다. 나라만 나온 기사는
 * 대표 도시 추정이라 지도에 찍으면 오해를 부르므로 제외한다 (속보 양피지에서는 추정 표기로 이동 가능).
 */

import {
  classifyHybridIncident,
  HYBRID_ZONE_PRIORITY,
  hybridAgencyOf,
  hybridKindOf,
  hybridZoneOf,
  type HybridKind,
  type HybridZone,
} from "@/lib/liveuamap/hybridWarfare";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsStreamItem } from "@/lib/news/types";

export type HybridIncidentPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  kind: HybridKind;
  zone: HybridZone;
  /** 보도에서 기관·국가 후원 세력 개입이 의심됨 */
  agency: boolean;
  publishedAt: string;
  source: "liveuamap" | "news";
  /** 근거 기사 링크 (뉴스 출처일 때) */
  link?: string;
};

/** 핀을 지도에 두는 기간 */
export const HYBRID_PIN_MAX_AGE_MS = 72 * 60 * 60 * 1000;
export const HYBRID_PIN_MAX = 60;

export function hybridPinsFromLiveua(
  events: readonly LiveuamapEvent[],
  lang: "ko" | "en",
): HybridIncidentPin[] {
  const out: HybridIncidentPin[] = [];
  for (const e of events) {
    const kind = hybridKindOf(e);
    if (!kind) continue;
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
    out.push({
      id: `liveua:${e.id}`,
      lat: e.lat,
      lng: e.lng,
      title: lang === "en" ? e.title : e.titleKo?.trim() || e.title,
      kind,
      zone: hybridZoneOf(e) ?? "world",
      agency: hybridAgencyOf(e),
      publishedAt: e.publishedAt,
      source: "liveuamap",
    });
  }
  return out;
}

export type NewsPlaceResolver = (
  item: NewsStreamItem,
) => { lat: number; lng: number } | null;

/**
 * RSS 뉴스 → 하이브리드 핀.
 * @param resolvePlace 도시 단위로 확인된 좌표만 돌려준다 (나라만 나오면 null)
 */
export function hybridPinsFromNews(
  items: readonly NewsStreamItem[],
  resolvePlace: NewsPlaceResolver,
  lang: "ko" | "en",
): HybridIncidentPin[] {
  const out: HybridIncidentPin[] = [];
  for (const item of items) {
    const incident = classifyHybridIncident({
      title: item.title,
      body: [item.summary, item.imageCaption].filter(Boolean).join(" "),
      titleKo: item.titleKo,
      bodyKo: item.bodyKo,
      tags: [],
      lat: Number.NaN,
      lng: Number.NaN,
    });
    if (!incident) continue;
    const at = resolvePlace(item);
    if (!at) continue;
    out.push({
      id: `news:${item.id}`,
      lat: at.lat,
      lng: at.lng,
      title: lang === "en" ? item.title : item.titleKo?.trim() || item.title,
      kind: incident.kind,
      zone: incident.zone,
      agency: Boolean(incident.agency),
      publishedAt: item.pubDate,
      source: "news",
      link: item.link,
    });
  }
  return out;
}

/** 같은 사건이 Liveuamap·뉴스 양쪽에 있으면 가까운 위치(≈15km)·같은 종류는 하나로 */
export function mergeHybridPins(
  lists: ReadonlyArray<readonly HybridIncidentPin[]>,
  nowMs = Date.now(),
): HybridIncidentPin[] {
  const cutoff = nowMs - HYBRID_PIN_MAX_AGE_MS;
  const all = lists
    .flat()
    .filter((p) => {
      const t = Date.parse(p.publishedAt);
      return Number.isFinite(t) ? t >= cutoff : true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const kept: HybridIncidentPin[] = [];
  const deduped: HybridIncidentPin[] = [];
  for (const pin of all) {
    const dup = kept.find(
      (k) =>
        k.kind === pin.kind &&
        Math.abs(k.lat - pin.lat) < 0.15 &&
        Math.abs(k.lng - pin.lng) < 0.2,
    );
    if (dup) {
      // 기관 지목은 어느 한쪽이라도 있으면 유지, Liveuamap 좌표를 우선한다
      if (pin.agency && !dup.agency) dup.agency = true;
      continue;
    }
    const copy = { ...pin };
    kept.push(copy);
    deduped.push(copy);
  }
  if (deduped.length <= HYBRID_PIN_MAX) return deduped;
  // 상한을 넘으면 주시 순위(중부-동부유럽·발트 우선)와 최신순으로 남기고, 표시는 다시 최신순
  return [...deduped]
    .sort(
      (a, b) =>
        HYBRID_ZONE_PRIORITY[b.zone] - HYBRID_ZONE_PRIORITY[a.zone] ||
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    )
    .slice(0, HYBRID_PIN_MAX)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
