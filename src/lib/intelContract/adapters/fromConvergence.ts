import type { AdapterDisconfirmOpts } from "@/lib/intelContract/adapterOpts";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { resolveDisconfirmLog } from "@/lib/intelContract/disconfirmPass";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";

/** cron-ingest ConvergenceEvent 최소 표면 — src에서 workers 타입 직접 import 회피 */
export type ConvergenceEventLike = {
  id: string;
  signalDate: string;
  theaterId: string;
  algoVersion: string;
  channelCount: number;
  score: number;
  peakZ: number;
  firedChannels: string[];
  channels: Array<{
    channel: string;
    value: number;
    z: number;
    fired: boolean;
    suppressed?: string;
  }>;
};

export function convergenceToBundle(
  event: ConvergenceEventLike,
  opts?: AdapterDisconfirmOpts,
): EvidenceBundle {
  const observations: Observation[] = event.channels
    .filter((c) => c.fired)
    .map((c) => ({
      id: `${event.id}:${c.channel}`,
      modality:
        c.channel === "firms" || c.channel === "airraid"
          ? ("sensor" as const)
          : c.channel === "telegram"
            ? ("tip" as const)
            : ("stat" as const),
      sourceKey: `convergence:${c.channel}`,
      occurredAt: `${event.signalDate}T12:00:00.000Z`,
      theater: event.theaterId,
      payloadRef: `${event.theaterId}:${c.channel}:${event.signalDate}`,
      label: c.channel,
      text: `z=${c.z.toFixed(2)} value=${c.value}`,
    }));

  const nonTip = observations.filter((o) => o.modality !== "tip");
  const useObs = nonTip.length >= 1 ? observations : observations;

  // suppressed 채널 수는 반증 검색이 아님 — 외부 corpus로만 탐색
  const disconfirmLog = resolveDisconfirmLog({
    claimText: `${event.theaterId} convergence ${event.signalDate}`,
    disconfirmLog: opts?.disconfirmLog,
    disconfirmCorpus: opts?.disconfirmCorpus,
    excludeIds: useObs.map((o) => o.id),
    windowHours: opts?.windowHours,
    nowMs: opts?.nowMs,
  });

  return withComputedStats({
    bundleId: `convergence:${event.id}`,
    kind: "indicator",
    titleKo: `${event.theaterId} 다채널 수렴 (${event.signalDate})`,
    titleEn: `${event.theaterId} multi-channel convergence (${event.signalDate})`,
    observations: useObs,
    geoOk: true,
    method: `convergence:${event.algoVersion}:channels=${event.channelCount}:peakZ=${event.peakZ}`,
    disconfirmLog,
    killCriteria: [
      "익일 채널 z가 임계 미만으로 복귀하면 경보 하향",
      "FIRMS가 corroboration 없이 단독이면 억제 유지",
    ],
    altHypothesis: {
      labelKo: "계절·농소각·단발 노이즈일 수 있음",
      labelEn: "May be seasonal fires or single-channel noise",
      supportIds: event.channels.filter((c) => c.suppressed).map((c) => c.channel),
    },
    claimKo: `${event.firedChannels.length}개 채널 동시 이탈 (score ${event.score.toFixed(2)})`,
    claimEn: `${event.firedChannels.length} channels co-moving (score ${event.score.toFixed(2)})`,
    originRef: event.id,
  });
}

export function gateConvergence(
  event: ConvergenceEventLike,
  opts?: AdapterDisconfirmOpts,
): GateResult {
  return evaluateGate(convergenceToBundle(event, opts));
}
