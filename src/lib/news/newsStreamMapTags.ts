/**
 * 구글 뉴스 스트림 → 지도 네온 태그 (전쟁=빨강 / 긴장=주황 / 외교=파랑).
 * 좌표는 제목·요약 지명 매칭, 없으면 전장 중심 + 안정 지터.
 */

import type { NewsStreamItem, NewsTheater } from "@/lib/news/types";
import type { NeonRippleAccent } from "@/lib/neonRippleIncidentMarker";
import { resolveImpactPlace } from "@/lib/telegramPlaceMatch";

export type NewsMapTagKind = "war" | "tension" | "diplomatic";

/** 한 사건을 보도한 개별 매체 관점 */
export type NewsPerspective = {
  title: string;
  link: string;
  source: string;
  /** 매체 신뢰 등급 (1 최상 ~ 3 국영/미검증) */
  trustTier: number;
};

export type NewsStreamMapTag = {
  markerId: string;
  displayKind: "news-stream-neon";
  id: string;
  lat: number;
  lng: number;
  title: string;
  link: string;
  kind: NewsMapTagKind;
  accent: NeonRippleAccent;
  intensity: number;
  theater: NewsTheater;
  /** 위치 매칭 근거 라벨 (검증·툴팁용) */
  placeLabel?: string;
  /** 대표 기사 경과 분 — 시장 반응 카드용 */
  ageMinutes: number;
  /**
   * 같은 사건(같은 좌표·성격)을 보도한 여러 매체 관점.
   * 대표 기사 포함, 신뢰등급 순. 클릭 시 "한 사건, 여러 관점"으로 표시.
   */
  perspectives: NewsPerspective[];
};

const WAR_RE =
  /전쟁|전선|충돌|교전|공습|포격|미사일|폭격|침공|공격|전투|교전|shelling|airstrike|missile|combat|war\b|clash|offensive|invasion|strike|bombard|front\s?line|포격|드론 공격/i;

const TENSION_RE =
  /긴장|대치|확전|위기|경고|위협|제재|봉쇄|무력시위|tension|standoff|escalate|escalation|threat|sanction|blockade|show of force|위기 고조/i;

const DIPLOMATIC_RE =
  /외교|회담|정상회담|특사|대사|협상|휴전|합의|동맹|방문|외교부|summit|diplomat|envoy|talks|ceasefire|negotiation|treaty|foreign minister|ambassador|동맹|평화협정/i;

function classifyNewsKind(text: string): NewsMapTagKind {
  if (WAR_RE.test(text)) return "war";
  if (DIPLOMATIC_RE.test(text)) return "diplomatic";
  if (TENSION_RE.test(text)) return "tension";
  // theater 기본 — 중동·우크라·대만·한반도는 긴장, 그 외 외교
  return "tension";
}

function accentForKind(kind: NewsMapTagKind): NeonRippleAccent {
  if (kind === "war") return "red";
  if (kind === "diplomatic") return "blue";
  return "orange";
}

function theaterRegionHint(theater: NewsTheater) {
  if (theater === "russia-ukraine") return "ukraine" as const;
  if (theater === "middle-east") return "middle-east" as const;
  return undefined;
}

/**
 * 뉴스 → 좌표. 정확도 우선:
 *  1) 제목의 지명이면 채택 (도시·국가 모두 — 제목의 지명은 기사 주제일 확률이 높다)
 *  2) 제목에 없으면 요약을 보되, **도시(city) 정밀도일 때만** 채택
 *     (요약에 스친 국가 언급은 발생지가 아닌 경우가 많아 제외)
 *  3) 둘 다 확신 없으면 null — 지도에 찍지 않는다 (전장 중심에 아무 데나 뿌리던
 *     기존 지터 폴백 제거: 위치 불명 기사가 무관한 좌표에 찍히는 오탐의 주원인이었음)
 */
function resolveNewsCoords(
  item: NewsStreamItem,
): { lat: number; lng: number; label: string } | null {
  const hint = theaterRegionHint(item.theater);

  const titleHit = resolveImpactPlace(item.title ?? "", hint);
  if (titleHit) return { lat: titleHit.lat, lng: titleHit.lng, label: titleHit.label };

  const summaryHit = resolveImpactPlace(item.summary ?? "", hint);
  if (summaryHit && summaryHit.precision === "city") {
    return { lat: summaryHit.lat, lng: summaryHit.lng, label: summaryHit.label };
  }

  return null;
}

function intensityFromItem(item: NewsStreamItem): number {
  if (item.trustTier === 1) return 0.92;
  if (item.trustTier === 2) return 0.72;
  return 0.55;
}

const MAX_NEWS_MAP_TAGS = 72;

/**
 * 지도 네온 신선도 상한(시간). 지도는 "지금 벌어지는 일"을 보여주는 곳이라
 * 기본 24시간. 배포 후 점 개수를 보고 이 값만 조정하면 된다.
 */
