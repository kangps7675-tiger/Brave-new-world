/**
 * 3D 라이브 LiveUA 속보 → 시세·초크 연결 (관측용 · 매매 권유 아님).
 * Job: 속보가 터진 자리 → 흔들릴 수 있는 운송·시세만 짧게 보여 준다.
 */

import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import type { StaticPoint } from "@/data/geoTypes";
import { relatedTickerLabelsToSymbols } from "@/lib/assetVolatilityHint";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import {
  theaterAssetNote,
  theaterPrimarySymbols,
  yahooQuoteUrl,
} from "@/lib/theaterAssets";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { incidentSuggestsEnergyPipelines } from "@/lib/flashPipelineReveal";

const CHOKE_SNAP_KM = 350;
const MAX_SYMBOLS = 3;

export type LiveuaFlashChokepoint = {
  id: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
  distanceKm: number;
  relatedTickersLabel?: string;
};

export type LiveuaFlashMarketContext = {
  symbols: string[];
  noteKo: string;
  noteEn: string;
  chokepoint: LiveuaFlashChokepoint | null;
  /** 사건 근처 송유·가스관을 잠깐 켤 가치가 있는지 */
  suggestPipelines: boolean;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 속보 좌표에 가까운 해상 초크 (없으면 null) */
export function nearestLogisticsChokepoint(
  lat: number,
  lng: number,
  maxKm = CHOKE_SNAP_KM,
): LiveuaFlashChokepoint | null {
  let best: LiveuaFlashChokepoint | null = null;
  for (const p of LOGISTICS_RISK_POINTS) {
    if (p.kind !== "chokepoint") continue;
    const d = haversineKm(lat, lng, p.lat, p.lng);
    if (d > maxKm) continue;
    if (best && d >= best.distanceKm) continue;
    const nameEn =
      typeof p.meta?.nameEn === "string" && p.meta.nameEn.trim()
        ? p.meta.nameEn
        : p.name;
    const related =
      typeof p.meta?.relatedTickers === "string" ? p.meta.relatedTickers : undefined;
    best = {
      id: p.id,
      nameKo: p.name,
      nameEn,
      lat: p.lat,
      lng: p.lng,
      distanceKm: Math.round(d),
      relatedTickersLabel: related,
    };
  }
  return best;
}

function mergeUnique(symbols: string[], extra: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...extra, ...symbols]) {
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

/** LiveUA 이벤트 → 해석용 시세 심볼(최대 3) + 인근 초크 */
export function liveuaFlashMarketContext(
  event: Pick<LiveuamapEvent, "theater" | "lat" | "lng" | "title" | "titleKo" | "body" | "bodyKo">,
): LiveuaFlashMarketContext {
  const chokepoint = nearestLogisticsChokepoint(event.lat, event.lng);
  const theaterSymbols = theaterPrimarySymbols(event.theater, MAX_SYMBOLS, "economy");
  const noteKo = theaterAssetNote(event.theater, "ko", "economy");
  const noteEn = theaterAssetNote(event.theater, "en", "economy");

  const chokeSymbols = chokepoint?.relatedTickersLabel
    ? relatedTickerLabelsToSymbols(chokepoint.relatedTickersLabel)
    : [];

  const suggestPipelines =
    Boolean(chokepoint) ||
    incidentSuggestsEnergyPipelines({
      theater: event.theater,
      title: `${event.titleKo ?? ""} ${event.title ?? ""}`,
      body: `${event.bodyKo ?? ""} ${event.body ?? ""}`,
    });

  return {
    symbols: mergeUnique(theaterSymbols, chokeSymbols, MAX_SYMBOLS),
    noteKo,
    noteEn,
    chokepoint,
    suggestPipelines,
  };
}

export function flashSymbolQuoteHref(symbol: string): string {
  return yahooQuoteUrl(symbol);
}

export function flashChokepointLabel(
  choke: LiveuaFlashChokepoint,
  lang: LabelLanguage,
): string {
  return lang === "en" ? choke.nameEn : choke.nameKo;
}

/** 테스트·맵 선택용 — id로 초크 StaticPoint */
export function logisticsChokepointById(id: string): StaticPoint | undefined {
  return LOGISTICS_RISK_POINTS.find((p) => p.id === id);
}
