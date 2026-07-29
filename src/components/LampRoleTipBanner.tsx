"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

const STORAGE_KEY = "cv-lamp-role-tip-v1";

export function shouldOfferLampRoleTip(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markLampRoleTipSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

type Props = {
  lang: LabelLanguage;
  open: boolean;
  onDismiss: () => void;
};

/**
 * 등불 닫은 직후 1회 — 등불 / 공습 칩 / 「왜 중요?」 역할 안내.
 */
export function LampRoleTipBanner({ lang, open, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(t);
  }, [open]);

  const dismiss = useCallback(() => {
    markLampRoleTipSeen();
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  if (!open || !visible) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[120] mx-auto max-w-md rounded-lg border border-[#c4a574]/45 bg-[#1a1510]/92 px-4 py-3 text-[#f3e6c8] shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-4 sm:left-auto"
      role="status"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#d4b896]/7">
        {lang === "en" ? "How to read today" : "오늘 보는 법"}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#f7ecd4]/95">
        {lang === "en"
          ? "Lamp = today's big picture. Live alerts = chips on the right. 「Why it matters」 = short IR context on a story."
          : "등불 = 오늘 큰 그림. 공습·경보 = 오른쪽 칩. 「왜 중요?」 = 그 뉴스의 외교·전장 맥락."}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-2.5 rounded border border-[#c4a574]/4 bg-[#2a2218] px-3 py-1 text-[12px] text-[#f3e6c8] hover:bg-[#3a3024]"
      >
        {lang === "en" ? "Got it" : "알겠어요"}
      </button>
    </div>
  );
}
