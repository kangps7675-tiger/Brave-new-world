/**
 * 사건 파일 D1 저장.
 * - case_revisions: 추가만
 * - cases: 현재 스냅샷 캐시
 * - 동시 수정은 expectedRev로 거부
 */

import { and, asc, eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { caseRevisions, cases } from "@/db/schema";
import {
  sanitizeCaseFile,
  type SanitizeNote,
} from "@/lib/caseFile/sanitizeEvidence";
import { refreshCaseVerdicts } from "@/lib/caseFile/verdict";
import type {
  CaseFile,
  CaseRevisionOp,
  CaseRevisionRecord,
} from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";

export class CaseRevConflictError extends Error {
  readonly currentRev: number;
  constructor(currentRev: number) {
    super(`case rev conflict: expected older, current=${currentRev}`);
    this.name = "CaseRevConflictError";
    this.currentRev = currentRev;
  }
}

export class CaseNotFoundError extends Error {
  constructor(caseId: string) {
    super(`case not found: ${caseId}`);
    this.name = "CaseNotFoundError";
  }
}

function revisionRowId(caseId: string, rev: number): string {
  return `${caseId}|${rev}`;
}

function newCaseId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `case_${rand.slice(0, 22)}`;
}

function parseSnapshot(json: string): CaseFile {
  const raw = JSON.parse(json) as CaseFile;
  return {
    ...raw,
    incident: raw.incident ?? emptyIncident(),
  };
}

export async function getCaseFile(
  db: AppDb,
  caseId: string,
): Promise<{ caseFile: CaseFile; revisions: CaseRevisionRecord[] } | null> {
  const row = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!row[0]) return null;
  const caseFile = parseSnapshot(row[0].snapshotJson);
  const revRows = await db
    .select()
    .from(caseRevisions)
    .where(eq(caseRevisions.caseId, caseId))
    .orderBy(asc(caseRevisions.rev));
  const revisions: CaseRevisionRecord[] = revRows.map((r) => ({
    caseId: r.caseId,
    rev: r.rev,
    at: r.at,
    op: r.op as CaseRevisionOp,
    payload: JSON.parse(r.payloadJson) as unknown,
    reason: r.reason ?? undefined,
  }));
  return { caseFile, revisions };
}

export type CreateCaseFileResult = {
  caseFile: CaseFile;
  sanitizeNotes: SanitizeNote[];
};

/** 초안을 rev=1로 저장 (근거는 서버 상한표로 검증) */
export async function createCaseFile(
  db: AppDb,
  draft: Omit<CaseFile, "id" | "rev" | "verdict"> &
    Partial<Pick<CaseFile, "id" | "verdict">>,
): Promise<CreateCaseFileResult> {
  const now = new Date().toISOString();
  const id = draft.id?.trim() || newCaseId();
  const { caseFile: sanitized, notes } = sanitizeCaseFile(
    refreshCaseVerdicts({
      id,
      title: draft.title,
      article: draft.article,
      eventType: draft.eventType,
      incident: draft.incident ?? emptyIncident(),
      claims: draft.claims,
      verdict: draft.verdict ?? "unconfirmed",
      rev: 1,
      createdAt: now,
      updatedAt: now,
    }),
  );
  const base = { ...sanitized, id, rev: 1, createdAt: now, updatedAt: now };

  await db.batch([
    db
      .insert(cases)
      .values({
        id: base.id,
        title: base.title ?? null,
        eventType: base.eventType,
        verdict: base.verdict,
        rev: 1,
        snapshotJson: JSON.stringify(base),
        createdAt: now,
        updatedAt: now,
      }),
    db.insert(caseRevisions).values({
      id: revisionRowId(base.id, 1),
      caseId: base.id,
      rev: 1,
      at: now,
      op: "create",
      payloadJson: JSON.stringify({ caseFile: base, sanitizeNotes: notes }),
      reason: null,
    }),
  ]);

  return { caseFile: base, sanitizeNotes: notes };
}

export type ApplyCaseRevisionInput = {
  expectedRev: number;
  op: CaseRevisionOp;
  /** 전체 스냅샷을 넘기거나, 호출 전에 merge한 CaseFile */
  nextCase: CaseFile;
  reason?: string;
};

export type ApplyCaseRevisionResult = {
  caseFile: CaseFile;
  sanitizeNotes: SanitizeNote[];
};

/**
 * 수정 한 건 추가. expectedRev가 DB 현재 rev와 다르면 CaseRevConflictError.
 * nextCase 근거는 서버 상한표로 검증한 뒤 저장한다.
 */
export async function applyCaseRevision(
  db: AppDb,
  caseId: string,
  input: ApplyCaseRevisionInput,
): Promise<ApplyCaseRevisionResult> {
  const existing = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  const row = existing[0];
  if (!row) throw new CaseNotFoundError(caseId);
  if (row.rev !== input.expectedRev) {
    throw new CaseRevConflictError(row.rev);
  }

  const now = new Date().toISOString();
  const nextRev = row.rev + 1;
  const { caseFile: sanitized, notes } = sanitizeCaseFile({
    ...input.nextCase,
    id: caseId,
    incident: input.nextCase.incident ?? emptyIncident(),
    rev: nextRev,
    createdAt: input.nextCase.createdAt ?? row.createdAt,
    updatedAt: now,
  });
  const next = sanitized;

  await db.batch([
    db.insert(caseRevisions).values({
      id: revisionRowId(caseId, nextRev),
      caseId,
      rev: nextRev,
      at: now,
      op: input.op,
      payloadJson: JSON.stringify({
        op: input.op,
        caseFile: next,
        sanitizeNotes: notes,
      }),
      reason: input.reason ?? null,
    }),
    db
      .update(cases)
      .set({
        title: next.title ?? null,
        eventType: next.eventType,
        verdict: next.verdict,
        rev: nextRev,
        snapshotJson: JSON.stringify(next),
        updatedAt: now,
      })
      .where(and(eq(cases.id, caseId), eq(cases.rev, input.expectedRev))),
  ]);

  // batch 후 rev가 안 바뀌었으면 경쟁 조건
  const after = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!after[0] || after[0].rev !== nextRev) {
    throw new CaseRevConflictError(after[0]?.rev ?? row.rev);
  }

  return { caseFile: next, sanitizeNotes: notes };
}
