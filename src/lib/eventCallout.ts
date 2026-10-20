import type { LabelLanguage } from "@/lib/layerPrefs";
import type { StackItem } from "@/lib/incidentStack/build";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

/**
 * 양피지를 닫은 뒤 사건 좌표에 남는 콜아웃 — 일반 지도(MapLibre)와 위성(세슘)이 같은 값을 쓴다.
 */
export type EventCallout = {
  id: string;
  lat: number;
  lng: number;
  /** 한 줄 제목 */
  title: string;
  /** 사건 설명 (줄여서) */
  body: string;
  /** "몇 시간 전 · 지명" 같은 머리글 */
  meta: string;
  /** 출처 라벨: Liveuamap · UKMTO · 내 케이스 */
  source: string;
};

export const CALLOUT_BODY_MAX = 170;

export function clipCalloutText(text: string, max = CALLOUT_BODY_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("다. "), cut.lastIndexOf("。"));
  return `${(sentenceEnd > max * 0.5 ? cut.slice(0, sentenceEnd + 1) : cut).trim()}…`;
}

export function calloutAgeLabel(at: number, lang: LabelLanguage, now: number = Date.now()): string {
  const ms = now - at;
  if (!Number.isFinite(ms) || ms < 0) return "";
  const en = lang === "en";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return en ? `${Math.max(1, m)} min ago` : `${Math.max(1, m)}분 전`;
  const h = Math.floor(m / 60);
  if (h < 48) return en ? `${h} h ago` : `${h}시간 전`;
  const d = Math.floor(h / 24);
  return en ? `${d} d ago` : `${d}일 전`;
}

export function calloutFromLiveua(ev: LiveuamapEvent, lang: LabelLanguage): EventCallout {
  const en = lang === "en";
  const rawTitle = en ? ev.title : ev.titleKo?.trim() || ev.title;
  const rawBody = en ? ev.body : ev.bodyKo?.trim() || ev.body;
  const peeled = splitLiveuaTitleBody(rawTitle, rawBody, ev.sourceUrl);
  const at = Date.parse(ev.publishedAt);
  return {
    id: ev.id,
    lat: ev.lat,
    lng: ev.lng,
    title: clipCalloutText(peeled.title, 70),
    body: clipCalloutText(peeled.body && peeled.body !== peeled.title ? peeled.body : ""),
    meta: Number.isFinite(at) ? calloutAgeLabel(at, lang) : "",
    source: "Liveuamap",
  };
}

export function calloutFromStackItem(item: StackItem, lang: LabelLanguage): EventCallout {
  if (item.liveua) return calloutFromLiveua(item.liveua, lang);
  const en = lang === "en";
  return {
    id: item.id,
    lat: item.lat,
    lng: item.lng,
    title: clipCalloutText(item.title, 70),
    body: clipCalloutText(item.detail ?? ""),
    meta: [calloutAgeLabel(item.at, lang), item.place].filter(Boolean).join(" · "),
    source:
      item.sourceLabel ??
      (item.source === "ukmto" ? "UKMTO" : item.source === "nga" ? "NGA" : item.source === "newfeeds" ? "NewFeeds" : item.source === "rss" ? "RSS" : en ? "My case" : "내 케이스"),
  };
}
