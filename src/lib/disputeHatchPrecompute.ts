import type { DisputeArea, TransportPath } from "@/data/geoTypes";
import {
  disputeMatchesWarDiplomaticLayers,
  disputeToOutlineAndHatchPaths,
  rankDisputesForDisplay,
} from "@/lib/disputeHatch";
import { filterHatchPathsByView } from "@/lib/ukraineHatchPrecompute";

export type DisputeHatchLod = "overview" | "detail";

export type DisputeHatchCachePayload = {
  generatedAt: string;
  lodTier: DisputeHatchLod;
  pathCount: number;
  /** path id → dispute id (호버 매핑용) */
  pathDisputeIds: Record<string, string>;
  paths: TransportPath[];
};

export function precomputeDisputeHatchPaths(
  disputes: DisputeArea[],
  lod: DisputeHatchLod,
): DisputeHatchCachePayload {
  const preferDetail = lod === "detail";
  const ranked = rankDisputesForDisplay(disputes).filter((d) =>
    disputeMatchesWarDiplomaticLayers(d, true, true),
  );
  const capped = ranked.slice(0, lod === "overview" ? 80 : 200);
  const paths: TransportPath[] = [];
  const pathDisputeIds: Record<string, string> = {};

  for (const dispute of capped) {
    const built = disputeToOutlineAndHatchPaths(dispute, {
      preferDetailSegments: preferDetail,
    });
    for (const path of built) {
      pathDisputeIds[path.id] = dispute.id;
      paths.push(path);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    lodTier: lod,
    pathCount: paths.length,
    pathDisputeIds,
    paths,
  };
}

export { filterHatchPathsByView };
