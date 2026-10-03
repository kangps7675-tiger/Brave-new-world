import type { EvidenceBundle, Observation } from "@/lib/intelContract/types";

export function computeObservationStats(observations: Observation[]): {
  independenceCount: number;
  modalityCount: number;
  timeSpanMs: number;
} {
  const keys = new Set(observations.map((o) => o.sourceKey).filter(Boolean));
  const mods = new Set(observations.map((o) => o.modality));
  const times = observations
    .map((o) => (o.occurredAt ? Date.parse(o.occurredAt) : NaN))
    .filter((t) => Number.isFinite(t));
  const timeSpanMs =
    times.length >= 2 ? Math.max(...times) - Math.min(...times) : 0;
  return {
    independenceCount: keys.size,
    modalityCount: mods.size,
    timeSpanMs,
  };
}

export function withComputedStats(
  partial: Omit<
    EvidenceBundle,
    "independenceCount" | "modalityCount" | "timeSpanMs"
  > &
    Partial<
      Pick<EvidenceBundle, "independenceCount" | "modalityCount" | "timeSpanMs">
    >,
): EvidenceBundle {
  const stats = computeObservationStats(partial.observations);
  return {
    ...partial,
    independenceCount: partial.independenceCount ?? stats.independenceCount,
    modalityCount: partial.modalityCount ?? stats.modalityCount,
    timeSpanMs: partial.timeSpanMs ?? stats.timeSpanMs,
  };
}
