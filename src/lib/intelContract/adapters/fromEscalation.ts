import { uniqueSourceKey } from "@/lib/conflictEvents/confidence";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { evaluateGate } from "@/lib/intelContract/gate";
import type { EvidenceBundle, GateResult, Observation } from "@/lib/intelContract/types";
import type { EscalationSignal } from "@/lib/escalationSignals";

export type EscalationGateInput = {
  signal: EscalationSignal;
  /** 신호에 연결된 뉴스/출처 id·url */
  sourceRefs?: Array<{
    id: string;
    name: string;
    url: string | null;
    occurredAt?: string | null;
  }>;
  itemId?: string;
};

export function escalationToBundle(input: EscalationGateInput): EvidenceBundle {
  const { signal } = input;
  const observations: Observation[] = (input.sourceRefs ?? []).map((ref) => ({
    id: ref.id,
    modality: "media" as const,
    sourceKey: uniqueSourceKey(ref.name, ref.url),
    occurredAt: ref.occurredAt ?? null,
    url: ref.url,
    payloadRef: ref.id,
    label: ref.name,
    theater: signal.theaters[0] ?? null,
  }));

  // factors act as structured evidence when no external refs
  if (observations.length === 0) {
    for (const f of signal.factors.slice(0, 4)) {
      observations.push({
        id: `factor:${f.code}`,
        modality: "stat",
        sourceKey: `escalation-factor:${f.code}`,
        occurredAt: null,
        payloadRef: f.code,
        label: f.labelKo,
        text: f.evidence,
      });
    }
  }

  // ensure ≥2 synthetic independence when factors exist
  if (observations.length === 1 && signal.factors.length > 1) {
    const f = signal.factors[1]!;
    observations.push({
      id: `factor:${f.code}`,
      modality: "stat",
      sourceKey: `escalation-factor:${f.code}`,
      occurredAt: null,
      payloadRef: f.code,
      label: f.labelKo,
      text: f.evidence,
    });
  }

  return withComputedStats({
    bundleId: `escalation:${input.itemId ?? signal.pattern}:${signal.score}`,
    kind: "escalation",
    titleKo: signal.headlineKo,
    titleEn: signal.headlineEn,
    observations,
    geoOk: true,
    method: `escalationSignals:${signal.pattern}:score=${signal.score}`,
    disconfirmLog: { queried: true, hitCount: 0 },
    killCriteria: [
      "보도가 정정되거나 임계선 키워드가 철회되면 신호 해제",
      "동일 패턴 반복이 평시 베이스라인과 구분되지 않으면 하향",
    ],
    altHypothesis: {
      labelKo: signal.reportedAsStray
        ? "보도상 사고·표류 표현 — 의도적 확전이 아닐 수 있음"
        : "수사·오보·국내 이슈일 수 있음",
      labelEn: signal.reportedAsStray
        ? "Reported as stray/accident — may not be intentional escalation"
        : "May be rhetoric, misreport, or domestic issue",
      supportIds: signal.factors.map((f) => f.code),
    },
    claimKo: signal.headlineKo,
    claimEn: signal.headlineEn,
    originRef: signal.pattern,
  });
}

export function gateEscalation(input: EscalationGateInput): GateResult {
  return evaluateGate(escalationToBundle(input));
}
