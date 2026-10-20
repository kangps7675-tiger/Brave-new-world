"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { getUserAnthropicApiKey } from "@/lib/llm/userAnthropicKey";

type Props = {
  title: string;
  source?: string | null;
  link?: string | null;
  theater?: string | null;
  excerpt?: string | null;
};

/**
 * 유저 BYOK 분석 버튼 — 서버 Anthropic 잔액 미사용.
 */
export function UserAnalyzeButton({ title, source, link, theater, excerpt }: Props) {
  const { lang } = useLocale();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setText(null);
    setMeta(null);

    const userKey = getUserAnthropicApiKey();
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (userKey) headers["x-anthropic-api-key"] = userKey;

    try {
      const res = await fetch("/api/claude/user-analyze", {
        method: "POST",
        cache: "no-store",
        headers,
        body: JSON.stringify({
          title,
          source,
          link,
          theater,
          excerpt,
          lang,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        text?: string;
        error?: string;
        stub?: boolean;
        billing?: string;
        model?: string;
        needUserKey?: boolean;
      };

      if (!res.ok || data.error) {
        setError(
          data.error ||
            (lang === "en" ? "Analysis failed." : "분석에 실패했습니다."),
        );
        return;
      }

      setText(data.text || null);
      setMeta(
        [
          data.stub ? (lang === "en" ? "stub demo" : "스텁 데모") : null,
          data.billing === "user-byok"
            ? lang === "en"
              ? "billed to your key"
              : "본인 키 과금"
            : null,
          data.model,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : lang === "en" ? "Network error" : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading || !title}
        onClick={() => void run()}
        className="rounded bg-violet-500/90 px-3 py-1.5 text-meta font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-violet-400"
      >
        {loading
          ? lang === "en"
            ? "Analyzing…"
            : "분석 중…"
          : lang === "en"
            ? "Analyze with my key"
            : "내 키로 분석"}
      </button>
      {meta ? <p className="text-micro text-violet-300/55">{meta}</p> : null}
      {error ? <p className="text-meta text-rose-300/90">{error}</p> : null}
      {text ? (
        <pre className="whitespace-pre-wrap rounded border border-violet-400/15 bg-black/25 px-2.5 py-2 text-caption leading-5 text-violet-50/90">
          {text}
        </pre>
      ) : null}
    </div>
  );
}
