/**
 * Anthropic 공식 SDK 기반 Messages API 얇은 클라이언트.
 * 키는 호출자가 주입 — 서버 키 또는 유저 BYOK (요청 헤더로만 전달, 저장 금지).
 */

import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicModel } from "@/lib/llm/anthropicEnv";

export type ClaudeTextResult = {
  ok: true;
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ClaudeErrorResult = {
  ok: false;
  status: number;
  error: string;
  /** 잔액·쿼터 소진 추정 */
  insufficientFunds?: boolean;
  rateLimited?: boolean;
};

export type ClaudeResult = ClaudeTextResult | ClaudeErrorResult;

export async function callClaudeMessages(options: {
  apiKey: string;
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<ClaudeResult> {
  const model = options.model || getAnthropicModel();
  const maxTokens = options.maxTokens ?? 1024;

  let message: Anthropic.Message;
  try {
    const anthropic = new Anthropic({
      apiKey: options.apiKey,
      maxRetries: 1,
      timeout: 25_000,
    });
    message = await anthropic.messages.create(
      {
        model,
        max_tokens: maxTokens,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      },
      { signal: options.signal },
    );
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? (error.status ?? 0) : 0;
    const errorMessage =
      error instanceof Error ? error.message : "Anthropic 네트워크 오류";
    const lower = errorMessage.toLowerCase();
    return {
      ok: false,
      status,
      error: errorMessage,
      rateLimited: status === 429,
      insufficientFunds:
        status === 402 ||
        /insufficient|credit|billing|balance|funds/i.test(lower),
    };
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    return { ok: false, status: 502, error: "빈 응답" };
  }

  return {
    ok: true,
    text,
    model: message.model || model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
