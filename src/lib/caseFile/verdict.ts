import { evidenceSourceKind } from "@/lib/caseFile/sourceKind";
import {
  CORE_CLAIM_KINDS,
  type CaseFile,
  type Claim,
  type EvidenceLink,
  type Verdict,
} from "@/lib/caseFile/types";

/**
 * 세부 주장 판정 (규칙).
 * - 반박 근거가 있으면 반박 우선
 * - 확인됨: 뒷받침 강 1개, 또는 서로 다른 종류(source kind)의 중 2개 이상
 * - 일부 확인: 뒷받침은 있으나 위 기준 미달
 * - 확인 못함: 뒷받침 없음 (맥락만 있어도 확인 못함)
 * - context 역할은 판정에 넣지 않음
 */
export function computeClaimVerdict(claim: Pick<Claim, "evidence">): Verdict {
  const evidence = claim.evidence ?? [];
  const contradicts = evidence.filter((e) => e.role === "contradicts");
  if (contradicts.length > 0) return "refuted";

  const supports = evidence.filter((e) => e.role === "supports");
  if (supports.length === 0) return "unconfirmed";

  if (supports.some((e) => e.strength === "strong")) return "confirmed";

  const mediumKinds = new Set(
    supports
      .filter((e) => e.strength === "medium")
      .map((e) => evidenceSourceKind(e.sourceKey)),
  );
  if (mediumKinds.size >= 2) return "confirmed";

  return "partial";
}

/** 화면·전체 판정에 쓰는 실효 판정 (편집자 override 우선) */
export function effectiveClaimVerdict(claim: Claim): Verdict {
  return claim.override?.verdict ?? claim.verdict;
}

/**
 * 전체 판정 — 장소·시간·사건 발생만 사용. 수단·주체·피해는 제외.
 * - 반박됨: 핵심 중 하나라도 반박
 * - 확인됨: 핵심이 모두 확인됨
 * - 일부 확인: 핵심 중 하나 이상 확인 또는 일부 확인
 * - 확인 못함: 그 외
 */
export function computeCaseVerdict(caseFile: Pick<CaseFile, "claims">): Verdict {
  const core = caseFile.claims.filter((c) =>
    (CORE_CLAIM_KINDS as readonly string[]).includes(c.kind),
  );
  if (core.length === 0) return "unconfirmed";

  const effective = core.map(effectiveClaimVerdict);
  if (effective.some((v) => v === "refuted")) return "refuted";
  if (effective.every((v) => v === "confirmed")) return "confirmed";
  if (effective.some((v) => v === "confirmed" || v === "partial")) return "partial";
  return "unconfirmed";
}

/** 모든 세부 주장 + 전체 판정을 규칙으로 다시 계산 (override는 유지) */
export function refreshCaseVerdicts(caseFile: CaseFile): CaseFile {
  const claims = caseFile.claims.map((c) => ({
    ...c,
    verdict: computeClaimVerdict(c),
  }));
  return {
    ...caseFile,
    claims,
    verdict: computeCaseVerdict({ claims }),
  };
}

export type VerdictExplanation = {
  caseVerdict: Verdict;
  why: string;
  whatWouldChange: string[];
  core: Array<{
    kind: Claim["kind"];
    statement: string;
    verdict: Verdict;
    editorOverride: boolean;
    supporting: number;
    contradicting: number;
  }>;
  nonCoreNote: string;
};

/** 결과물용: 왜 이 판정인가 / 무엇이 있으면 바뀌나 */
export function explainCaseVerdict(caseFile: CaseFile): VerdictExplanation {
  const refreshed = refreshCaseVerdicts(caseFile);
  const core = refreshed.claims.filter((c) =>
    (CORE_CLAIM_KINDS as readonly string[]).includes(c.kind),
  );
  const nonCore = refreshed.claims.filter(
    (c) => !(CORE_CLAIM_KINDS as readonly string[]).includes(c.kind),
  );

  const lines: string[] = [];
  for (const c of core) {
    const v = effectiveClaimVerdict(c);
    const via = c.override ? `편집자 판단(${c.override.reason})` : "규칙";
    lines.push(`${labelKind(c.kind)}: ${labelVerdict(v)} (${via})`);
  }

  const whatWouldChange: string[] = [];
  for (const c of core) {
    const v = effectiveClaimVerdict(c);
    if (v === "refuted") {
      whatWouldChange.push(
        `${labelKind(c.kind)} 반박 근거를 철회·반박하면 전체 반박이 풀릴 수 있음`,
      );
    } else if (v === "unconfirmed") {
      whatWouldChange.push(
        `${labelKind(c.kind)}에 강 근거 1개, 또는 서로 다른 종류 중 근거 2개가 있으면 확인됨`,
      );
    } else if (v === "partial") {
      whatWouldChange.push(
        `${labelKind(c.kind)}에 강 근거를 추가하거나 다른 종류 중 근거를 한 개 더 붙이면 확인됨`,
      );
    }
  }
  for (const c of nonCore) {
    if (c.kind === "means" || c.kind === "actor") {
      whatWouldChange.push(
        `${labelKind(c.kind)}은 전체 판정에 넣지 않음 — 지도로 확인 불가로 따로 표시`,
      );
    }
  }

  return {
    caseVerdict: refreshed.verdict,
    why: lines.join(". ") || "핵심 세부 주장 없음",
    whatWouldChange: [...new Set(whatWouldChange)],
    core: core.map((c) => ({
      kind: c.kind,
      statement: c.statement,
      verdict: effectiveClaimVerdict(c),
      editorOverride: Boolean(c.override),
      supporting: c.evidence.filter((e) => e.role === "supports").length,
      contradicting: c.evidence.filter((e) => e.role === "contradicts").length,
    })),
    nonCoreNote: nonCore
      .map((c) => `${labelKind(c.kind)}=${labelVerdict(effectiveClaimVerdict(c))}`)
      .join(", "),
  };
}

function labelKind(kind: Claim["kind"]): string {
  switch (kind) {
    case "place":
      return "장소";
    case "time":
      return "시간";
    case "occurrence":
      return "사건 발생";
    case "damage":
      return "피해";
    case "means":
      return "수단";
    case "actor":
      return "주체";
    default:
      return kind;
  }
}

function labelVerdict(v: Verdict): string {
  switch (v) {
    case "confirmed":
      return "확인됨";
    case "partial":
      return "일부 확인";
    case "unconfirmed":
      return "확인 못함";
    case "refuted":
      return "반박됨";
    default:
      return v;
  }
}

/** 테스트·조립 편의 */
export function evidence(
  partial: Omit<EvidenceLink, "id" | "capturedAt" | "commercialUse"> &
    Partial<Pick<EvidenceLink, "id" | "capturedAt" | "commercialUse">>,
): EvidenceLink {
  return {
    id: partial.id ?? `ev_${Math.random().toString(36).slice(2, 8)}`,
    sourceKey: partial.sourceKey,
    role: partial.role,
    strength: partial.strength,
    shows: partial.shows,
    limits: partial.limits,
    capturedAt: partial.capturedAt ?? new Date().toISOString(),
    frozenPayload: partial.frozenPayload,
    imageKey: partial.imageKey,
    commercialUse: partial.commercialUse ?? "unknown",
  };
}
