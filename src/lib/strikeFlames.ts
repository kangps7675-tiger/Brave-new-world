import { liveuaConfirmedStrike, type LiveuaStrikeKind } from "@/lib/liveuamap/confirmedStrike";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

/**
 * 지구 전역 공습 불꽃 — 드론·미사일·유도폭탄이 실제로 떨어진 곳.
 * 출처는 liveuamap 속보(우크라이나·러시아·중동 슬롯)만 쓴다.
 * 같은 사건은 한 번만 찍고, 가장 최신 것부터 상한까지 둔다.
 */
export type StrikeOrigin = "liveuamap";

export type StrikeFlame = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  /** 큰 양피지에 싣는 사건 설명 */
  body: string;
  kind: LiveuaStrikeKind;
  region: string;
  publishedAt: string;
  origin: StrikeOrigin;
  /** 출처 줄 — NewFeeds는 약관상 출처를 반드시 표기한다 */
  source: string;
  /** 원문 링크 */
  url?: string;
};

export function flamesFromLiveua(events: readonly LiveuamapEvent[], ko: boolean): StrikeFlame[] {
  const out: StrikeFlame[] = [];
  for (const ev of events) {
    const hit = liveuaConfirmedStrike(ev);
    if (!hit || !Number.isFinite(ev.lat) || !Number.isFinite(ev.lng)) continue;
    out.push({
      id: ev.id,
      lat: ev.lat,
      lng: ev.lng,
      title: ko ? ev.titleKo?.trim() || ev.title : ev.title,
      body: ko ? ev.bodyKo?.trim() || ev.body : ev.body,
      kind: hit.kind,
      region: ev.regionId,
      publishedAt: ev.publishedAt,
      origin: "liveuamap",
      source: "Liveuamap",
      url: ev.sourceUrl,
    });
  }
  return out;
}

const KM_PER_DEG = 111;

function sameEvent(a: StrikeFlame, b: StrikeFlame): boolean {
  if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > 12 * 3_600_000) return false;
  const dLat = (a.lat - b.lat) * KM_PER_DEG;
  const dLng = (a.lng - b.lng) * KM_PER_DEG * Math.cos((b.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng) < 30;
}

/**
 * 같은 사건(30km 안 · 12시간 안)이 여러 출처에 있으면 앞 그룹 것만 남긴다 — 순서가 곧 우선순위.
 * 결과는 최신순, 상한까지.
 */
export function mergeStrikeFlames(groups: StrikeFlame[][], max = 150): StrikeFlame[] {
  const kept: StrikeFlame[] = [];
  for (const group of groups) {
    const base = kept.length;
    for (const f of group) {
      if (!kept.slice(0, base).some((k) => sameEvent(k, f))) kept.push(f);
    }
  }
  return kept
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, max);
}
