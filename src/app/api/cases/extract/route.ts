import { NextResponse } from "next/server";
import { authorizeCaseEditor, unauthorizedResponse } from "@/lib/caseFile/auth";
import { buildCaseDraft } from "@/lib/caseFile/buildDraft";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cases/extract
 * body: { url?: string, text?: string, outlet?: string }
 * 저장하지 않음. Authorization: Bearer CASE_EDITOR_SECRET
 */
export async function POST(request: Request) {
  if (!authorizeCaseEditor(request)) {
    return unauthorizedResponse();
  }

  let body: { url?: string; text?: string; outlet?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const outlet = typeof body.outlet === "string" ? body.outlet.trim() : undefined;

  if (!url && !text.trim()) {
    return NextResponse.json(
      { error: "url 또는 text가 필요합니다" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const draft = await buildCaseDraft({ url: url || undefined, text, outlet });
    return NextResponse.json(
      { draft, fetchedAt: new Date().toISOString() },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "extract failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
