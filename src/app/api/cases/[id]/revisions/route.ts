import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
import {
  applyCaseRevision,
  CaseNotFoundError,
  CaseRevConflictError,
} from "@/lib/caseFile/store";
import type { CaseFile, CaseRevisionOp } from "@/lib/caseFile/types";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RevisionBody = {
  expectedRev: number;
  op: CaseRevisionOp;
  nextCase: CaseFile;
  reason?: string;
};

/**
 * POST /api/cases/[id]/revisions
 * body: { expectedRev, op, nextCase, reason? }
 * Authorization: Bearer CASE_EDITOR_SECRET
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorizeCaseEditor(request)) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const caseId = (id || "").trim();
  if (!caseId) {
    return NextResponse.json(
      { error: "missing id" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let body: RevisionBody;
  try {
    body = (await request.json()) as RevisionBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (
    typeof body.expectedRev !== "number" ||
    !body.op ||
    !body.nextCase ||
    !Array.isArray(body.nextCase.claims)
  ) {
    return NextResponse.json(
      { error: "expectedRev, op, nextCase.claims 필요" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const db = await getDb();
    const { caseFile, sanitizeNotes } = await applyCaseRevision(db, caseId, {
      expectedRev: body.expectedRev,
      op: body.op,
      nextCase: body.nextCase,
      reason: body.reason,
    });
    return NextResponse.json(
      { caseFile, sanitizeNotes, fetchedAt: new Date().toISOString() },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof CaseNotFoundError) {
      return NextResponse.json(
        { error: "not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    if (error instanceof CaseRevConflictError) {
      return NextResponse.json(
        { error: "rev conflict", currentRev: error.currentRev },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }
    const message = error instanceof Error ? error.message : "revision failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
