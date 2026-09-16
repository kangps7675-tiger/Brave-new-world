"use client";

import { useState, type ReactNode } from "react";
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
};

/**
 * 화면 좌·우 끝 호버 서랍.
 * 커서를 올리면 나오고, 밖으로 옮기면 들어간다.
 */
export function HoverSideDrawer({
  side,
  children,
  peepLabel,
  forceOpen = false,
  className = "",
  top = "max(0.55rem, env(safe-area-inset-top, 0px))",
  zIndexClass = zc("nav"),
}: HoverSideDrawerProps) {
  const [hovered, setHovered] = useState(false);
  const open = hovered || forceOpen;
  const isLeft = side === "left";

  return (
    <div
      className={`pointer-events-none fixed ${zIndexClass} flex ${
        isLeft ? "left-0 flex-row" : "right-0 flex-row-reverse"
      } items-start ${className}`}
      style={{
        top,
        bottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        [isLeft ? "paddingLeft" : "paddingRight"]:
          "max(0.15rem, env(safe-area-inset-" + (isLeft ? "left" : "right") + ", 0px))",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
    >
      {/* 엣지 hit-strip — 접혀 있어도 잡힘 */}
      <div
        className="pointer-events-auto w-3 shrink-0 self-stretch min-h-[12rem]"
        aria-hidden
      />

      <div className="relative flex min-h-0 flex-col items-stretch">
        {/* 접힘 peep 탭 */}
        {peepLabel ? (
          <div
            className={`pointer-events-auto absolute top-1 transition-all duration-250 ease-out ${
              isLeft ? "left-0" : "right-0"
            } ${
              open
                ? "pointer-events-none -translate-y-1 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <div
              className={`rounded-full border border-sky-200/25 bg-[#0a1428]/55 px-1.5 py-2 text-micro font-medium tracking-wide text-sky-100/80 shadow-md backdrop-blur-sm transition-all duration-200 ease-out ${
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
            open
              ? "translate-x-0 opacity-100"
              : isLeft
                ? "pointer-events-none -translate-x-[110%] opacity-0"
                : "pointer-events-none translate-x-[110%] opacity-0"
          }`}
          aria-hidden={!open}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
