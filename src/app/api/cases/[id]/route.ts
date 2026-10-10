import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { explainCaseVerdict } from "@/lib/caseFile/verdict";
import { getCaseFile } from "@/lib/caseFile/store";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cases/[id] — 현재 상태 + 수정 기록 + 판정 설명.
 * 읽기는 비밀 키 없이 ID 링크로 공유 (추측 어려운 id).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const caseId = (id || "").trim();
  if (!caseId) {
    return NextResponse.json(
      { error: "missing id" },
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
    return NextResponse.json(
      {
        caseFile: found.caseFile,
        revisions: found.revisions,
        explanation: explainCaseVerdict(found.caseFile),
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "read failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
