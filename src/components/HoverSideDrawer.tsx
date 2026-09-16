"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { zc } from "@/lib/uiStack";

type HoverSideDrawerProps = {
  side: "left" | "right";
  children: ReactNode;
  /** 접힌 상태에도 보이는 얇은 탭 라벨 */
  peepLabel?: string;
  /** 설명 패널 등 — 열린 동안 서랍 유지 */
  forceOpen?: boolean;
  className?: string;
  /** 상단 오프셋 (safe-area 포함 권장) */
  top?: string;
  zIndexClass?: string;
  /** 포인터가 떠난 뒤 닫히기까지 지연(ms) — 패널·버튼으로 이동할 여유 */
  closeDelayMs?: number;
};

/**
 * 화면 좌·우 **끝 전체** 호버 서랍.
 * - 세로 전체 엣지 hit-strip으로 연다
 * - 열린 패널 위에 마우스가 있으면 유지
 * - 완전히 떠난 뒤에만 closeDelay 후 닫힌다 (즉시 들어가지 않음)
 */
export function HoverSideDrawer({
  side,
  children,
  peepLabel,
  forceOpen = false,
  className = "",
  top = "0px",
  zIndexClass = zc("nav"),
  closeDelayMs = 380,
}: HoverSideDrawerProps) {
  const [hovered, setHovered] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const open = hovered || forceOpen;
  const isLeft = side === "left";

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearCloseTimer();
    setHovered(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    if (forceOpen) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      closeTimerRef.current = null;
    }, closeDelayMs);
  }, [clearCloseTimer, closeDelayMs, forceOpen]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  return (
    <div
      className={`pointer-events-none fixed inset-y-0 ${zIndexClass} flex ${
        isLeft ? "left-0 flex-row" : "right-0 flex-row-reverse"
      } items-stretch ${className}`}
      style={{
        top,
        bottom: 0,
        [isLeft ? "paddingLeft" : "paddingRight"]:
          "max(0px, env(safe-area-inset-" + (isLeft ? "left" : "right") + ", 0px))",
      }}
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onFocusCapture={openNow}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
    >
      {/* 세로 전체 엣지 hit-strip — 접혀 있어도 잡힘 */}
      <div
        className="pointer-events-auto w-3 shrink-0 self-stretch sm:w-3.5"
        aria-hidden
      />

      <div
        className="relative flex min-h-0 flex-1 flex-col items-stretch py-[max(0.55rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        onMouseEnter={openNow}
      >
        {peepLabel ? (
          <div
            className={`pointer-events-auto absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] transition-all duration-250 ease-out ${
              isLeft ? "left-0" : "right-0"
            } ${
              open
                ? "pointer-events-none -translate-y-1 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div
              className={`rounded-full border border-sky-200/25 bg-[#0a1428]/55 px-1.5 py-2 text-micro font-medium tracking-wide text-sky-100/80 shadow-md backdrop-blur-sm ${
                isLeft ? "rounded-l-none" : "rounded-r-none"
              }`}
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              aria-hidden
            >
              {peepLabel}
            </div>
          </div>
        ) : null}

        <div
          className={`pointer-events-auto flex min-h-0 max-h-full flex-col gap-2 overflow-y-auto overscroll-contain transition-all duration-300 ease-out ${
            isLeft ? "items-start" : "items-end"
          } ${
            open
              ? "translate-x-0 opacity-100"
              : isLeft
                ? "pointer-events-none -translate-x-[110%] opacity-0"
                : "pointer-events-none translate-x-[110%] opacity-0"
          }`}
          aria-hidden={!open}
          onMouseEnter={openNow}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
