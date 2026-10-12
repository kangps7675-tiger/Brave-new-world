import { fetchUsniFleetTrackerReports } from "@/lib/shipMovements/usni";
import { buildCarrierSnapshot, carrierBase } from "@/lib/usCarriers/buildSnapshot";
import {
  loadUsCarrierSnapshot,
  saveUsCarrierSnapshot,
  type UsCarrierSnapshotPayload,
} from "@/lib/usCarriers/snapshotStore";

export type RefreshCarriersResult = UsCarrierSnapshotPayload & {
  ok: boolean;
  reportsScanned: number;
  error?: string;
};

/**
 * USNI Fleet Tracker RSS/아카이브를 읽어 직전 스냅샷 위에 위치 패치를 입힌 뒤 D1에 저장.
 * (cron Worker도 같은 계산을 직접 돌린다 — workers/cron-ingest/src/usCarriers.ts)
 */
export async function refreshCarriersFromUsniNews(): Promise<RefreshCarriersResult> {
  const previous = await loadUsCarrierSnapshot();
  try {
    const { reports, via } = await fetchUsniFleetTrackerReports();
    const payload = buildCarrierSnapshot(previous?.carriers, reports, via);

    try {
      await saveUsCarrierSnapshot(payload);
    } catch (error) {
      return {
        ok: false,
        reportsScanned: reports.length,
        ...payload,
        error:
          error instanceof Error
            ? `snapshot save failed: ${error.message}`
            : "snapshot save failed",
      };
    }
    return { ok: true, reportsScanned: reports.length, ...payload };
  } catch (error) {
    return {
      ok: false,
      reportsScanned: 0,
      carriers: carrierBase(previous?.carriers),
      updatedAt: new Date().toISOString(),
      source: "error",
      updatedIds: [],
      error: error instanceof Error ? error.message : "carrier refresh failed",
    };
  }
}
