import { clusterConflictEvents } from "@/lib/conflictEvents/clusterEvents";
import { extractRawConflictEvents, newsStreamItemToExtractable } from "@/lib/conflictEvents/extractRawEvents";
import { scoredEventsToRaw } from "@/lib/conflictEvents/fromGdelt";
import { newfeedsPointToConflictEvent } from "@/lib/conflictEvents/fromNewfeeds";
import {
  CONFLICT_CATEGORY_LABEL,
  CONFLICT_THEATER_LABEL,
} from "@/lib/conflictEvents/categoryKeywords";
import {
  clusterTitleWithUnverifiedMark,
  confidenceEvidenceTier,
  confidenceLabel,
  independentSourceLine,
} from "@/lib/conflictEvents/confidence";
import type {
  ConflictEventCluster,
  ConflictEventCategory,
  ConflictTheater,
} from "@/lib/conflictEvents/types";
import type { NewfeedsAttackPoint } from "@/lib/newfeeds";
import type { ScoredEvent } from "@/data/eventTiers";
import type { NewsStreamItem } from "@/lib/news/types";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { EvidenceTier } from "@/lib/evidenceTier";
import type { NeonRippleAccent } from "@/lib/neonRippleIncidentMarker";
import type { GlobeLodTier } from "@/lib/globeLod";
import {
  pickInViewOrNearest,
  VIEWPORT_RADIUS_BY_TIER,
  type ViewPoint,
} from "@/lib/viewportCull";
import { CONFLICT_THEATER_ORDER } from "@/lib/conflictEvents/theaterMeta";

export const CONFLICT_THEATER_FILTERS: ConflictTheater[] = [...CONFLICT_THEATER_ORDER];

/** HTML 네온 상한 — GDELT 태그보다 조금 낮게 (DOM 비용) */
export const MAX_CONFLICT_EVENT_MARKERS_BY_TIER: Record<GlobeLodTier, number> = {
  global: 18,
  continent: 28,
  regional: 40,
  near: 52,
  village: 64,
};

export type ConflictEventHtmlMarker = {
  markerId: string;
  displayKind: "conflict-event";
  clusterId: string;
  lat: number;
  lng: number;
  category: ConflictEventCategory | "unknown";
  theater: ConflictTheater | null;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  confidence: ConflictEventCluster["confidence"];
  sources: ConflictEventCluster["sources"];
  firstSeenAt: string;
  lastConfirmedAt: string;
  intensity: number;
  trustTier: 1 | 2 | 3;
  heroStatus: ConflictEventCluster["heroStatus"];
  evidenceTier: EvidenceTier;
  perspectiveCount: number;
  accent: NeonRippleAccent;
};

export const CATEGORY_ACCENT: Record<ConflictEventCategory | "unknown", NeonRippleAccent> = {
  airstrike: "red",
  missile: "orange",
  drone: "cyan",
  clash: "red",
  explosion: "orange",
  incursion: "blue",
  unknown: "white",
};

function intensityOf(cluster: ConflictEventCluster): number {
  if (cluster.confidence === "high-confidence") return 1;
  if (cluster.confidence === "corroborated") return 0.82;
  return 0.55;
}

function markerRank(marker: ConflictEventHtmlMarker): number {
  const conf =
    marker.confidence === "high-confidence"
      ? 3
      : marker.confidence === "corroborated"
        ? 2
        : 1;
  const last = Date.parse(marker.lastConfirmedAt);
  return conf * 1_000_000_000_000 + (Number.isFinite(last) ? last : 0);
}

