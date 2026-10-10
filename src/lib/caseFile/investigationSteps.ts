/**
 * 조사 10분 UX — 넣기 → 뽑기 → 찾기 → 가르기 (건네기/export 제외).
 */

import { CORE_CLAIM_KINDS, type CaseFile, type ClaimKind } from "@/lib/caseFile/types";
import { effectiveClaimVerdict } from "@/lib/caseFile/verdict";

export type InvestigationStepId = "paste" | "extract" | "find" | "split";

export type StepState = "done" | "active" | "todo";

export const INVESTIGATION_STEPS: Array<{
  id: InvestigationStepId;
  ko: string;
  en: string;
  hintKo: string;
  hintEn: string;
}> = [
  {
    id: "paste",
    ko: "넣기",
    en: "Paste",
    hintKo: "기사 URL 또는 본문",
    hintEn: "Article URL or text",
  },
  {
    id: "extract",
    ko: "뽑기",
    en: "Extract",
    hintKo: "어디·언제 앵커",
    hintEn: "Where & when",
  },
  {
    id: "find",
    ko: "찾기",
    en: "Find",
    hintKo: "위성·화재·항적",
    hintEn: "Sensors at anchor",
  },
  {
    id: "split",
    ko: "가르기",
    en: "Split",
    hintKo: "확인됨 / 못 함",
    hintEn: "Confirmed / not",
  },
];

function hasAnchor(caseFile: CaseFile): boolean {
  const inc = caseFile.incident;
  return Boolean(inc?.place && inc.occurredAt);
}

function hasSupportingMapEvidence(caseFile: CaseFile): boolean {
  for (const c of caseFile.claims) {
    if (!(CORE_CLAIM_KINDS as readonly ClaimKind[]).includes(c.kind)) continue;
    if (!c.mapCheckable) continue;
    if (c.evidence.some((e) => e.role === "supports")) return true;
  }
  return false;
}

function anyCoreSettled(caseFile: CaseFile): boolean {
  return caseFile.claims
    .filter((c) => (CORE_CLAIM_KINDS as readonly ClaimKind[]).includes(c.kind))
    .some((c) => {
      const v = effectiveClaimVerdict(c);
      return v === "confirmed" || v === "partial" || v === "refuted";
    });
}

/** 현재 활성 단계 — 아직 안 끝난 첫 단계 */
export function deriveInvestigationStep(caseFile: CaseFile | null): InvestigationStepId {
  if (!caseFile) return "paste";
  if (!hasAnchor(caseFile)) return "extract";
  if (!hasSupportingMapEvidence(caseFile)) return "find";
  if (!anyCoreSettled(caseFile) && caseFile.verdict === "unconfirmed") return "find";
  return "split";
}

export function investigationStepProgress(
  caseFile: CaseFile | null,
): Record<InvestigationStepId, StepState> {
  const active = deriveInvestigationStep(caseFile);
  const order: InvestigationStepId[] = ["paste", "extract", "find", "split"];
  const out = {} as Record<InvestigationStepId, StepState>;
  let seenActive = false;
  for (const id of order) {
    if (id === active) {
      out[id] = "active";
      seenActive = true;
    } else if (!seenActive) {
      out[id] = "done";
    } else {
      out[id] = "todo";
    }
  }
  // 앵커·근거가 있으면 extract/find를 done으로 보정
  if (caseFile && hasAnchor(caseFile) && active !== "extract") {
    out.extract = out.extract === "active" ? "active" : "done";
  }
  if (caseFile && hasSupportingMapEvidence(caseFile) && active === "split") {
    out.find = "done";
  }
  if (caseFile) out.paste = "done";
  return out;
}
