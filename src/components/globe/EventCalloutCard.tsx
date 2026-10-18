"use client";

import type { EventCallout } from "@/lib/eventCallout";

type Props = {
  callout: EventCallout;
  onClose: () => void;
};

/**
 * 일반 지도(MapLibre) 사건 콜아웃 — Marker 안에 들어가 좌표에 꼬리 끝이 닿는다.
 * 살짝 기울인 카드 + 겹겹의 그림자 + 바닥에 닿는 링으로 입체감을 준다.
 */
export function EventCalloutCard({ callout, onClose }: Props) {
  return (
    <div
      className="pointer-events-auto relative flex w-[300px] flex-col items-center font-sans"
      style={{ perspective: "700px", transform: "translateY(-2px)" }}
      role="dialog"
      aria-label={callout.title}
    >
      <div
        className="relative w-full rounded-xl border border-orange-300/70 text-left text-slate-100"
        style={{
          background: "linear-gradient(180deg, #1f2b44 0%, #0d1424 100%)",
          transform: "rotateX(14deg)",
          transformOrigin: "50% 100%",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.22) inset, 0 2px 4px rgba(0,0,0,0.5), 0 10px 18px rgba(0,0,0,0.55), 0 22px 40px rgba(0,0,0,0.45)",
        }}
      >
        <span
          aria-hidden
          className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r bg-orange-400"
        />
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm leading-none text-slate-200 hover:bg-white/20"
        >
          ×
        </button>
        <div className="px-3.5 py-3 pr-8">
          <p className="text-[11.5px] font-semibold text-orange-300">
            {callout.meta || callout.source}
          </p>
          <p className="mt-0.5 text-[14.5px] font-bold leading-snug text-slate-50">{callout.title}</p>
          {callout.body ? (
            <p className="mt-1.5 text-[12.5px] leading-[1.45] text-slate-300">{callout.body}</p>
          ) : null}
          <p className="mt-1.5 text-[10.5px] text-slate-400/80">{callout.source}</p>
        </div>
      </div>
      {/* 꼬리 — 좌표 방향 */}
      <div
        aria-hidden
        className="-mt-px h-0 w-0"
        style={{
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "16px solid #0d1424",
          filter: "drop-shadow(0 6px 5px rgba(0,0,0,0.5))",
        }}
      />
      {/* 바닥에 닿는 링 */}
      <div
        aria-hidden
        className="mt-0.5 h-3 w-3 rounded-full border-2 border-white/90 bg-orange-400"
        style={{ boxShadow: "0 0 0 4px rgba(251,146,60,0.28), 0 0 14px rgba(251,146,60,0.7)" }}
      />
    </div>
  );
}
