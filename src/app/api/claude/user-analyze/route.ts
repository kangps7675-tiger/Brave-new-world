import { NextRequest, NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import { rateLimitKey } from "@/lib/auth/clientIdentity";
import { getAnthropicModel } from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";
import {
  buildUserAnalyzeSystem,
  buildUserAnalyzeUserMessage,
  stubUserAnalyzeText,
  type UserAnalyzeArticleInput,
} from "@/lib/llm/userAnalyzePrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_KEY_HEADER = "x-anthropic-api-key";

/** 프로세스 메모리 IP 레이트 리밋 — 워커 재시작 시 초기화 */
const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MINUTE = 3;

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now >= row.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (row.count >= MAX_PER_MINUTE) return false;
  row.count += 1;
  return true;
}

function extractUserKey(request: NextRequest, body: Record<string, unknown>): string | null {
  const fromHeader = request.headers.get(USER_KEY_HEADER)?.trim();
  if (fromHeader) return fromHeader;
  const fromBody = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  return fromBody || null;
}

/**
 * POST /api/claude/user-analyze
 *
 * 유저 BYOK만 사용. 서버 ANTHROPIC_API_KEY 절대 사용 안 함.
 * 키는 요청에만 실리고 서버에 저장하지 않음.
 *
 * body: { title, source?, link?, theater?, excerpt?, lang? }
 * header: x-anthropic-api-key: sk-ant-...
 */
export async function POST(request: NextRequest) {
  // x-forwarded-for 는 위조 가능하므로 cf-connecting-ip 를 우선한다.
  // 프로덕션에서 신뢰할 IP 출처가 없으면 레이트리밋이 무력화되므로 거부.
  const ip = rateLimitKey(request);
  if (!ip) {
    return NextResponse.json(
      { error: "client identity unavailable", rateLimited: true },
      { status: 429 },
    );
  }
  if (!allowRequest(ip)) {
    return NextResponse.json(
      {
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (IP당 분당 3회)",
        rateLimited: true,
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body 필요" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title 필요" }, { status: 400 });
  }

  const lang = body.lang === "en" ? "en" : "ko";
  const input: UserAnalyzeArticleInput = {
    title,
    source: typeof body.source === "string" ? body.source : null,
    link: typeof body.link === "string" ? body.link : null,
    theater: typeof body.theater === "string" ? body.theater : null,
    excerpt: typeof body.excerpt === "string" ? body.excerpt : null,
    lang,
  };

  // stub: 키 없어도 데모 텍스트 (실 Anthropic 호출 없음)
  if (isApiStubMode()) {
    return NextResponse.json({
      ok: true,
      stub: true,
      text: stubUserAnalyzeText(input),
      model: "stub",
      billing: "none",
    });
  }

  const userKey = extractUserKey(request, body);
  if (!userKey) {
    return NextResponse.json(
      {
        error:
          "본인 Anthropic API 키가 필요합니다. 분석 패널에 키를 입력하세요. (서버 키는 편집용이라 유저 분석에 쓰지 않습니다)",
        needUserKey: true,
      },
      { status: 401 },
    );
  }

  if (!userKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic API 키 형식이 아닙니다 (sk-ant-…)." },
      { status: 400 },
    );
  }

  // body.apiKey 가 있었다면 응답/로그에 남기지 않도록 즉시 폐기 의도 — 변수만 사용
  const result = await callClaudeMessages({
    apiKey: userKey,
    system: buildUserAnalyzeSystem(lang),
    user: buildUserAnalyzeUserMessage(input),
    model: getAnthropicModel(),
    maxTokens: 600,
  });

  if (!result.ok) {
    const userMessage = result.insufficientFunds
      ? lang === "en"
        ? "Claude credits are exhausted. Top up your Anthropic account or try later."
        : "Claude 크레딧이 소진되었습니다. Anthropic 콘솔에서 충전 후 다시 시도하세요."
      : result.rateLimited
        ? lang === "en"
          ? "Claude is busy right now. Please try again shortly."
          : "Claude가 지금 너무 바쁩니다. 잠시 후 다시 시도해 주세요."
        : result.error;

    return NextResponse.json(
      {
        error: userMessage,
        rateLimited: result.rateLimited,
        insufficientFunds: result.insufficientFunds,
      },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    stub: false,
    text: result.text,
    model: result.model,
    billing: "user-byok",
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
  });
}
