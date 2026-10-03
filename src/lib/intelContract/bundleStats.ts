import type { EvidenceBundle, Observation } from "@/lib/intelContract/types";

/** 독립성 집계 대상 — 어댑터 스캐폴드(countsTowardIndependence: false) 제외 */
export function independenceEligible(observations: Observation[]): Observation[] {
  return observations.filter((o) => o.countsTowardIndependence !== false);
}

export function computeObservationStats(observations: Observation[]): {
  independenceCount: number;
  modalityCount: number;
  timeSpanMs: number;
} {
  const eligible = independenceEligible(observations);
  const keys = new Set(eligible.map((o) => o.sourceKey).filter(Boolean));
  // modality는 실측 채널 구성용 — 스캐폴드로 모달리티를 부풀리지 않음
  const mods = new Set(eligible.map((o) => o.modality));
  const times = eligible
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
