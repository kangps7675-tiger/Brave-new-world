import { rateLimitKey } from "@/lib/auth/clientIdentity";
import { NextRequest, NextResponse } from "next/server";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  getAnthropicModel,
  getServerAnthropicApiKey,
  isLlmWhyMattersServerEnabled,
} from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";
import {
  buildWhyMattersQuickSystem,
  buildWhyMattersSystem,
  buildWhyMattersUserMessage,
  stubWhyMattersText,
  templateWhyMattersText,
  type WhyMattersArticleInput,
} from "@/lib/llm/whyMattersPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_KEY_HEADER = "x-anthropic-api-key";

/** BYOK: 분당 4회 · 서버 간단: IP당 하루 8회 */
const byokHits = new Map<string, { count: number; resetAt: number }>();
const serverDayHits = new Map<string, { count: number; day: string }>();
const BYOK_MAX_PER_MINUTE = 4;
const SERVER_MAX_PER_DAY = 8;

/**
 * 레이트리밋 키. x-forwarded-for 는 위조 가능하므로 cf-connecting-ip 를 우선하고,
 * 프로덕션에서 신뢰할 출처가 없으면 null 을 반환한다 → 호출부는 LLM 경로를 건너뛰고
 * 규칙/템플릿 폴백으로 응답한다(기능은 살리되 서버 쿼터는 보호).
 */
function clientIp(request: NextRequest): string | null {
  return rateLimitKey(request);
}

function allowByok(ip: string): boolean {
  const now = Date.now();
  const row = byokHits.get(ip);
  if (!row || now >= row.resetAt) {
    byokHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (row.count >= BYOK_MAX_PER_MINUTE) return false;
  row.count += 1;
  return true;
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function allowServerDay(ip: string): boolean {
  const day = utcDayKey();
  const row = serverDayHits.get(ip);
  if (!row || row.day !== day) {
    serverDayHits.set(ip, { count: 1, day });
    return true;
  }
  if (row.count >= SERVER_MAX_PER_DAY) return false;
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
 * POST /api/claude/why-matters
 *
 * - BYOK 있으면 심층 인과 해설
 * - 없으면 서버 키로 짧은 인과 해설 (일일 한도) → 없으면 템플릿
 */
export async function POST(request: NextRequest) {
  // 신뢰할 IP 출처가 없으면(프로덕션) 레이트리밋이 무의미하므로 LLM 경로를 막고
  // 템플릿 폴백으로 응답한다 — 기능은 유지, 서버 쿼터는 보호.
  const ip = clientIp(request);

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
  const input: WhyMattersArticleInput = {
    title,
    source: typeof body.source === "string" ? body.source : null,
    link: typeof body.link === "string" ? body.link : null,
    focusLabel: typeof body.focusLabel === "string" ? body.focusLabel : null,
    excerpt: typeof body.excerpt === "string" ? body.excerpt : null,
    lang,
  };

  if (isApiStubMode()) {
    return NextResponse.json({
      ok: true,
      stub: true,
      mode: "stub",
      text: stubWhyMattersText(input),
      model: "stub",
      billing: "none",
    });
  }

  const userKey = extractUserKey(request, body);

  // —— BYOK 심층 ——
  if (userKey) {
    if (!ip || !allowByok(ip)) {
      return NextResponse.json(
        {
          error:
            lang === "en"
              ? "Too many requests. Try again shortly. (4/min with your key)"
              : "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (본인 키 분당 4회)",
          rateLimited: true,
        },
        { status: 429 },
      );
    }
    if (!userKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Anthropic API 키 형식이 아닙니다 (sk-ant-…)." },
        { status: 400 },
      );
    }

    const result = await callClaudeMessages({
      apiKey: userKey,
      system: buildWhyMattersSystem(lang),
      user: buildWhyMattersUserMessage(input, "deep"),
      model: getAnthropicModel(),
      maxTokens: 900,
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
      mode: "deep",
      text: result.text,
      model: result.model,
      billing: "user-byok",
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  }

  // —— 키 없음: 서버 짧은 해설 또는 템플릿 ——
  if (isLlmWhyMattersServerEnabled()) {
    if (!ip || !allowServerDay(ip)) {
      return NextResponse.json({
        ok: true,
        stub: false,
        mode: "template",
        text: templateWhyMattersText(input),
        model: "template",
        billing: "none",
        note:
          lang === "en"
            ? "Daily free brief limit reached — template shown. Add your key for deep briefs."
            : "오늘 무료 간단 해설 한도에 도달해 템플릿을 보여 줍니다. 심층은 본인 키를 쓰세요.",
      });
    }

    const serverKey = getServerAnthropicApiKey()!;
    const result = await callClaudeMessages({
      apiKey: serverKey,
      system: buildWhyMattersQuickSystem(lang),
      user: buildWhyMattersUserMessage(input, "quick"),
      model: getAnthropicModel(),
      maxTokens: 420,
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        stub: false,
        mode: "quick",
        text: result.text,
        model: result.model,
        billing: "server-short",
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    stub: false,
    mode: "template",
    text: templateWhyMattersText(input),
    model: "template",
    billing: "none",
  });
}
