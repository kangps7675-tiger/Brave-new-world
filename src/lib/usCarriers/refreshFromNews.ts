import { fetchUsniFleetTrackerReports } from "@/lib/shipMovements/usni";
import { US_CARRIERS_SEED } from "@/data/usCarriers";
import {
  applyCarrierPatches,
  extractCarrierPatchesFromText,
} from "@/lib/usCarriers/fromUsniNews";
import {
  saveUsCarrierSnapshot,
  type UsCarrierSnapshotPayload,
} from "@/lib/usCarriers/snapshotStore";

export type RefreshCarriersResult = UsCarrierSnapshotPayload & {
  ok: boolean;
  reportsScanned: number;
  error?: string;
};

/**
 * USNI Fleet Tracker RSS/아카이브를 읽어 CVN 시드에 위치 패치를 입힌 뒤 D1에 저장.
 */
export async function refreshCarriersFromUsniNews(): Promise<RefreshCarriersResult> {
  try {
    const { reports, via } = await fetchUsniFleetTrackerReports();
    const fleetReports = reports.filter((r) => r.source === "usni-fleet-tracker");
    const pool = fleetReports.length > 0 ? fleetReports : reports;

    let bestUpdatedIds: string[] = [];
    let bestCarriers = US_CARRIERS_SEED.map((c) => ({ ...c }));
    let bestUrl: string | null = null;
    let bestTitle: string | null = null;

    for (const report of pool.slice(0, 6)) {
      const text = `${report.title}\n${report.rawExcerpt ?? ""}`;
      const patches = extractCarrierPatchesFromText(text, {
        evidenceUrl: report.url,
        asOfLabel: report.title,
      });
      if (patches.length === 0) continue;
      const { carriers, updatedIds } = applyCarrierPatches(US_CARRIERS_SEED, patches);
      if (updatedIds.length > bestUpdatedIds.length) {
        bestUpdatedIds = updatedIds;
        bestCarriers = carriers;
        bestUrl = report.url;
        bestTitle = report.title;
      }
    }

    const updatedAt = new Date().toISOString();
    const payload: UsCarrierSnapshotPayload = {
      carriers: bestCarriers,
      updatedAt,
      source:
        bestUpdatedIds.length > 0
          ? `USNI Fleet Tracker auto · ${bestTitle ?? via}`
          : `USNI scanned (${via}) · no CVN location hits · seed retained`,
      updatedIds: bestUpdatedIds,
      reportUrl: bestUrl,
      via,
    };

    try {
      await saveUsCarrierSnapshot(payload);
    } catch (error) {
      return {
        ok: false,
        reportsScanned: pool.length,
        ...payload,
        error:
          error instanceof Error
            ? `snapshot save failed: ${error.message}`
            : "snapshot save failed",
      };
    }
    return {
      ok: true,
      reportsScanned: pool.length,
      ...payload,
    };
  } catch (error) {
    return {
      ok: false,
      reportsScanned: 0,
      carriers: US_CARRIERS_SEED.map((c) => ({ ...c })),
      updatedAt: new Date().toISOString(),
      source: "error",
      updatedIds: [],
      error: error instanceof Error ? error.message : "carrier refresh failed",
    };
  }
}
