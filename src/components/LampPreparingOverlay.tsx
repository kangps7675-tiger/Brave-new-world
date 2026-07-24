"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  open: boolean;
  lang: LabelLanguage;
};

/**
 * 등불·주간 회고 양피지가 뜨기 전 —
 * 지도는 그대로 보이고, 옅은 검은 셀로판만 덮인 느낌 + 짧은 안내 문구.
 */
export function LampPreparingOverlay({ open, lang }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open || !visible) return null;

  const title = lang === "en" ? "Loading…" : "로딩 중…";
  const hint =
    lang === "en"
      ? "Today’s lamp briefing is on the way"
      : "오늘의 등불 뉴스를 준비하고 있습니다";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[10020] flex items-end justify-center bg-black/[0.12] pb-[max(5.5rem,env(safe-area-inset-bottom))] transition-opacity duration-300 sm:items-center sm:pb-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="mb-6 px-4 text-center sm:mb-0">
        <p className="text-[13px] font-medium tracking-wide text-white/70 drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
          {title}
        </p>
        <p className="mt-1 max-w-[16rem] text-[11px] leading-relaxed text-white/45 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
          {hint}
        </p>
      </div>
    </div>
  );
}
