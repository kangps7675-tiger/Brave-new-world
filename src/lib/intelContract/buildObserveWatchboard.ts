import type { CesiumAlertItem } from "@/lib/cesiumAlerts";
import type {
  ConflictEventCluster,
  ConflictTheater,
} from "@/lib/conflictEvents/types";
import { gateCesiumAlert } from "@/lib/intelContract/adapters/fromEconomyAlert";
import { gateConflictCluster } from "@/lib/intelContract/adapters/fromConflictCluster";
import { gateTheaterSitrep } from "@/lib/intelContract/adapters/fromTheaterSitrep";
import { candidatesFromNewsLike } from "@/lib/intelContract/disconfirmPass";
import { canPublish } from "@/lib/intelContract/publish";
import {
  matchPirsForOrigin,
  pirModalityStatus,
  type PirId,
  type PirModalityStatus,
} from "@/lib/intelContract/pirRegistry";
import {
  canonForConflictTheater,
  canonForSitrepRegion,
  canonGaps,
  formatCanonGapNote,
} from "@/lib/intelContract/theaterCanonSources";
import type { DisplayGrade, GateResult } from "@/lib/intelContract/types";
import { buildTheaterSitrep } from "@/lib/theaterReport/buildTheaterSitrep";
import type { TheaterSitrepRegionId } from "@/lib/theaterReport/types";
import { THEATER_SITREP_REGIONS } from "@/lib/theaterReport/types";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import type { NewsStreamItem } from "@/lib/news/types";
import { THEATER_FLY_TO } from "@/lib/news/theaterMap";

/** sitrep → fly 앵커 (deskFocus.SITREP_FLY_ANCHOR 와 동일 값, 순환 import 회피) */
const SITREP_FLY: Record<
  TheaterSitrepRegionId,
  { lat: number; lng: number; altitude: number }
> = {
  ukraine: THEATER_FLY_TO["russia-ukraine"],
  iran: { lat: 28.5, lng: 52.0, altitude: 1.35 },
  yemen: { lat: 15.0, lng: 43.2, altitude: 1.25 },
};

export type WatchboardItemKind =
  | "theater-sitrep"
  | "maritime-alert"
  | "conflict-cluster"
  | "hold";

export type WatchboardItem = {
  id: string;
  kind: WatchboardItemKind;
  grade: DisplayGrade;
  titleKo: string;
  titleEn: string;
  subtitleKo: string;
  subtitleEn: string;
  gate: GateResult;
  pirIds: PirId[];
  pirScore: number;
  /** PIR 필요/확보/빈칸 — UI 충족 카드 */
  pirStatuses: PirModalityStatus[];
  /** 정본 채널 빈칸 한 줄 */
  gapNoteKo: string | null;
  gapNoteEn: string | null;
  /** open theater book */
  sitrepRegion?: TheaterSitrepRegionId;
  /** open cesium alert */
  cesiumAlertId?: string;
  /** conflict cluster id (지도/드릴) */
  clusterId?: string;
  /** 창 안 시각 (정렬·72h 필터) */
  occurredAt: string | null;
  /** 세슘 fly / DeskFocus 앵커 */
  lat?: number;
  lng?: number;
  altitude?: number;
};

const GRADE_ORDER: Record<DisplayGrade, number> = {
  high: 5,
  std: 4,
  low: 3,
  hold: 2,
  drop: 0,
};

const DEFAULT_WINDOW_HOURS = 72;
const MAX_CLUSTER_ITEMS = 12;

function withinWindow(
  iso: string | null | undefined,
  windowHours: number,
  nowMs: number,
): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return true;
  return nowMs - t <= windowHours * 3600_000;
}

function attachPirAndGaps(input: {
  gate: GateResult;
  sitrepRegion?: TheaterSitrepRegionId | null;
  theater?: string | null;
  theme?: "chokepoint" | "convergence" | "escalation" | null;
  lang: "ko" | "en";
}): Pick<
  WatchboardItem,
  "pirIds" | "pirScore" | "pirStatuses" | "gapNoteKo" | "gapNoteEn"
> {
  const mods = new Set(input.gate.bundle.observations.map((o) => o.modality));
  const pirs = matchPirsForOrigin({
    sitrepRegion: input.sitrepRegion,
    theater: input.theater,
    theme: input.theme,
  });
  const pirStatuses =
    pirs.length === 0
      ? []
      : pirs.map((p) => pirModalityStatus(p, mods)).sort((a, b) => b.score - a.score);
  const pirScore =
    pirStatuses.length === 0 ? 0 : Math.max(...pirStatuses.map((s) => s.score));

  const canon =
    (input.sitrepRegion
      ? canonForSitrepRegion(input.sitrepRegion)
      : null) ??
    canonForConflictTheater(
      (input.theater as ConflictTheater | null | undefined) ?? null,
    );
  const gaps = canon ? canonGaps(canon, mods) : [];
  return {
    pirIds: pirs.map((p) => p.id),
    pirScore,
    pirStatuses,
    gapNoteKo: formatCanonGapNote(gaps, "ko"),
    gapNoteEn: formatCanonGapNote(gaps, "en"),
  };
}

