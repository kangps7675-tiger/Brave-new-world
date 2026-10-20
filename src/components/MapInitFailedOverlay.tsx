"use client";

import { useEffect, useState } from "react";

/**
 * 지도 초기화 실패 오버레이 (2026-08-31, 리포트 2번).
 *
 * `WebglContextLostOverlay`와 다른 상황: 저건 "한 번 잘 뜬 지도"가 GPU
 * 리셋으로 잠깐 꺼진 뒤 대개 자동 복구되는 경우고, 이건 지도가 **애초에
 * 한 번도 뜬 적이 없는** 경우다 — WebGL 컨텍스트 생성 자체 실패
 * (`webglcontextcreationerror`), 초기 로드 중 치명적 오류(`onError`),
 * 혹은 둘 다 조용히 안 뜨는 타임아웃. 자동 복구를 기대할 수 없으므로
 * 처음부터 재시도 버튼을 보여준다.
 *
 * 이전에는 이 세 경우 전부 "지도만 완전히 빈 화면, 안내 없음"이었다.
 */
export function MapInitFailedOverlay({ onRetry }: { onRetry: () => void }) {
  const [lang, setLang] = useState<"ko" | "en">("ko");

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setLang(/^ko/i.test(navigator.language || "") ? "ko" : "en");
    }
  }, []);

  const copy =
    lang === "ko"
      ? {
          title: "지도를 불러오지 못했습니다",
          body: "그래픽(WebGL) 초기화에 실패했습니다. 브라우저를 최신 버전으로 업데이트하거나 다른 브라우저에서 시도해보세요.",
          retry: "다시 시도",
        }
      : {
          title: "The map failed to load",
          body: "Graphics (WebGL) initialization failed. Try updating your browser, or use a different one.",
          retry: "Retry",
        };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-3 bg-[#04070f]/92 px-6 text-center backdrop-blur-sm"
    >
      <p className="text-sm font-semibold text-slate-100">{copy.title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-slate-400">{copy.body}</p>
      <button
        type="button"
        onClick={onRetry}
        className="tap-target mt-1 min-h-[44px] rounded-full border border-sky-300/50 bg-sky-500/20 px-5 py-2 text-sm font-semibold text-sky-50 transition hover:border-sky-200/70 hover:bg-sky-500/30"
      >
        {copy.retry}
      </button>
    </div>
  );
}