export function clusterToMarker(cluster: ConflictEventCluster): ConflictEventHtmlMarker {
  const cat = CONFLICT_CATEGORY_LABEL[cluster.category];
  const theater = cluster.theater ? CONFLICT_THEATER_LABEL[cluster.theater] : null;
  const sourceNames = cluster.sources.map((s) => s.name).join(", ");
  const n = cluster.sources.length;
  const titleKo = clusterTitleWithUnverifiedMark(cluster.title, "ko", cluster);
  const titleEn = clusterTitleWithUnverifiedMark(cluster.title, "en", cluster);
  return {
    markerId: `conflict-event-${cluster.clusterId}`,
    displayKind: "conflict-event",
    clusterId: cluster.clusterId,
    lat: cluster.lat,
    lng: cluster.lng,
    category: cluster.category,
    theater: cluster.theater,
    titleKo,
    titleEn,
    bodyKo: `${cat.ko}${theater ? ` · ${theater.ko}` : ""}\n${independentSourceLine(n, "ko")}\n${sourceNames}`,
    bodyEn: `${cat.en}${theater ? ` · ${theater.en}` : ""}\n${independentSourceLine(n, "en")}\n${sourceNames}`,
    confidence: cluster.confidence,
    sources: cluster.sources,
    firstSeenAt: cluster.firstSeenAt,
    lastConfirmedAt: cluster.lastConfirmedAt,
    intensity: intensityOf(cluster),
    trustTier: cluster.trustTier,
    heroStatus: cluster.heroStatus,
    evidenceTier: confidenceEvidenceTier(cluster.confidence),
    perspectiveCount: n,
    accent: CATEGORY_ACCENT[cluster.category],
  };
}

export function buildConflictEventClusters(input: {
  newsItems?: NewsStreamItem[];
  gdeltEvents?: ScoredEvent[];
  newfeedsAttacks?: NewfeedsAttackPoint[];
}): ConflictEventCluster[] {
  const raw = [
    ...extractRawConflictEvents((input.newsItems ?? []).map(newsStreamItemToExtractable)),
    ...scoredEventsToRaw(input.gdeltEvents ?? []).filter((e) => e.keywords.length > 0),
    ...(input.newfeedsAttacks ?? []).map(newfeedsPointToConflictEvent),
  ];
  return clusterConflictEvents(raw);
}

/**
 * 전장 칩 필터.
 * - 칩 0개 → 빈 화면
 * - 칩 N개 → 그 전장만 (theater 없는 클러스터는 숨김)
 * - enabled 비었거나 null → 마커 0 (칩 전부 = 빈 화면)
 * - 기본 ON은 theaterMeta 지정 12전장 — null 전장 핀은 안 띄움
 */
export function filterClustersByTheaters(
  clusters: ConflictEventCluster[],
  enabled: ReadonlySet<ConflictTheater> | null,
): ConflictEventCluster[] {
  if (!enabled || enabled.size === 0) return [];
  return clusters.filter((c) => c.theater != null && enabled.has(c.theater));
}

/** 뷰포트 우선 + LOD 상한. 뷰 안이 비면 가까운 것부터 채운다. */
export function selectConflictEventMarkers(
  markers: ConflictEventHtmlMarker[],
  options: {
    view: ViewPoint;
    lodTier: GlobeLodTier;
    maxCount?: number;
  },
): ConflictEventHtmlMarker[] {
  const max =
    options.maxCount ?? MAX_CONFLICT_EVENT_MARKERS_BY_TIER[options.lodTier] ?? 40;
  if (markers.length === 0 || max <= 0) return [];
  const ranked = [...markers].sort((a, b) => markerRank(b) - markerRank(a));
  const radiusDeg = VIEWPORT_RADIUS_BY_TIER[options.lodTier] ?? 40;
  return pickInViewOrNearest(ranked, options.view, radiusDeg, max);
}

export function hoverCopyForCluster(
  marker: ConflictEventHtmlMarker,
  lang: LabelLanguage,
): {
  badge: string;
  title: string;
  detail: string;
  body: string;
  meta: string;
} {
  const n = marker.sources.length;
  return {
    badge: confidenceLabel(marker.confidence, lang),
    title: lang === "en" ? marker.titleEn : marker.titleKo,
    detail: independentSourceLine(n, lang),
    body: lang === "en" ? marker.bodyEn : marker.bodyKo,
    meta: marker.sources
      .map((s) => s.name)
      .slice(0, 8)
      .join(" · "),
  };
}
