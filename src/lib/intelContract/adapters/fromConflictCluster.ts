import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import type { ConflictEventCluster } from "@/lib/conflictEvents/types";
import type { AdapterDisconfirmOpts } from "@/lib/intelContract/adapterOpts";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { resolveDisconfirmLog } from "@/lib/intelContract/disconfirmPass";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";

export function conflictClusterToBundle(
  cluster: ConflictEventCluster,
  opts?: AdapterDisconfirmOpts,
): EvidenceBundle {
  const observations: Observation[] = cluster.sources.map((src) => {
    const modality =
      src.channel === "gdelt"
        ? ("stat" as const)
        : src.channel === "llm"
          ? ("tip" as const)
          : ("media" as const);
    return {
      id: src.id,
      modality,
      sourceKey: uniqueSourceKey(src.name, src.url),
      trustTier: src.trustTier,
      occurredAt: src.occurredAt,
      geo: {
        lat: cluster.lat,
        lng: cluster.lng,
        precision: "point" as const,
      },
      theater: cluster.theater,
      url: src.url,
      payloadRef: src.id,
      label: src.name,
      text: src.title,
    };
  });

  const confKill =
    cluster.confidence === "single-source"
      ? ["추가 독립 매체가 나오지 않으면 단일 소스 유지"]
      : ["핵심 출처가 정정·철회되면 클러스터 하향"];

  const claim = cluster.snippet || cluster.title;
  const disconfirmLog = resolveDisconfirmLog({
    claimText: claim,
    disconfirmLog: opts?.disconfirmLog,
    disconfirmCorpus: opts?.disconfirmCorpus,
    excludeIds: cluster.sources.map((s) => s.id),
    windowHours: opts?.windowHours,
    nowMs: opts?.nowMs,
  });

  return withComputedStats({
    bundleId: `cluster:${cluster.clusterId}`,
    kind: "incident",
    titleKo: cluster.title,
    titleEn: cluster.title,
    observations,
    geoOk: Number.isFinite(cluster.lat) && Number.isFinite(cluster.lng),
    method: `conflict-events:geohash+2h+jaccard:${cluster.confidence}`,
    disconfirmLog,
    killCriteria: confKill,
    altHypothesis: {
      labelKo: "동일 지역·시간대의 별개 사건일 수 있음",
      labelEn: "May be separate events in the same area/time",
      supportIds: [],
    },
    claimKo: claim,
    claimEn: claim,
    originRef: cluster.clusterId,
  });
}

export function gateConflictCluster(
  cluster: ConflictEventCluster,
  opts?: AdapterDisconfirmOpts,
): GateResult {
  return evaluateGate(conflictClusterToBundle(cluster, opts));
}
