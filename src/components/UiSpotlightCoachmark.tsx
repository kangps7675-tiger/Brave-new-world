"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useDialog } from "@/hooks/useDialog";
import { placeNearAnchor, VIEWPORT_EDGE_PAD } from "@/lib/viewportClamp";

export type SpotlightPlacement = "below" | "above";

/** CTA 연타·단계 리마운트 직후 클릭 관통으로 투어가 촤르륵 넘어가는 걸 막음 */
export const COACHMARK_ADVANCE_LOCK_MS = 380;

type UiSpotlightCoachmarkProps = {
  open: boolean;
  targetSelector: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** CTA(다음/완료) — 백드롭·Escape로는 호출되지 않음 */
  onDismiss: () => void;
  /** 전체 설명 스킵 (첫 화면용) */
  skipLabel?: string;
  onSkip?: () => void;
  /** 이전 단계 */
  backLabel?: string;
  onBack?: () => void;
  /** 예: 3 / 10 */
  progressLabel?: string;
  /** 말풍선·화살표가 타겟의 아래(기본) / 위 */
  placement?: SpotlightPlacement;
  accent?: "sky" | "amber" | "emerald" | "rose" | "violet";
};

/**
 * 화면 요소를 가리키는 1회성 표지 + 설명창.
 * 말풍선은 항상 브라우저 뷰포트 안에 남도록 clamp / flip 합니다.
 * 다음 단계는 CTA만 — 배경 클릭·Escape는 스킵(있으면) 또는 무시.
 */