const NEWS_MAP_MAX_AGE_H = 24;
/** 24시간 내 결과가 이보다 적으면 48시간까지 완화 (조용한 날 휑함 방지) */
const NEWS_MAP_MIN_COUNT_BEFORE_RELAX = 8;
const NEWS_MAP_RELAX_AGE_H = 48;

/** 기사 나이(시간). pubDate 없거나 파싱 실패면 null (=시점 불명) */
function ageHours(pubDate: string | undefined): number | null {
  if (!pubDate) return null;
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return null;
  return (Date.now() - ts) / 3_600_000;
}

function ageMinutesOf(item: NewsStreamItem): number {
  const h = ageHours(item.pubDate);
  if (h == null) return 60;
  return Math.max(0, Math.round(h * 60));
}

/** 한 마커에 담을 최대 관점 수 (UI 과부하 방지) */
const MAX_PERSPECTIVES_PER_MARKER = 8;

/**
 * 폴링된 뉴스 → 지도 네온 태그.
 * "한 사건, 여러 관점": 같은 좌표·성격의 기사들을 버리지 않고 하나의 마커에
 * perspectives[]로 묶는다. 대표 기사(가장 최근·신뢰도 높은)가 마커 제목.
 *
 * 신선도: 기본 24시간 이내만. 결과가 너무 적으면 48시간까지 자동 완화.
 * 시점 불명(pubDate 없음) 기사는 "지금"이라 확신 못 하므로 제외.
 */
export function buildNewsStreamMapTags(items: NewsStreamItem[]): NewsStreamMapTag[] {
  // 1차: 24시간 이내. 부족하면 2차: 48시간까지 완화.
  const fresh24 = items.filter((it) => {
    const h = ageHours(it.pubDate);
    return h != null && h <= NEWS_MAP_MAX_AGE_H;
  });
  const pool =
    fresh24.length >= NEWS_MAP_MIN_COUNT_BEFORE_RELAX
      ? fresh24
      : items.filter((it) => {
          const h = ageHours(it.pubDate);
          return h != null && h <= NEWS_MAP_RELAX_AGE_H;
        });

  // 셀(좌표+성격)별로 기사를 묶는다.
  const byCell = new Map<string, NewsStreamMapTag>();
  const order: string[] = [];

  // 사건 성격 심각도 (강한 색이 이김): 전쟁 > 긴장 > 외교
  const severity: Record<NewsMapTagKind, number> = { war: 2, tension: 1, diplomatic: 0 };

  for (const item of pool) {
    if (item.feedTopic === "economy") continue;
    const text = `${item.title} ${item.summary ?? ""} ${item.category ?? ""}`;
    const kind = classifyNewsKind(text);
    const accent = accentForKind(kind);
    const coords = resolveNewsCoords(item);
    if (!coords) continue; // 위치 불명은 지도에 안 찍음
    const { lat, lng, label } = coords;
    // 셀은 "위치"만 — 같은 곳의 사건은 매체가 다르게 표현해도 한 사건으로 묶는다.
    const cell = `${lat.toFixed(1)},${lng.toFixed(1)}`;

    const perspective: NewsPerspective = {
      title: item.title,
      link: item.link,
      source: item.source ?? item.publisher ?? "",
      trustTier: item.trustTier ?? 3,
    };

    const existing = byCell.get(cell);
    if (existing) {
      // 같은 사건 — 관점으로 추가 (중복 링크 제외, 상한)
      if (
        existing.perspectives.length < MAX_PERSPECTIVES_PER_MARKER &&
        !existing.perspectives.some((p) => p.link === perspective.link)
      ) {
        existing.perspectives.push(perspective);
      }
      // 더 강한 성격이면 마커 색·종류 승격 (전쟁이 긴장/외교를 이김)
      if (severity[kind] > severity[existing.kind]) {
        existing.kind = kind;
        existing.accent = accent;
      }
      // 최신 기사 age로 갱신
      const age = ageMinutesOf(item);
      if (age < existing.ageMinutes) existing.ageMinutes = age;
      continue;
    }

    if (order.length >= MAX_NEWS_MAP_TAGS) continue;
    order.push(cell);
    byCell.set(cell, {
      markerId: `news-neon-${item.id}`,
      displayKind: "news-stream-neon",
      id: item.id,
      lat,
      lng,
      title: item.title,
      link: item.link,
      kind,
      accent,
      intensity: intensityFromItem(item),
      theater: item.theater,
      placeLabel: label,
      ageMinutes: ageMinutesOf(item),
      perspectives: [perspective],
    });
  }

  // 대표 기사 정렬: 각 마커의 perspectives를 신뢰등급 순으로 (1 먼저)
  const out = order.map((cell) => byCell.get(cell)!);
  for (const tag of out) {
    tag.perspectives.sort((a, b) => a.trustTier - b.trustTier);
  }
  return out;
}
