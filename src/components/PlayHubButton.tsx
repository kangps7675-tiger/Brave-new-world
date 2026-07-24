"use client";

import { useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type PlayKind = "where" | "sense";

type Props = {
  lang: LabelLanguage;
  onPick: (kind: PlayKind) => void;
};

/**
 * 미니게임 진입 — 음소거 FAB 옆 / 모바일 알림 버튼 옆.
 */
export function PlayHubButton({ lang, onPick }: Props) {
  const ko = lang !== "en";
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ko ? "플레이" : "Play"}
        className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/35 bg-slate-950/75 text-[14px] text-amber-100 shadow-sm transition hover:border-amber-300/55"
        title={ko ? "여기 어디게 · 감각 테스트" : "Where-is-it · Sense quiz"}
      >
        ▶
      </button>

      {open ? (
        <div className="absolute bottom-11 right-0 z-[10026] w-56 overflow-hidden rounded-xl border border-amber-400/30 bg-[#0a1220]/96 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPick("where");
            }}
            className="block w-full border-b border-white/10 px-3 py-2.5 text-left transition hover:bg-amber-500/10"
          >
            <span className="block text-[12px] font-semibold text-amber-100">
              {ko ? "여기 어디게" : "Where is this?"}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {ko ? "실제 전장 좌표 · 지구본 돌리기" : "Real theater coords · spin the globe"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPick("sense");
            }}
            className="block w-full px-3 py-2.5 text-left transition hover:bg-violet-500/10"
          >
            <span className="block text-[12px] font-semibold text-violet-100">
              {ko ? "지정학 감각 테스트" : "Geopolitics sense"}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {ko ? "5문제 · 결과 카드 공유" : "5 questions · share your score"}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
