import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
import { uploadCaseEvidenceImage } from "@/lib/caseFile/r2Upload";
import { getCaseFile } from "@/lib/caseFile/store";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  imageBase64: string;
  contentType?: string;
  evidenceId?: string;
};

/**
 * POST /api/cases/[id]/evidence-image
 * body: { imageBase64, contentType?, evidenceId? }
 * R2에 올리고 imageKey 반환. Authorization: Bearer CASE_EDITOR_SECRET
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!body.imageBase64 || typeof body.imageBase64 !== "string") {
    return NextResponse.json(
      { error: "imageBase64 필요" },
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

    const evidenceId =
      (typeof body.evidenceId === "string" && body.evidenceId.trim()) ||
      `cap_${Date.now().toString(36)}`;

    const uploaded = await uploadCaseEvidenceImage({
      caseId,
      evidenceId,
      imageBase64: body.imageBase64,
      contentType: body.contentType,
    });

    if ("error" in uploaded) {
      return NextResponse.json(
        { error: uploaded.error },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        imageKey: uploaded.imageKey,
        contentType: uploaded.contentType,
        bytes: uploaded.bytes,
        evidenceId,
        fetchedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
