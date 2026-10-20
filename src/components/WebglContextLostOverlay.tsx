"use client";

import { useEffect, useState } from "react";

/**
 * WebGL 컨텍스트 유실 오버레이 (P0-2).
 *
 * 브라우저가 GPU 컨텍스트를 회수하면 지도는 검은 사각형이 된다.
 * 대부분은 `webglcontextrestored`로 수 초 내 자동 복구되므로, 먼저 조용히
 * 기다리다가 **3초가 지나도 안 돌아오면** 그때 재시도 버튼을 준다.
 *
 * 첫 3초에 버튼부터 들이밀면 자동 복구될 상황에서도 사용자가 새로고침을
 * 눌러버린다 — 복구보다 느린 해결책이다.
 */

const RETRY_AFTER_MS = 3_000;

export function WebglContextLostOverlay({ onRetry }: { onRetry: () => void }) {
  const [showRetry, setShowRetry] = useState(false);
  const [lang, setLang] = useState<"ko" | "en">("ko");

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setLang(/^ko/i.test(navigator.language || "") ? "ko" : "en");
    }
    const id = window.setTimeout(() => setShowRetry(true), RETRY_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  const copy =
    lang === "ko"
      ? {
          title: "지도를 다시 불러오는 중",
          body: "그래픽 컨텍스트가 초기화되었습니다. 잠시만 기다려 주세요.",
          slow: "복구가 지연되고 있습니다.",
          retry: "다시 불러오기",
        }
      : {
          title: "Reloading the map",
          body: "The graphics context was reset. Hang tight for a moment.",
          slow: "Recovery is taking longer than expected.",
          retry: "Reload",
        };

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-3 bg-[#04070f]/92 px-6 text-center backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400/25 border-t-sky-300"
      />
      <p className="text-sm font-semibold text-slate-100">{copy.title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-slate-400">
        {showRetry ? copy.slow : copy.body}
      </p>
      {showRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="tap-target mt-1 min-h-[44px] rounded-full border border-sky-300/50 bg-sky-500/20 px-5 py-2 text-sm font-semibold text-sky-50 transition hover:border-sky-200/70 hover:bg-sky-500/30"
        >
          {copy.retry}
        </button>
      ) : null}
    </div>
  );
}
