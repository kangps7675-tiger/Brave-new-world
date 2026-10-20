import { rateLimitKey } from "@/lib/auth/clientIdentity";
import { NextRequest, NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/apiCache";
import { isApiStubMode } from "@/lib/apiStubMode";
import {
  askLayersChipLabel,
  askLayersIntentSystemPrompt,
  isAskLayersIntentId,
  matchAskLayersIntentByRules,
  normalizeAskQuery,
  resolveAskLayersIntent,
  type AskLayersIntentId,
  type AskLayersResolved,
} from "@/lib/askLayersIntent";
import { loadDailyRanks, utcRankDate } from "@/lib/dailyRanks";
import { getServerAnthropicApiKey } from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 30 * 60 * 1000;
const SERVER_MAX_PER_DAY = 8;
const HAIKU_MODEL =
  process.env.ASK_LAYERS_MODEL?.trim() || "claude-haiku-4-5-20251001";

const serverDayHits = new Map<string, { count: number; day: string }>();

/**
 * 레이트리밋 키. x-forwarded-for 는 위조 가능하므로 cf-connecting-ip 를 우선하고,
 * 프로덕션에서 신뢰할 출처가 없으면 null 을 반환한다 → 호출부는 LLM 경로를 건너뛰고
 * 규칙/템플릿 폴백으로 응답한다(기능은 살리되 서버 쿼터는 보호).
 */
function clientIp(request: NextRequest): string | null {
  return rateLimitKey(request);
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

function parseIntentFromLlm(text: string): AskLayersIntentId | null {
  const trimmed = text.trim();
  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { intent?: string };
    if (typeof parsed.intent === "string" && isAskLayersIntentId(parsed.intent)) {
      return parsed.intent;
    }
  } catch {
    /* fall through */
  }
  const id = trimmed.replace(/["'`]/g, "").trim();
  return isAskLayersIntentId(id) ? id : null;
}

type AskLayersResponseBody = {
  intent: AskLayersIntentId | null;
  labelKo: string;
  labelEn: string;
  reply: string;
  patch: Record<string, boolean>;
  fly: { lat: number; lng: number; altitude: number } | null;
  chips: Array<{ key: string; label: string }>;
  source: "rules" | "llm" | "fallback";
};

function toResponse(
  resolved: AskLayersResolved,
  lang: "ko" | "en",
  source: AskLayersResponseBody["source"],
): AskLayersResponseBody {
  const patch: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(resolved.patch)) {
    if (typeof v === "boolean") patch[k] = v;
  }
  return {
    intent: resolved.intent,
    labelKo: resolved.labelKo,
    labelEn: resolved.labelEn,
    reply: lang === "en" ? resolved.replyEn : resolved.replyKo,
    patch,
    fly: resolved.fly,
    chips: resolved.onKeys.slice(0, 12).map((key) => ({
      key: String(key),
      label: askLayersChipLabel(key, lang),
    })),
    source,
  };
}

/**
 * POST /api/ask-layers
 * 질문 → 의도 → 레이어 패치. 규칙은 무료, LLM은 IP당 일 8회.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query : "";
  const lang = body.lang === "en" ? "en" : "ko";
  const mode = body.mode === "economy" ? "economy" : "conflict";
  const normalized = normalizeAskQuery(query);

  if (!normalized || normalized.length > 280) {
    return NextResponse.json(
      {
        intent: null,
        labelKo: "",
        labelEn: "",
        reply:
          lang === "en"
            ? "Type a short question (e.g. Red Sea, Iran, Ukraine)."
            : "짧은 질문을 입력해 주세요. 예: 홍해, 이란, 우크라",
        patch: {},
        fly: null,
        chips: [],
        source: "fallback" as const,
      } satisfies AskLayersResponseBody,
      { status: 400 },
    );
  }

  const cacheKey = `ask-layers:v2:${mode}:${lang}:${normalized}`;
  const cached = getCached<AskLayersResponseBody>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  let ranks: Awaited<ReturnType<typeof loadDailyRanks>> | null = null;
  try {
    ranks = await loadDailyRanks({ date: utcRankDate(), limit: 3 });
  } catch {
    ranks = null;
  }

  const ruleIntent = matchAskLayersIntentByRules(normalized);
  if (ruleIntent) {
    const resolved = resolveAskLayersIntent(ruleIntent, ranks, mode);
    const payload = toResponse(resolved, lang, "rules");
    setCached(cacheKey, payload, CACHE_MS);
    return NextResponse.json(payload);
  }

  // 규칙 미스 → Haiku (한도·키 있을 때만)
  const ip = clientIp(request);
  const apiKey = getServerAnthropicApiKey();
  if (!isApiStubMode() && apiKey && ip && allowServerDay(ip)) {
    const llm = await callClaudeMessages({
      apiKey,
      model: HAIKU_MODEL,
      maxTokens: 64,
      system: askLayersIntentSystemPrompt(),
      user: normalized,
    });
    if (llm.ok) {
      const intent = parseIntentFromLlm(llm.text);
      if (intent) {
        const resolved = resolveAskLayersIntent(intent, ranks, mode);
        const payload = toResponse(resolved, lang, "llm");
        setCached(cacheKey, payload, CACHE_MS);
        return NextResponse.json(payload);
      }
    }
  }

  // fallback: today-hot 또는 안내만
  const resolved = resolveAskLayersIntent("today-hot", ranks, mode);
  const payload = toResponse(resolved, lang, "fallback");
  // 약간 다른 문구 — 의도 불명
  payload.reply =
    lang === "en"
      ? `${payload.reply} (Guessed from “today’s hot zone”. Refine with ≡ layers.)`
      : `${payload.reply} (질문을 특정 전장으로 이해하기 어려워 오늘 핫존으로 맞췄습니다. ≡에서 더 조정하세요.)`;
  setCached(cacheKey, payload, CACHE_MS);
  return NextResponse.json(payload);
}
