"use client";

import type { ReactNode } from "react";

/**
 * 우측 상황판 패널 공통 말투 — 터미널식 고밀도.
 * 헤더는 작은 대문자 라벨 + 상태 점, 숫자는 전부 등폭(tabular), 구분은 1px 헤어라인.
 * 호박색(amber) 팔레트는 유지한다 (사건·보험료 패널과 같은 계열).
 */
export const DESK_PANEL =
  "pointer-events-auto overflow-hidden rounded-[3px] border border-amber-600/30 bg-[#0d0a06]/94 shadow-lg backdrop-blur-md";
export const DESK_HAIRLINE = "border-amber-600/20";
export const DESK_LABEL =
  "font-mono text-micro font-semibold uppercase tracking-[0.12em] text-amber-200/80";
export const DESK_NUM = "font-mono tabular-nums";

export function LiveDot({ on = true }: { on?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-amber-200/30"}`}
    />
  );
}

export function DeskPanelHeader({
  label,
  right,
  live = false,
}: {
  label: ReactNode;
  right?: ReactNode;
  live?: boolean;
}) {
  return (
    <header className={`flex items-center justify-between gap-2 border-b ${DESK_HAIRLINE} bg-amber-500/[0.06] px-2 py-1`}>
      <h3 className={`flex items-center gap-1.5 ${DESK_LABEL}`}>
        {live ? <LiveDot /> : null}
        {label}
      </h3>
      {right ? <span className={`${DESK_NUM} text-micro text-amber-200/60`}>{right}</span> : null}
    </header>
  );
}
