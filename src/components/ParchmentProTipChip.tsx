"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { placeNearAnchor, VIEWPORT_EDGE_PAD } from "@/lib/viewportClamp";

type ParchmentProTipChipProps = {
  lang: LabelLanguage;
};

const COPY = {
  ko: {
    label: "꿀팁!",
    tips: [
      "F11키 누르면 브라우저 전체화면",
      "장중한 영화 또는 게임 BGM 좋아하시면 같이 들으시면서 즐겨보세요.",
    ],
  },
  en: {
    label: "Tip!",
    tips: [
      "Press F11 for browser fullscreen",
      "If you like solemn movie or game BGM, put some on while you explore.",
    ],
  },
} as const;

/**
 * 우상단 고정 슬롯 — 양피지 천조각 꿀팁, 호버·포커스 시 짧은 드롭다운 (데스크톱만).
 * 드롭다운은 뷰포트 밖으로 나가지 않도록 clamp 합니다.
 */
export function ParchmentProTipChip({ lang }: ParchmentProTipChipProps) {
  const copy = COPY[lang] ?? COPY.ko;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  const dismiss = useCallback(() => setOpen(false), []);

  const updatePosition = useCallback(() => {
    const root = rootRef.current;
    const tip = tipRef.current;
    if (!root) return;
    const anchor = root.getBoundingClientRect();
    const width = tip?.offsetWidth || Math.min(256, window.innerWidth - VIEWPORT_EDGE_PAD * 2);
    const height = tip?.offsetHeight || 88;
    const placed = placeNearAnchor({
      anchor,
      width,
      height,
      preferred: "below",
      gap: 8,
    });
    setCoords({ left: placed.left, top: placed.top });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition, copy.tips]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  return (
    <div
      ref={rootRef}
      className="group/protip relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className="parchment-pro-tip-chip econ-insight-parchment relative flex h-10 min-w-[3.35rem] items-center justify-center px-2.5 text-[0.72rem] font-semibold tracking-[0.08em] text-[#4a3418] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6914]/55"
      >
        <span className="parchment-pro-tip-chip-edge pointer-events-none absolute inset-0" aria-hidden />
        <span className="parchment-pro-tip-chip-thread pointer-events-none absolute inset-0" aria-hidden />
        <span className="relative z-[1]">{copy.label}</span>
      </button>

      <div
        ref={tipRef}
        id={menuId}
        role="tooltip"
        className={`parchment-pro-tip-drop econ-insight-parchment pointer-events-none fixed z-[90] min-w-[12rem] max-w-[min(78vw,18.5rem)] px-3 py-2.5 text-[0.72rem] leading-snug tracking-[0.02em] text-[#4a3418] shadow-[0_10px_28px_rgba(0,0,0,0.42)] transition-all duration-150 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-1 scale-[0.98] opacity-0"
        }`}
        style={
          coords
            ? { left: coords.left, top: coords.top }
            : { left: -9999, top: -9999, visibility: "hidden" }
        }
      >
        <span className="parchment-pro-tip-drop-edge pointer-events-none absolute inset-0" aria-hidden />
        <span className="parchment-pro-tip-drop-thread pointer-events-none absolute inset-0" aria-hidden />
        <ol className="relative z-[1] m-0 list-none space-y-1.5 p-0 font-medium">
          {copy.tips.map((tip, index) => (
            <li key={tip} className="flex gap-1.5">
              <span className="shrink-0 tabular-nums opacity-70">{index + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
