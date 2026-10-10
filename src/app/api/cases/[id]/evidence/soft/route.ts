import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
import {
  buildSoftEvidenceLink,
  type SoftEvidenceKind,
} from "@/lib/caseFile/softEvidence";
import {
  applyCaseRevision,
  CaseNotFoundError,
  CaseRevConflictError,
  getCaseFile,
} from "@/lib/caseFile/store";
import { emptyIncident } from "@/lib/caseFile/types";
import type { EvidenceRole, EvidenceStrength } from "@/lib/caseFile/types";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOFT_KINDS: SoftEvidenceKind[] = ["media", "photo", "satellite", "manual"];

type SoftBody = {
  expectedRev: number;
  claimId: string;
  source: SoftEvidenceKind;
  role?: EvidenceRole;
  shows?: string;
  limits?: string;
  requestedStrength?: EvidenceStrength;
  reason?: string;
  url?: string;
  outlet?: string;
  imageUrl?: string;
  imageKey?: string;
  geolocationMethod?: string;
  beforeUrl?: string;
  afterUrl?: string;
  beforeDate?: string;
  afterDate?: string;
  note?: string;
};

/**
 * POST /api/cases/[id]/evidence/soft
 * 언론·사진·위성·수동 근거 첨부 (HMAC 불필요 — sanitize로 검증).
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

  let body: SoftBody;
  try {
    body = (await request.json()) as SoftBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (
    typeof body.expectedRev !== "number" ||
    !body.claimId?.trim() ||
    !SOFT_KINDS.includes(body.source)
  ) {
    return NextResponse.json(
      { error: "expectedRev, claimId, source(media|photo|satellite|manual) 필요" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const db = await getDb();
    const found = await getCaseFile(db, caseId);
    if (!found) {
      return NextResponse.json(
        { error: "not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const claim = found.caseFile.claims.find((c) => c.id === body.claimId.trim());
    if (!claim) {
      return NextResponse.json(
        { error: "claim not found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }

    const built = buildSoftEvidenceLink({
      kind: body.source,
      claimKind: claim.kind,
      role:
        body.role === "contradicts" || body.role === "context"
          ? body.role
          : "supports",
      shows: body.shows,
      limits: body.limits,
      requestedStrength: body.requestedStrength,
      imageKey: typeof body.imageKey === "string" ? body.imageKey : undefined,
      url: typeof body.url === "string" ? body.url : undefined,
      outlet: typeof body.outlet === "string" ? body.outlet : undefined,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
      geolocationMethod:
        typeof body.geolocationMethod === "string"
          ? body.geolocationMethod
          : undefined,
      beforeUrl: typeof body.beforeUrl === "string" ? body.beforeUrl : undefined,
      afterUrl: typeof body.afterUrl === "string" ? body.afterUrl : undefined,
      beforeDate:
        typeof body.beforeDate === "string" ? body.beforeDate : undefined,
      afterDate: typeof body.afterDate === "string" ? body.afterDate : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
    });

    if ("error" in built) {
      return NextResponse.json(
        { error: built.error },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const nextCase = {
      ...found.caseFile,
      incident: found.caseFile.incident ?? emptyIncident(),
      claims: found.caseFile.claims.map((c) =>
        c.id === claim.id ? { ...c, evidence: [...c.evidence, built] } : c,
      ),
    };

    const { caseFile, sanitizeNotes } = await applyCaseRevision(db, caseId, {
      expectedRev: body.expectedRev,
      op: "add_evidence",
      nextCase,
      reason: body.reason ?? `attach ${body.source} soft evidence to ${claim.id}`,
    });

    const saved =
      caseFile.claims
        .flatMap((c) => c.evidence)
        .find((e) => e.id === built.id) ?? built;

    return NextResponse.json(
      {
        caseFile,
        evidence: saved,
        sanitizeNotes,
        fetchedAt: new Date().toISOString(),
      },
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
    const message = error instanceof Error ? error.message : "soft evidence failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
