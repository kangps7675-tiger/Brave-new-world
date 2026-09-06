import { NextResponse } from "next/server";
import { getClaudeServerStatus } from "@/lib/llm/anthropicEnv";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/claude/status
 * 키 값은 절대 반환하지 않음. UI가 BYOK/서버 digest 준비 상태만 확인.
 */
export async function GET() {
  // 키 준비 상태는 배포·환경에 따라 바뀐다 — CDN에 고정되면 안 된다
  return NextResponse.json(getClaudeServerStatus(), { headers: NO_STORE_HEADERS });
}
