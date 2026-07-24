"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#02040a] px-6 text-center"
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/60">멋진 신세계</p>
      <h1 className="text-lg font-semibold text-slate-50">일시적인 오류가 발생했습니다</h1>
      <p className="max-w-md text-sm leading-6 text-slate-400">
        {error.message || "페이지를 다시 불러와 주세요."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl border border-sky-300/30 bg-sky-950/50 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-200/50"
      >
        다시 시도
      </button>
    </div>
  );
}
