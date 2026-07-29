"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { markTheaterCoachmarkDone, readTheaterCoachmarkDone } from "@/lib/battlefieldPresets";
import { canShowNudge } from "@/lib/onboardingBudget";
import { useDialog } from "@/hooks/useDialog";
import { placeNearAnchor, VIEWPORT_EDGE_PAD } from "@/lib/viewportClamp";

type TheaterDropdownCoachmarkProps = {
  open: boolean;
  lang?: "ko" | "en";
  targetSelector?: string;
  onDismiss: () => void;
};

/**
 * 상단 「주요전선」드롭다운을 가리키는 1회성 코치마크.
 * 말풍선은 뷰포트 밖으로 나가지 않도록 clamp 합니다.
 */
export function TheaterDropdownCoachmark({
  open,
  lang = "ko",
  targetSelector = "#exploration-theater-dropdown",
  onDismiss,
}: TheaterDropdownCoachmarkProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [bubblePos, setBubblePos] = useState<{ left: number; top: number; placement: "above" | "below" } | null>(
    null,
  );
  /**
   * 전체화면을 덮는 코치마크인데 키보드로 닫을 방법이 없었다 (P1-7).
   * 훅은 아래 조기 반환(`if (!open || !anchor) return null`)보다 위에 있어야 한다.
   */
  const dialogRef = useDialog<HTMLDivElement>({
    open,
    onClose: () => {
      markTheaterCoachmarkDone();
      onDismiss();
    },
  });

  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      setBubblePos(null);
      return;
    }

    function measure() {
      const el = document.querySelector(targetSelector);
      if (!el) return;
      const nextAnchor = el.getBoundingClientRect();
      setAnchor(nextAnchor);
      const bubble = bubbleRef.current;
      const width = bubble?.offsetWidth || Math.min(280, window.innerWidth - VIEWPORT_EDGE_PAD * 2);
      const height = bubble?.offsetHeight || 120;
      setBubblePos(
        placeNearAnchor({
          anchor: nextAnchor,
          width,
          height,
          preferred: "below",
          gap: 14,
        }),
      );
    }

    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const timer = window.setInterval(measure, 400);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(timer);
    };
  }, [open, targetSelector, lang]);

  if (!open || !anchor) return null;

  const cx = anchor.left + anchor.width / 2;
  const below = (bubblePos?.placement ?? "below") === "below";
  const tipY = below ? anchor.bottom + 8 : anchor.top - 8;
  const bubbleLeft = bubblePos?.left ?? VIEWPORT_EDGE_PAD;
  const bubbleTop = bubblePos?.top ?? tipY + 12;
  const arrowEnd = tipY;
  const arrowStart = below
    ? Math.min(bubbleTop + 24, tipY + 80)
    : Math.max(bubbleTop + (bubbleRef.current?.offsetHeight ?? 100) - 24, tipY - 80);

  const copy =
    lang === "en"
      ? "Tap here to fly into a major front and feel the battlespace."
      : "여기를 누르면 주요 전선으로 이동해 전장을 실감나게 볼 수 있어요.";

  function dismiss() {
    markTheaterCoachmarkDone();
    onDismiss();
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="pointer-events-auto fixed inset-0 z-[600] outline-none"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-transparent"
        aria-label="dismiss"
        onClick={dismiss}
      />
      <div
        className="pointer-events-none absolute rounded-full border-2 border-sky-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
        style={{
          left: anchor.left - 10,
          top: anchor.top - 10,
          width: anchor.width + 20,
          height: anchor.height + 20,
        }}
      />
      <svg
        className="pointer-events-none absolute overflow-visible text-sky-200"
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <defs>
          <marker id="coach-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        <path
          d={`M ${cx} ${arrowStart} Q ${cx + (below ? -18 : 18)} ${(arrowStart + arrowEnd) / 2} ${cx} ${arrowEnd}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          markerEnd="url(#coach-arrow)"
        />
        <circle cx={cx} cy={arrowStart} r="5" fill="currentColor" opacity="0.85" />
      </svg>
      <div
        ref={bubbleRef}
        className="pointer-events-auto absolute max-w-[min(88vw,280px)] rounded-2xl border border-sky-300/30 bg-[#0a1830]/95 px-4 py-3 text-sm text-sky-50 shadow-2xl backdrop-blur-md"
        style={{ left: bubbleLeft, top: bubbleTop }}
      >
        <p className="leading-snug">{copy}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 rounded-full border border-sky-300/30 px-3 py-1 text-xs text-sky-100/90 hover:bg-sky-400/15"
        >
          {lang === "en" ? "Got it" : "확인"}
        </button>
      </div>
    </div>
  );
}

/** 미열람 + 이번 세션 온보딩 예산이 남아 있을 때만 */
export function shouldOfferTheaterCoachmark(): boolean {
  return canShowNudge("theaterCoach", !readTheaterCoachmarkDone());
}
