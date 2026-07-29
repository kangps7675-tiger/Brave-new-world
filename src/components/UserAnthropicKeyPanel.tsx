"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  getUserAnthropicApiKey,
  looksLikeAnthropicApiKey,
  maskAnthropicApiKey,
  setUserAnthropicApiKey,
} from "@/lib/llm/userAnthropicKey";

type ClaudeStatus = {
  stubMode?: boolean;
  serverKeyConfigured?: boolean;
  digestLlmReady?: boolean;
  model?: string;
  userAnalyzeMode?: string;
};

/**
 * 유저 BYOK 키 입력 — 이 기기 localStorage만.
 * 서버 ANTHROPIC_API_KEY(편집 digest)와 분리.
 */
export function UserAnthropicKeyPanel({ compact = false }: { compact?: boolean }) {
  const { lang } = useLocale();
  const [draft, setDraft] = useState("");
  const [savedMasked, setSavedMasked] = useState<string | null>(null);
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refreshSaved = useCallback(() => {
    const key = getUserAnthropicApiKey();
    setSavedMasked(key ? maskAnthropicApiKey(key) : null);
  }, []);

  useEffect(() => {
    refreshSaved();
    void fetch("/api/claude/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ClaudeStatus) => setStatus(data))
      .catch(() => setStatus(null));
  }, [refreshSaved]);

  const save = () => {
    const t = draft.trim();
    if (!t) {
      setUserAnthropicApiKey(null);
      setDraft("");
      refreshSaved();
      setMsg(lang === "en" ? "Key cleared." : "키를 삭제했습니다.");
      return;
    }
    if (!looksLikeAnthropicApiKey(t)) {
      setMsg(
        lang === "en"
          ? "Expected a key starting with sk-ant-…"
          : "sk-ant-… 로 시작하는 Anthropic 키를 넣어 주세요.",
      );
      return;
    }
    setUserAnthropicApiKey(t);
    setDraft("");
    refreshSaved();
    setMsg(lang === "en" ? "Saved on this device only." : "이 기기에만 저장했습니다.");
  };

  const clear = () => {
    setUserAnthropicApiKey(null);
    setDraft("");
    refreshSaved();
    setMsg(lang === "en" ? "Key cleared." : "키를 삭제했습니다.");
  };

  return (
    <div
      className={
        compact
          ? "rounded border border-violet-400/20 bg-violet-950/30 px-3 py-2"
          : "rounded-md border border-violet-400/25 bg-violet-950/40 px-3 py-2.5"
      }
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-meta font-medium text-violet-100/90">
          {lang === "en" ? "Your Anthropic API key (BYOK)" : "본인 Anthropic API 키 (BYOK)"}
        </span>
        <span className="text-micro text-violet-300/60">
          {savedMasked
            ? savedMasked
            : status?.stubMode
              ? lang === "en"
                ? "stub · demo OK"
                : "스텁 · 데모 가능"
              : lang === "en"
                ? "not set"
                : "미설정"}
          {open ? " ▴" : " ▾"}
        </span>
      </button>

      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-micro leading-4 text-violet-200/55">
            {lang === "en"
              ? "User analysis bills your key. Site server key (if any) is for editorial digest only — never for this button."
              : "유저 분석 비용은 본인 키에서만 나갑니다. 사이트 서버 키는 긴급 뉴스 편집용이며 이 버튼에 쓰지 않습니다."}
          </p>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded border border-violet-400/25 bg-black/40 px-2 py-1.5 text-xs text-violet-50 placeholder:text-violet-400/40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded bg-violet-500/80 px-2.5 py-1 text-meta font-medium text-white hover:bg-violet-400"
            >
              {lang === "en" ? "Save" : "저장"}
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded border border-violet-400/30 px-2.5 py-1 text-meta text-violet-200/80 hover:bg-violet-900/40"
            >
              {lang === "en" ? "Clear" : "삭제"}
            </button>
          </div>
          {msg ? <p className="text-micro text-violet-200/70">{msg}</p> : null}
          {status ? (
            <p className="text-micro text-violet-300/45">
              {lang === "en" ? "Server digest LLM: " : "서버 편집 digest: "}
              {status.digestLlmReady
                ? lang === "en"
                  ? "ready"
                  : "준비됨"
                : status.serverKeyConfigured
                  ? lang === "en"
                    ? "key set · enable LLM_NEWS_DIGEST_ENABLED"
                    : "키 있음 · LLM_NEWS_DIGEST_ENABLED 필요"
                  : lang === "en"
                    ? "not configured yet"
                    : "미설정 (키 발급 후 .env)"}
              {status.model ? ` · ${status.model}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
