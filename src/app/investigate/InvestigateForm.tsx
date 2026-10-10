"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { brandName } from "@/lib/brand";

type Step = "idle" | "reading" | "extracting" | "saving" | "done";

const STEPS: { id: Step; ko: string }[] = [
  { id: "reading", ko: "기사 읽는 중" },
  { id: "extracting", ko: "어디서·언제 뽑는 중" },
  { id: "saving", ko: "결과 카드 만드는 중" },
];

export function InvestigateForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = step !== "idle" && step !== "done";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!url.trim() && !text.trim()) {
      setError("기사 URL 또는 본문을 넣어 주세요");
      return;
    }
    setError(null);
    setStep("reading");
    const tick = window.setTimeout(() => setStep("extracting"), 700);
    const tick2 = window.setTimeout(() => setStep("saving"), 1600);
    try {
      const res = await fetch("/api/cases/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || undefined,
          text: text.trim() || undefined,
        }),
      });
      const body = (await res.json()) as {
        caseId?: string;
        sharePath?: string;
        error?: string;
        retryAfterSec?: number;
      };
      window.clearTimeout(tick);
      window.clearTimeout(tick2);
      if (!res.ok || !body.caseId) {
        setStep("idle");
        setError(body.error || "조사에 실패했습니다");
        return;
      }
      setStep("done");
      router.push(
        `${body.sharePath ?? `/case/${body.caseId}`}?from=investigate`,
      );
    } catch (err) {
      window.clearTimeout(tick);
      window.clearTimeout(tick2);
      setStep("idle");
      setError(err instanceof Error ? err.message : "네트워크 오류");
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5">
      <label className="block">
        <span className="text-sm font-medium text-slate-200">기사 URL</span>
        <input
          type="url"
          inputMode="url"
          autoComplete="url"
          value={url}
          disabled={busy}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="mt-1.5 w-full rounded-md border border-white/15 bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/30 focus:border-rose-400/50 focus:outline-none focus:ring-1 focus:ring-rose-400/30 disabled:opacity-50"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-200">
          또는 본문 붙여넣기
        </span>
        <textarea
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="속보·기사 본문을 그대로 붙여 넣으세요"
          className="mt-1.5 w-full resize-y rounded-md border border-white/15 bg-black/40 px-3 py-3 text-base leading-relaxed text-white placeholder:text-white/30 focus:border-rose-400/50 focus:outline-none focus:ring-1 focus:ring-rose-400/30 disabled:opacity-50"
        />
      </label>

      {busy ? (
        <ol className="flex flex-col gap-2 rounded-md border border-white/10 bg-black/35 px-3 py-3">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done =
              (step === "extracting" && s.id === "reading") ||
              (step === "saving" && (s.id === "reading" || s.id === "extracting")) ||
              step === "done";
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 text-sm ${
                  active
                    ? "text-rose-100"
                    : done
                      ? "text-emerald-200/80"
                      : "text-white/35"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    active
                      ? "animate-pulse bg-rose-300"
                      : done
                        ? "bg-emerald-300"
                        : "bg-white/25"
                  }`}
                />
                {s.ko}
              </li>
            );
          })}
        </ol>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-400/35 bg-rose-950/40 px-3 py-2 text-sm text-rose-100" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="min-h-[48px] rounded-md border border-rose-400/50 bg-rose-500/25 px-4 py-3 text-base font-semibold text-rose-50 transition hover:bg-rose-500/35 disabled:cursor-wait disabled:opacity-55"
      >
        {busy ? "조사 중…" : "지도로 확인하기"}
      </button>

      <p className="text-sm leading-relaxed text-slate-400">
        {brandName("ko")}는 기사를 사실로 단정하지 않습니다. 장소·시각을 뽑고,
        지도 근거가 있으면 확인·일부 확인으로 나눕니다. 근거가 없으면{" "}
        <strong className="font-medium text-slate-300">확인 못 함</strong>으로
        남깁니다.
      </p>

      <p className="text-sm text-slate-500">
        이미 있는 결과 링크가 있으면{" "}
        <Link href="/" className="text-rose-200/80 underline underline-offset-2">
          지구본으로
        </Link>
        돌아가 사건을 이어서 볼 수 있습니다.
      </p>
    </form>
  );
}
