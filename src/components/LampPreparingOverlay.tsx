"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  open: boolean;
  lang: LabelLanguage;
};

/**
 * 등불·주간 회고 양피지가 뜨기 전 —
 * 유튜브 버퍼링식: 중앙 원형 스피너 + 하단 indeterminate 바.
 * 지도는 그대로 보이고, 옅은 암막만 덮는다.
 */
export function LampPreparingOverlay({ open, lang }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open || !visible) return null;

  const title = lang === "en" ? "Buffering…" : "버퍼링 중…";
  const hint =
    lang === "en"
      ? "Loading today's lamp photo desk"
      : "오늘의 등불 사진 뉴스를 불러오는 중";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[800] flex flex-col bg-black/25 transition-opacity duration-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        {/* YouTube-style circular buffer spinner */}
        <div className="lamp-yt-spinner" aria-hidden>
          <svg viewBox="0 0 48 48" className="h-12 w-12 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="3.5"
            />
            <circle
              className="lamp-yt-spinner__arc"
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="28 86"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-body font-medium tracking-wide text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
            {title}
          </p>
          <p className="mt-1 max-w-[18rem] text-meta leading-relaxed text-white/50 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
            {hint}
          </p>
        </div>
      </div>

      {/* YouTube-style bottom indeterminate bar */}
      <div
        className="lamp-yt-buffer-track absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/10"
        aria-hidden
      >
        <div className="lamp-yt-buffer-bar h-full w-1/3 bg-[#f1f1f1]" />
      </div>
    </div>
  );
}
