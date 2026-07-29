"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  readFirstVisitTourDone,
  TOUR_INVITE_KEY,
} from "@/lib/firstVisitTour";

export function readTourInviteDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TOUR_INVITE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourInviteDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_INVITE_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** 투어 미완료 + 권유 배너 미거절일 때만 */
export function shouldOfferTourInvite(): boolean {
  if (typeof window === "undefined") return false;
  if (readFirstVisitTourDone()) return false;
  return !readTourInviteDismissed();
}

type Props = {
  lang: LabelLanguage;
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
};

/**
 * 등불 접은 직후 1회 — 화면 투어 짧은 권유 (수락 / 나중에).
 * 전체 투어를 자동으로 띄우지 않음.
 */
export function TourInviteBanner({ lang, open, onAccept, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const en = lang === "en";

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 450);
    return () => window.clearTimeout(t);
  }, [open]);

  const dismiss = useCallback(() => {
    markTourInviteDismissed();
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  const accept = useCallback(() => {
    markTourInviteDismissed();
    setVisible(false);
    onAccept();
  }, [onAccept]);

  if (!open || !visible) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[120] mx-auto max-w-md rounded-lg border border-sky-400/35 bg-[#0c1524]/94 px-4 py-3 text-sky-50 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-4 sm:left-auto"
      role="dialog"
      aria-label={en ? "Screen tour invite" : "화면 투어 안내"}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200/70">
        {en ? "Quick tour · ~30s" : "짧은 둘러보기 · 약 30초"}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-sky-50/95">
        {en
          ? "Want a quick walkthrough of the globe, layers, and news sheet? You can skip and open it later from Feature guide."
          : "지구본·레이어·뉴스 시트를 짧게 안내할까요? 지금은 건너뛰고, 나중에 「기능 안내」에서 열 수도 있습니다."}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded border border-sky-300/45 bg-sky-500/20 px-3 py-1.5 text-[12px] font-medium text-sky-50 hover:bg-sky-500/30"
        >
          {en ? "Start tour" : "둘러보기"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded border border-slate-500/40 bg-slate-900/50 px-3 py-1.5 text-[12px] text-slate-200 hover:border-slate-400/50 hover:text-white"
        >
          {en ? "Later" : "나중에"}
        </button>
      </div>
    </div>
  );
}
