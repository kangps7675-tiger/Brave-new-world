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
  buildNewsInsightSystem,
  buildNewsInsightUserMessage,
  fallbackInsightOnError,
  stubNewsInsightPayload,
  type NewsInsightPayload,
  type NewsInsightRequestInput,
} from "@/lib/llm/newsInsightPrompt";
import { parseAndSanitizeNewsInsight } from "@/lib/llm/newsInsightValidate";
import type { NewsInsightMode } from "@/data/newsInsightCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_KEY_HEADER = "x-anthropic-api-key";

const byokHits = new Map<string, { count: number; resetAt: number }>();
const serverDayHits = new Map<string, { count: number; day: string }>();
const BYOK_MAX_PER_MINUTE = 4;
const SERVER_MAX_PER_DAY = 8;

/** URL 키 인메모리 캐시 (프로세스 수명) */
const insightCache = new Map<
  string,
  { at: number; payload: NewsInsightPayload; billing: string; mode: string }
>();
const CACHE_TTL_MS = 30 * 60_000;
const CACHE_MAX = 80;

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

function cacheKey(input: NewsInsightRequestInput): string {
  return `${input.mode}|${input.lang}|${input.url.trim().toLowerCase()}`;
}

function readCache(key: string) {
  const hit = insightCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    insightCache.delete(key);
    return null;
  }
  return hit;
}

function writeCache(
  key: string,
  payload: NewsInsightPayload,
  billing: string,
  mode: string,
) {
  if (insightCache.size >= CACHE_MAX) {
    const oldest = insightCache.keys().next().value;
    if (oldest) insightCache.delete(oldest);
  }
  insightCache.set(key, { at: Date.now(), payload, billing, mode });
}

function corpusFor(input: NewsInsightRequestInput): string {
  const parts = [
    input.title,
    input.bodyOrSnippet ?? "",
  ];
  return parts.join("\n");
}

function emptySafePayload(input: NewsInsightRequestInput): NewsInsightPayload {
  const text = (
    (input.bodyOrSnippet && input.bodyOrSnippet.trim()) ||
    input.title
  ).slice(0, 220);
  return {
    excerpts: text ? [{ text, highlights: [] }] : [],
    insight: fallbackInsightOnError(input),
    mapActions: [],
  };
}

/**
 * POST /api/claude/news-insight
 * 발췌(원문) + 하이라이트(카탈로그) + 인사이트(재서술) + mapActions
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body 필요" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!url || !title) {
    return NextResponse.json({ error: "url·title 필요" }, { status: 400 });
  }

  const lang = body.lang === "en" ? "en" : "ko";
  const mode: NewsInsightMode = body.mode === "economy" ? "economy" : "conflict";
  const input: NewsInsightRequestInput = {
    url,
    title,
    source: typeof body.source === "string" ? body.source : null,
    publishedAt: typeof body.publishedAt === "string" ? body.publishedAt : null,
    bodyOrSnippet:
      typeof body.bodyOrSnippet === "string"
        ? body.bodyOrSnippet
        : typeof body.summary === "string"
          ? body.summary
          : null,
    mode,
    lang,
  };

  const key = cacheKey(input);
  const cached = readCache(key);
  if (cached) {
    return NextResponse.json({
      ok: true,
      cached: true,
      mode: cached.mode,
      billing: cached.billing,
      ...cached.payload,
    });
  }

  if (isApiStubMode()) {
    const payload = stubNewsInsightPayload(input);
    writeCache(key, payload, "none", "stub");
    return NextResponse.json({
      ok: true,
      stub: true,
      mode: "stub",
      billing: "none",
      ...payload,
    });
  }

  const corpus = corpusFor(input);
  const userKey = extractUserKey(request, body);
  const system = buildNewsInsightSystem(lang, mode);
  const user = buildNewsInsightUserMessage(input);

  async function runClaude(apiKey: string, billing: string, callMode: string) {
    const result = await callClaudeMessages({
      apiKey,
      system,
      user,
      model: getAnthropicModel(),
      maxTokens: 1600,
    });
    if (!result.ok) {
      return {
        error: true as const,
        status: result.status,
        message: result.error,
        rateLimited: result.rateLimited,
        insufficientFunds: result.insufficientFunds,
      };
    }
    const sanitized = parseAndSanitizeNewsInsight(result.text, corpus, mode);
    const payload = sanitized ?? emptySafePayload(input);
    if (!payload.insight) {
      payload.insight = fallbackInsightOnError(input);
    }
    writeCache(key, payload, billing, callMode);
    return {
      error: false as const,
      payload,
      billing,
      callMode,
      model: result.model,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    };
  }

  if (userKey) {
    if (!ip || !allowByok(ip)) {
      return NextResponse.json(
        {
          error:
            lang === "en"
              ? "Too many requests. Try again shortly. (4/min with your key)"
              : "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (본인 키 분당 4회)",
          rateLimited: true,
          ...emptySafePayload(input),
          ok: false,
        },
        { status: 429 },
      );
    }
    if (!userKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Anthropic API 키 형식이 아닙니다 (sk-ant-…).", ...emptySafePayload(input) },
        { status: 400 },
      );
    }
    const out = await runClaude(userKey, "user-byok", "deep");
    if (out.error) {
      return NextResponse.json(
        {
          ok: false,
          error: out.message,
          rateLimited: out.rateLimited,
          insufficientFunds: out.insufficientFunds,
          ...emptySafePayload(input),
        },
        { status: out.status >= 400 && out.status < 600 ? out.status : 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      mode: out.callMode,
      billing: out.billing,
      model: out.model,
      usage: out.usage,
      ...out.payload,
    });
  }

  // 서버 키 짧은 (why-matters와 동일 게이트)
  if (isLlmWhyMattersServerEnabled() && ip && allowServerDay(ip)) {
    const serverKey = getServerAnthropicApiKey();
    if (serverKey) {
      const out = await runClaude(serverKey, "server-short", "quick");
      if (!out.error) {
        return NextResponse.json({
          ok: true,
          mode: out.callMode,
          billing: out.billing,
          model: out.model,
          usage: out.usage,
          ...out.payload,
        });
      }
    }
  }

  const payload = emptySafePayload(input);
  writeCache(key, payload, "none", "fallback");
  return NextResponse.json({
    ok: true,
    mode: "fallback",
    billing: "none",
    note:
      lang === "en"
        ? "Add your Anthropic key for full insight, or try again later."
        : "전체 인사이트는 Anthropic 키(BYOK) 또는 잠시 후 다시 시도해 주세요.",
    ...payload,
  });
}
