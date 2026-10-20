"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { markTourInviteDismissed } from "@/lib/tourInvite";

export {
  markTourInviteDismissed,
  readTourInviteDismissed,
  shouldOfferTourInvite,
} from "@/lib/tourInvite";

type Props = {
  lang: LabelLanguage;
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
};

/**
 * 첫 방문 1회 — 화면 투어 짧은 권유 (수락 / 나중에).
 * 전체 투어는 자동으로 띄우지 않음. localStorage에 기록되면 같은 브라우저는 다시 안 뜸.
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
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[600] mx-auto max-w-md rounded-lg border border-sky-400/35 bg-[#0c1524]/94 px-4 py-3 text-sky-50 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-4 sm:left-auto"
      role="dialog"
      aria-label={en ? "Screen tour invite" : "화면 투어 안내"}
    >
      <p className="text-meta uppercase tracking-[0.18em] text-sky-200/70">
        {en ? "Quick tour · ~30s" : "짧은 둘러보기 · 약 30초"}
      </p>
      <p className="mt-1.5 text-body leading-relaxed text-sky-50/95">
        {en
          ? "New here? A short walkthrough of the globe, three lenses, Ask, and layers. You advance only with Next — nothing auto-flips. Skip anytime; reopen later from Menu → Help."
          : "처음이신가요? 지구본·세 렌즈·묻기·레이어를 짧게 안내합니다. 「다음」을 눌러야만 넘어가고, 혼자 촤르륵 넘어가지 않아요. 지금은 건너뛰고 나중에 메뉴 → 이용 안내에서 다시 볼 수 있습니다."}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded border border-sky-300/45 bg-sky-500/20 px-3 py-1.5 text-caption font-medium text-sky-50 hover:bg-sky-500/30"
        >
          {en ? "Start tour" : "둘러보기"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded border border-slate-500/40 bg-slate-900/50 px-3 py-1.5 text-caption text-slate-200 hover:border-slate-400/50 hover:text-white"
        >
          {en ? "Later" : "나중에"}
        </button>
      </div>
    </div>
  );
}
