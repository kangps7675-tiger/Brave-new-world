/**
 * 사건·전장·초크포인트 → 시장 역추적 앵커 시점.
 *
 * 정본 타임테이블: `@/data/majorEventTimeline`
 * 이 모듈은 시장 API·반사실 카드용 얇은 어댑터.
 */

import type { TheaterMarketFilter } from "@/lib/theaterAssets";
import type { ViewerMode } from "@/lib/viewPackages";
import {
  listEconomyEvents,
  listMajorEvents,
  majorEventById,
  primaryMajorEventForChokepoint,
  primaryMajorEventForEconomy,
  primaryMajorEventForTheater,
  resolveTimelineAnchorForViewerMode,
  type LogisticsChokepointId,
  type MajorEventTimelineEntry,
} from "@/data/majorEventTimeline";

export type EventMarketAnchor = {
  id: string;
  theater: TheaterMarketFilter | null;
  anchorDate: string;
  labelKo: string;
  labelEn: string;
  preferredSymbols: string[];
  domain?: MajorEventTimelineEntry["domain"];
  chokepointId?: LogisticsChokepointId;
};

function toAnchor(row: MajorEventTimelineEntry): EventMarketAnchor {
  return {
    id: row.id,
    theater: row.theater,
    anchorDate: row.date,
    labelKo: row.labelKo,
    labelEn: row.labelEn,
    preferredSymbols: [...row.preferredSymbols],
    domain: row.domain,
    chokepointId: row.chokepointId,
  };
}

/** 전체 타임테이블 → 시장 앵커 (시간순) */
export const EVENT_MARKET_ANCHORS: EventMarketAnchor[] = listMajorEvents().map(toAnchor);

export function eventMarketAnchorById(id: string): EventMarketAnchor | null {
  const row = majorEventById(id);
  return row ? toAnchor(row) : null;
}

/** 전장 기본 앵커 (primaryForTheater) */
export function eventMarketAnchorForTheater(
  theater: TheaterMarketFilter,
): EventMarketAnchor | null {
  const row = primaryMajorEventForTheater(theater);
  return row ? toAnchor(row) : null;
}

/** 초크포인트 기본 물류 앵커 */
export function eventMarketAnchorForChokepoint(
  chokepointId: LogisticsChokepointId,
): EventMarketAnchor | null {
  const row = primaryMajorEventForChokepoint(chokepointId);
  return row ? toAnchor(row) : null;
}

/** 전장별 타임테이블(시장 앵커 형태) */
export function eventMarketAnchorsForTheater(
  theater: TheaterMarketFilter,
): EventMarketAnchor[] {
  if (theater === "all") return EVENT_MARKET_ANCHORS;
  return EVENT_MARKET_ANCHORS.filter((row) => row.theater === theater);
}

export function eventMarketAnchorsForChokepoint(
  chokepointId: LogisticsChokepointId,
): EventMarketAnchor[] {
  return EVENT_MARKET_ANCHORS.filter((row) => row.chokepointId === chokepointId);
}

/** 물류 도메인만 */
export function logisticsMarketAnchors(): EventMarketAnchor[] {
  return EVENT_MARKET_ANCHORS.filter(
    (row) => row.domain === "logistics" || row.domain === "both",
  );
}

/** 경제·시장 타임테이블 */
export function economyMarketAnchors(): EventMarketAnchor[] {
  return listEconomyEvents().map(toAnchor);
}

export function eventMarketAnchorForEconomy(): EventMarketAnchor | null {
  const row = primaryMajorEventForEconomy();
  return row ? toAnchor(row) : null;
}

/** 뷰어 모드에 맞는 정본 앵커 */
export function eventMarketAnchorForViewerMode(input: {
  viewerMode: ViewerMode;
  theater: TheaterMarketFilter;
  chokepointId?: LogisticsChokepointId | null;
}): EventMarketAnchor | null {
  const row = resolveTimelineAnchorForViewerMode(input);
  return row ? toAnchor(row) : null;
}

/** 앵커일 정오 UTC → ms */
export function eventAnchorToMs(anchor: EventMarketAnchor): number {
  const ms = Date.parse(`${anchor.anchorDate}T12:00:00.000Z`);
  return Number.isFinite(ms) ? ms : Date.now();
}

/**
 * API·카드 공통 — 전장/초크/경제 앵커가 있으면 그 시점, 없으면 뉴스 ageMinutes.
 */
export function resolveMarketBacktraceMs(input: {
  theater: TheaterMarketFilter;
  ageMinutes?: number;
  anchorDate?: string | null;
  anchorId?: string | null;
  chokepointId?: LogisticsChokepointId | null;
  viewerMode?: ViewerMode | null;
}): { atMs: number; anchor: EventMarketAnchor | null; source: "catalog" | "date" | "age" } {
  if (input.anchorId) {
    const hit = eventMarketAnchorById(input.anchorId);
    if (hit) return { atMs: eventAnchorToMs(hit), anchor: hit, source: "catalog" };
  }
  if (input.chokepointId) {
    const choke = eventMarketAnchorForChokepoint(input.chokepointId);
    if (choke) return { atMs: eventAnchorToMs(choke), anchor: choke, source: "catalog" };
  }
  if (input.anchorDate && /^\d{4}-\d{2}-\d{2}$/.test(input.anchorDate)) {
    const ms = Date.parse(`${input.anchorDate}T12:00:00.000Z`);
    if (Number.isFinite(ms)) {
      const byDate =
        EVENT_MARKET_ANCHORS.find(
          (row) => row.anchorDate === input.anchorDate && row.theater === input.theater,
        ) ??
        EVENT_MARKET_ANCHORS.find((row) => row.anchorDate === input.anchorDate) ??
        (input.viewerMode
          ? eventMarketAnchorForViewerMode({
              viewerMode: input.viewerMode,
              theater: input.theater,
              chokepointId: input.chokepointId,
            })
          : eventMarketAnchorForTheater(input.theater));
      return {
        atMs: ms,
        anchor: byDate,
        source: "date",
      };
    }
  }
  const catalog = input.viewerMode
    ? eventMarketAnchorForViewerMode({
        viewerMode: input.viewerMode,
        theater: input.theater,
        chokepointId: input.chokepointId,
      })
    : eventMarketAnchorForTheater(input.theater);
  if (catalog) {
    return { atMs: eventAnchorToMs(catalog), anchor: catalog, source: "catalog" };
  }
  const age = Math.max(0, input.ageMinutes ?? 0);
  return {
    atMs: Date.now() - age * 60_000,
    anchor: null,
    source: "age",
  };
}

/** 선호 심볼 우선 → 절대 변동 최대 */
export function pickCounterfactualSymbol<
  T extends { symbol: string; changePercentSinceEvent: number | null },
>(items: T[], preferredSymbols: string[] = []): T | null {
  const usable = items.filter(
    (item) => item.changePercentSinceEvent != null && Number.isFinite(item.changePercentSinceEvent),
  );
  if (usable.length === 0) return null;
  for (const symbol of preferredSymbols) {
    const hit = usable.find((item) => item.symbol === symbol);
    if (hit) return hit;
  }
  return usable.reduce((best, item) =>
    Math.abs(item.changePercentSinceEvent ?? 0) > Math.abs(best.changePercentSinceEvent ?? 0)
      ? item
      : best,
  );
}
