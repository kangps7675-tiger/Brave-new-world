import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  checkInvestigateRateLimit,
  clientKeyFromRequest,
  INVESTIGATE_LIMITS,
} from "@/lib/caseFile/investigateRateLimit";
import {
  isInvestigatePublicEnabled,
  runPublicInvestigate,
} from "@/lib/caseFile/investigatePublic";
import { absoluteUrl } from "@/lib/siteUrl";
import { NO_STORE_HEADERS } from "@/lib/httpCacheHeaders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cases/investigate
 * 공개 — 기사 URL/본문 → 사건 파일 초안 저장 → 공유 가능한 결과.
 * 센서 근거 첨부·편집은 불가 (관측 탭 + 편집 토큰).
 */
export async function POST(request: Request) {
  if (!isInvestigatePublicEnabled()) {
    return NextResponse.json(
      { error: "공개 조사가 일시적으로 닫혀 있습니다" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const limit = checkInvestigateRateLimit(clientKeyFromRequest(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${limit.retryAfterSec}초 뒤 다시 시도하세요`,
        retryAfterSec: limit.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(limit.retryAfterSec),
        },
      },
    );
  }

  let body: { url?: string; text?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const db = await getDb();
    const result = await runPublicInvestigate(db, body);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const sharePath = `/case/${encodeURIComponent(result.caseFile.id)}`;
    return NextResponse.json(
      {
        caseId: result.caseFile.id,
        caseFile: result.caseFile,
        explanation: result.explanation,
        notes: result.notes,
        shareUrl: absoluteUrl(sharePath),
        sharePath,
        limits: {
          remaining: limit.remaining,
          maxPerMinute: INVESTIGATE_LIMITS.maxPerWindow,
          maxPerDay: INVESTIGATE_LIMITS.maxPerDay,
        },
        fetchedAt: new Date().toISOString(),
      },
      {
        status: 201,
        headers: {
          ...NO_STORE_HEADERS,
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "조사에 실패했습니다";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