export function buildObserveWatchboard(input: {
  liveuaEvents: LiveuamapEvent[];
  rssItems: NewsStreamItem[];
  cesiumAlerts: CesiumAlertItem[];
  /** 교차확인된 사건 클러스터 — Gate 통과분만 Active */
  conflictClusters?: ConflictEventCluster[];
  lang?: "ko" | "en";
  /** 기본 72h — 창 밖은 워치보드에서 제외 */
  windowHours?: number;
  nowMs?: number;
}): WatchboardItem[] {
  const lang = input.lang ?? "ko";
  const windowHours = input.windowHours ?? DEFAULT_WINDOW_HOURS;
  const nowMs = input.nowMs ?? Date.now();
  const items: WatchboardItem[] = [];

  // 올리기 직전 반증 코퍼스 — RSS + LiveUA 제목/본문 (없으면 어댑터가 queried:false)
  const disconfirmCorpus = [
    ...candidatesFromNewsLike(input.rssItems),
    ...candidatesFromNewsLike(
      input.liveuaEvents.map((e) => ({
        id: e.id,
        title: e.title,
        titleKo: e.titleKo,
        summary: e.body,
        publishedAt: e.publishedAt,
      })),
    ),
  ];
  const discOpts = {
    disconfirmCorpus,
    windowHours,
    nowMs,
  };

  for (const regionId of THEATER_SITREP_REGIONS) {
    const doc = buildTheaterSitrep({
      regionId,
      events: input.liveuaEvents,
      rssItems: input.rssItems,
      windowHours,
      lang,
    });
    const gate = gateTheaterSitrep(doc, discOpts);
    if (!canPublish("watchboard", gate.grade)) continue;

    const meta = attachPirAndGaps({
      gate,
      sitrepRegion: regionId,
      lang,
    });
    const occurredAt =
      doc.rows[0]?.occurredAt ?? doc.generatedAt ?? null;
    const anchor = SITREP_FLY[regionId];
    const liveAnchor = input.liveuaEvents.find(
      (e) =>
        e.regionId === regionId &&
        Number.isFinite(e.lat) &&
        Number.isFinite(e.lng),
    );

    items.push({
      id: `sitrep:${regionId}`,
      kind: gate.grade === "hold" ? "hold" : "theater-sitrep",
      grade: gate.grade,
      titleKo: doc.titleKo,
      titleEn: doc.titleEn,
      subtitleKo: doc.coverageNoteKo,
      subtitleEn: doc.coverageNoteEn,
      gate,
      ...meta,
      sitrepRegion: regionId,
      occurredAt,
      lat: liveAnchor?.lat ?? anchor.lat,
      lng: liveAnchor?.lng ?? anchor.lng,
      altitude: anchor.altitude,
    });
  }

  for (const alert of input.cesiumAlerts.slice(0, 24)) {
    const gate = gateCesiumAlert(alert, discOpts);
    if (!canPublish("watchboard", gate.grade)) continue;
    if (gate.grade === "drop") continue;

    const theme =
      alert.kind === "portwatch" || alert.kind === "ukmto" || alert.kind === "navarea"
        ? ("chokepoint" as const)
        : null;
    const meta = attachPirAndGaps({
      gate,
      theme,
      lang,
    });

    items.push({
      id: `alert:${alert.id}`,
      kind: gate.grade === "hold" ? "hold" : "maritime-alert",
      grade: gate.grade,
      titleKo: alert.title,
      titleEn: alert.title,
      subtitleKo: alert.detail,
      subtitleEn: alert.detail,
      gate,
      ...meta,
      cesiumAlertId: alert.id,
      occurredAt: null,
      lat: alert.lat,
      lng: alert.lng,
      altitude: 0.95,
    });
  }

  const clusters = input.conflictClusters ?? [];
  let clusterAdded = 0;
  const clusterSorted = [...clusters].sort((a, b) => {
    const ta = Date.parse(a.lastConfirmedAt) || 0;
    const tb = Date.parse(b.lastConfirmedAt) || 0;
    return tb - ta;
  });

  for (const cluster of clusterSorted) {
    if (clusterAdded >= MAX_CLUSTER_ITEMS) break;
    if (!withinWindow(cluster.lastConfirmedAt, windowHours, nowMs)) continue;

    const gate = gateConflictCluster(cluster, discOpts);
    if (!canPublish("watchboard", gate.grade)) continue;
    if (gate.grade === "drop") continue;

    const meta = attachPirAndGaps({
      gate,
      theater: cluster.theater,
      lang,
    });

    const n = cluster.sources.length;
    const confKo =
      cluster.confidence === "high-confidence"
        ? "다중 교차"
        : cluster.confidence === "corroborated"
          ? "교차확인"
          : "단일 소스";
    const confEn =
      cluster.confidence === "high-confidence"
        ? "multi-source"
        : cluster.confidence === "corroborated"
          ? "corroborated"
          : "single-source";

    items.push({
      id: `cluster:${cluster.clusterId}`,
      kind: gate.grade === "hold" ? "hold" : "conflict-cluster",
      grade: gate.grade,
      titleKo: cluster.title,
      titleEn: cluster.title,
      subtitleKo: `${confKo} · 출처 ${n} · ${cluster.theater ?? "전장 미정"}`,
      subtitleEn: `${confEn} · ${n} source(s) · ${cluster.theater ?? "theater n/a"}`,
      gate,
      ...meta,
      clusterId: cluster.clusterId,
      occurredAt: cluster.lastConfirmedAt,
      lat: cluster.lat,
      lng: cluster.lng,
      altitude: 0.85,
    });
    clusterAdded += 1;
  }

  items.sort((a, b) => {
    const pir = b.pirScore - a.pirScore;
    if (Math.abs(pir) > 0.05) return pir;
    const g = GRADE_ORDER[b.grade] - GRADE_ORDER[a.grade];
    if (g !== 0) return g;
    const ta = Date.parse(a.occurredAt ?? "") || 0;
    const tb = Date.parse(b.occurredAt ?? "") || 0;
    return tb - ta;
  });

  return items;
}
