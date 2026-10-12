/**
 * USNI Fleet Tracker 보도 → 항모 위치 스냅샷.
 * DB 없이 순수 계산만 — Next 라우트와 cron Worker가 같이 쓴다.
 */
import { US_CARRIERS_SEED, type UsCarrier } from "@/data/usCarriers";
import type { ShipMovementReportDraft } from "@/lib/shipMovements/types";
import {
  applyCarrierPatches,
  extractCarrierPatchesFromText,
} from "@/lib/usCarriers/fromUsniNews";

export type UsCarrierSnapshotPayload = {
  carriers: UsCarrier[];
  updatedAt: string;
  source: string;
  updatedIds?: string[];
  reportUrl?: string | null;
  via?: string | null;
};

/** 최근 몇 개 주간 보도까지 거슬러 반영할지 — 이번 주 기사에 빠진 함도 직전 위치 유지 */
const MAX_REPORTS = 6;

/**
 * 이전 스냅샷 + 시드 병합 — 시드에 새로 추가된 함은 넣고, 시드에서 빠진 함은 버린다.
 * 이전 위치를 기준으로 삼아야 이번 보도에 안 나온 함이 7월 시드 좌표로 되돌아가지 않는다.
 */
export function carrierBase(previous: UsCarrier[] | null | undefined): UsCarrier[] {
  const prev = new Map((previous ?? []).map((c) => [c.id, c]));
  return US_CARRIERS_SEED.map((seed) => ({ ...seed, ...(prev.get(seed.id) ?? {}) }));
}

function reportTime(r: ShipMovementReportDraft): number {
  const t = r.publishedAt ? Date.parse(r.publishedAt) : NaN;
  return Number.isFinite(t) ? t : 0;
}

export function buildCarrierSnapshot(
  previous: UsCarrier[] | null | undefined,
  reports: ShipMovementReportDraft[],
  via: string,
  now: Date = new Date(),
): UsCarrierSnapshotPayload {
  const fleet = reports.filter((r) => r.source === "usni-fleet-tracker");
  const pool = (fleet.length > 0 ? fleet : reports)
    .slice(0, MAX_REPORTS)
    // 오래된 보도부터 덮어써 최신 보도가 이긴다 (날짜 없으면 RSS 순서상 오래된 쪽)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => reportTime(a.r) - reportTime(b.r) || b.i - a.i)
    .map(({ r }) => r);

  let carriers = carrierBase(previous);
  const updated = new Set<string>();
  let latest: ShipMovementReportDraft | null = null;

  for (const report of pool) {
    const patches = extractCarrierPatchesFromText(`${report.title}\n${report.rawExcerpt ?? ""}`, {
      evidenceUrl: report.url,
      asOfLabel: report.title,
    });
    if (patches.length === 0) continue;
    const applied = applyCarrierPatches(carriers, patches);
    const asOf = report.publishedAt ?? now.toISOString();
    const hit = new Set(applied.updatedIds);
    carriers = applied.carriers.map((c) =>
      hit.has(c.id) ? { ...c, asOf, evidenceUrl: report.url } : c,
    );
    for (const id of applied.updatedIds) updated.add(id);
    latest = report;
  }

  return {
    carriers,
    updatedAt: now.toISOString(),
    source: latest
      ? `USNI Fleet Tracker auto · ${latest.title}`
      : `USNI scanned (${via}) · no CVN location hits · previous positions kept`,
    updatedIds: [...updated],
    reportUrl: latest?.url ?? null,
    via,
  };
}
