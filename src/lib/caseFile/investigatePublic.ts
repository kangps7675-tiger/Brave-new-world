/**
 * 일반 유저 공개 조사 — 초안 추출 후 사건 파일 저장.
 * 센서 근거는 붙이지 않음 (편집자 관측 탭 전용).
 */

import type { AppDb } from "@/db/client";
import {
  buildCaseDraft,
  draftToCaseFileInput,
} from "@/lib/caseFile/buildDraft";
import { createCaseFile } from "@/lib/caseFile/store";
import { explainCaseVerdict } from "@/lib/caseFile/verdict";
import type { CaseFile } from "@/lib/caseFile/types";
import type { VerdictExplanation } from "@/lib/caseFile/verdict";
import { INVESTIGATE_LIMITS } from "@/lib/caseFile/investigateRateLimit";

export function isInvestigatePublicEnabled(): boolean {
  const raw = (process.env.INVESTIGATE_PUBLIC_ENABLED ?? "true").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

export type InvestigateInput = {
  url?: string;
  text?: string;
};

export type InvestigateOk = {
  caseFile: CaseFile;
  explanation: VerdictExplanation;
  notes: string[];
};

export function validateInvestigateInput(input: InvestigateInput):
  | { ok: true; url?: string; text: string }
  | { ok: false; error: string } {
  const url = typeof input.url === "string" ? input.url.trim() : "";
  const text = typeof input.text === "string" ? input.text : "";

  if (!url && !text.trim()) {
    return { ok: false, error: "기사 URL 또는 본문이 필요합니다" };
  }
  if (url.length > INVESTIGATE_LIMITS.maxUrlChars) {
    return { ok: false, error: "URL이 너무 깁니다" };
  }
  if (text.length > INVESTIGATE_LIMITS.maxTextChars) {
    return {
      ok: false,
      error: `본문은 ${INVESTIGATE_LIMITS.maxTextChars.toLocaleString()}자까지입니다`,
    };
  }
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, error: "http(s) URL만 사용할 수 있습니다" };
      }
    } catch {
      return { ok: false, error: "URL 형식이 올바르지 않습니다" };
    }
  }
  return { ok: true, url: url || undefined, text };
}

export async function runPublicInvestigate(
  db: AppDb,
  input: InvestigateInput,
): Promise<InvestigateOk | { error: string }> {
  const validated = validateInvestigateInput(input);
  if (!validated.ok) return { error: validated.error };

  let draft;
  try {
    draft = await buildCaseDraft({
      url: validated.url,
      text: validated.text,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "기사를 읽지 못했습니다";
    return { error: message };
  }

  if (!draft.article.text.trim() && !validated.url) {
    return { error: "본문이 비어 있습니다" };
  }

  const notes = [...draft.notes];
  if (!draft.place) {
    notes.push("장소를 자동으로 못 찾았습니다. 결과 카드에 ‘위치 미정’으로 표시됩니다.");
  }
  if (!draft.occurredAt) {
    notes.push("시각을 자동으로 못 찾았습니다. 결과 카드에 ‘시각 미정’으로 표시됩니다.");
  }
  notes.push(
    "자동 초안입니다. 열점·공습·위성 같은 지도 근거는 아직 붙지 않았습니다.",
  );

  const { caseFile } = await createCaseFile(db, draftToCaseFileInput(draft));
  const explanation = explainCaseVerdict(caseFile);
  return { caseFile, explanation, notes };
}

/** 일반 유저용 한 줄 판정 설명 */
export function plainVerdictBlurb(verdict: CaseFile["verdict"]): string {
  switch (verdict) {
    case "confirmed":
      return "장소·시간·사건 발생이 지도 근거로 뒷받침된 상태입니다.";
    case "partial":
      return "일부만 지도로 확인됐습니다. 나머지는 근거가 더 필요합니다.";
    case "refuted":
      return "핵심 주장 중 하나가 붙은 근거와 어긋납니다.";
    case "unconfirmed":
    default:
      return "아직 지도 근거가 없어 사실로 확정하지 않았습니다. 기사만으로 자동 판정한 초안입니다.";
  }
}