export function UiSpotlightCoachmark({
  open,
  targetSelector,
  title,
  body,
  ctaLabel,
  onDismiss,
  skipLabel,
  onSkip,
  backLabel,
  onBack,
  progressLabel,
  placement = "below",
  accent = "sky",
}: UiSpotlightCoachmarkProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const advanceLockUntilRef = useRef(0);
  /**
   * 전체화면 스포트라이트 — Escape는 「건너뛰기」가 있으면 그쪽만.
   * 없으면 닫지 않음(CTA로만 진행) — Space/Enter로 단계가 연쇄 소모되지 않게.
   */
  const dialogRef = useDialog<HTMLDivElement>({
    open,
    onClose: onSkip,
    closeOnEscape: Boolean(onSkip),
    initialFocus: "[data-coachmark-cta]",
  });
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [bubblePos, setBubblePos] = useState<{
    left: number;
    top: number;
    placement: SpotlightPlacement;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      setBubblePos(null);
      return;
    }
    // 단계가 바뀌거나 다시 열릴 때 — 직전 클릭이 새 CTA/백드롭에 먹지 않게
    advanceLockUntilRef.current = Date.now() + COACHMARK_ADVANCE_LOCK_MS;

    function measure() {
      const el = document.querySelector(targetSelector);
      if (!el) return;
      const nextAnchor = el.getBoundingClientRect();
      setAnchor(nextAnchor);

      const bubble = bubbleRef.current;
      const width = bubble?.offsetWidth || Math.min(300, window.innerWidth - VIEWPORT_EDGE_PAD * 2);
      const height = bubble?.offsetHeight || 160;
      setBubblePos(
        placeNearAnchor({
          anchor: nextAnchor,
          width,
          height,
          preferred: placement,
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
  }, [open, targetSelector, placement, title, body, ctaLabel, skipLabel]);

  function locked(): boolean {
    return Date.now() < advanceLockUntilRef.current;
  }

  function handleAdvance() {
    if (locked()) return;
    advanceLockUntilRef.current = Date.now() + COACHMARK_ADVANCE_LOCK_MS;
    onDismiss();
  }

  function handleSkip() {
    if (!onSkip) return;
    if (locked()) return;
    advanceLockUntilRef.current = Date.now() + COACHMARK_ADVANCE_LOCK_MS;
    onSkip();
  }

  function handleBack() {
    if (!onBack) return;
    if (locked()) return;
    advanceLockUntilRef.current = Date.now() + COACHMARK_ADVANCE_LOCK_MS;
    onBack();
  }

  if (!open || !anchor) return null;

  const cx = anchor.left + anchor.width / 2;
  const resolved = bubblePos?.placement ?? placement;
  const below = resolved === "below";
  const tipY = below ? anchor.bottom + 8 : anchor.top - 8;
  const bubbleLeft = bubblePos?.left ?? VIEWPORT_EDGE_PAD;
  const bubbleTop = bubblePos?.top ?? tipY + 12;
  const arrowEnd = tipY;
  const arrowStart = below
    ? Math.min(bubbleTop + 24, tipY + 80)
    : Math.max(bubbleTop + (bubbleRef.current?.offsetHeight ?? 120) - 24, tipY - 80);

  const tone =
    accent === "emerald"
      ? {
          ring: "border-emerald-300/90",
          text: "text-emerald-100",
          card: "border-emerald-300/30 bg-[#0a1f18]/95 text-emerald-50",
          btn: "border-emerald-300/30 text-emerald-100/90 hover:bg-emerald-400/15",
        }
      : accent === "amber"
        ? {
            ring: "border-amber-300/90",
            text: "text-amber-100",
            card: "border-amber-300/30 bg-[#1a1408]/95 text-amber-50",
            btn: "border-amber-300/30 text-amber-100/90 hover:bg-amber-400/15",
          }
        : accent === "rose"
          ? {
              ring: "border-red-400/90",
              text: "text-red-100",
              card: "border-red-400/35 bg-[#1a0a0e]/96 text-red-50",
              btn: "border-red-400/35 text-red-100/90 hover:bg-red-400/15",
            }
          : accent === "violet"
            ? {
                ring: "border-violet-300/90",
                text: "text-violet-100",
                card: "border-violet-300/35 bg-[#120e18]/96 text-violet-50",
                btn: "border-violet-300/35 text-violet-100/90 hover:bg-violet-400/15",
              }
            : {
                ring: "border-sky-300/90",
                text: "text-sky-200",
                card: "border-sky-300/30 bg-[#0a1830]/95 text-sky-50",
                btn: "border-sky-300/30 text-sky-100/90 hover:bg-sky-400/15",
              };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="pointer-events-auto fixed inset-0 z-[600] outline-none"
      role="dialog"
      aria-modal="true"
    >
      {/* 딤 전용 — 클릭해도 다음으로 가지 않음 (연타·클릭 관통 방지) */}
      <div className="absolute inset-0 bg-transparent" aria-hidden />
      <div
        className={`pointer-events-none absolute rounded-2xl border-2 ${tone.ring} shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]`}
        style={{
          left: anchor.left - 8,
          top: anchor.top - 8,
          width: anchor.width + 16,
          height: anchor.height + 16,
        }}
      />
      <svg
        className={`pointer-events-none absolute overflow-visible ${tone.text}`}
        style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <defs>
          <marker
            id={`coach-arrow-${accent}-${resolved}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        <path
          d={`M ${cx} ${arrowStart} Q ${cx + (below ? -18 : 18)} ${(arrowStart + arrowEnd) / 2} ${cx} ${arrowEnd}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          markerEnd={`url(#coach-arrow-${accent}-${resolved})`}
        />
        <circle cx={cx} cy={arrowStart} r="5" fill="currentColor" opacity="0.85" />
      </svg>
      <div
        ref={bubbleRef}
        className={`pointer-events-auto absolute max-w-[min(88vw,320px)] rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${tone.card}`}
        style={{ left: bubbleLeft, top: bubbleTop }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="text-meta font-semibold uppercase tracking-[0.16em] opacity-70">
          {progressLabel ? `${progressLabel} · ` : ""}
          {title}
        </p>
        <p className="mt-1.5 whitespace-pre-line leading-snug">{body}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {skipLabel && onSkip ? (
              <button
                type="button"
                onClick={handleSkip}
                className={`rounded-full border px-3 py-1 text-xs opacity-80 ${tone.btn}`}
              >
                {skipLabel}
              </button>
            ) : null}
            {backLabel && onBack ? (
              <button
                type="button"
                onClick={handleBack}
                className={`rounded-full border px-3 py-1 text-xs opacity-80 ${tone.btn}`}
              >
                {backLabel}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            data-coachmark-cta
            onClick={handleAdvance}
            className={`rounded-full border px-3 py-1 text-xs ${tone.btn}`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
