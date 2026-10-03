"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { zc } from "@/lib/uiStack";

type HoverSideDrawerProps = {
  side: "left" | "right";
  children: ReactNode;
  /** 접힌 상태에도 보이는 얇은 탭 라벨 */
  peepLabel?: string;
  /** 투어·테스트용 — peep 래퍼에 붙는 id */
  peepId?: string;
  /** 설명 패널 등 — 열린 동안 서랍 유지 */
  forceOpen?: boolean;
  className?: string;
  /** 상단 오프셋 (safe-area 포함 권장) */
  top?: string;
  /**
   * 접힌(peep) 상태 z. 기본 nav.
   * 열린 때는 항상 panel — 상단 HoverNav·드롭다운 위를 덮는다.
   */
  zIndexClass?: string;
  /** 포인터가 떠난 뒤 닫히기까지 지연(ms) — 패널·버튼으로 이동할 여유 */
  closeDelayMs?: number;
};

/** 접힌 상태 엣지 hit 폭 — 너무 넓으면 지도 조작을 가로챔 */
const PEEP_HIT_PX = 14;

/**
 * 화면 좌·우 엣지 호버 서랍.
 *
 * 중요: open/close 때 sibling끼리 pointer-events를 바꾸면, 마우스가 가만히 있어도
 * enter↔leave가 반복되며 깜빡인다. **하나의 pointer-events-auto 셸**만 enter/leave를
 * 받고, 패널은 overflow로 접는다.
 */
export function HoverSideDrawer({
  side,
  children,
  peepLabel,
  peepId,
  forceOpen = false,
  className = "",
  top = "0px",
  zIndexClass = zc("nav"),
  closeDelayMs = 480,
}: HoverSideDrawerProps) {
  const [hovered, setHovered] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openAnimLockRef = useRef(false);
  const open = hovered || forceOpen;
  const isLeft = side === "left";
  /** 열림: nav(300)·navMenu(400) 위. 접힘: peep만 엣지에 */
  const stackClass = open ? zc("panel") : zIndexClass;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearCloseTimer();
    setHovered(true);
    // 열림 애니 직후 leave 스퓨리어스 무시
    openAnimLockRef.current = true;
    window.setTimeout(() => {
      openAnimLockRef.current = false;
    }, 320);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    if (forceOpen) return;
    if (openAnimLockRef.current) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      closeTimerRef.current = null;
    }, closeDelayMs);
  }, [clearCloseTimer, closeDelayMs, forceOpen]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (forceOpen) {
      clearCloseTimer();
      setHovered(true);
    }
  }, [forceOpen, clearCloseTimer]);

  return (
    <div
      className={`pointer-events-none fixed inset-y-0 ${stackClass} ${
        isLeft ? "left-0" : "right-0"
      } ${className}`}
      style={{
        top,
        bottom: 0,
        [isLeft ? "paddingLeft" : "paddingRight"]:
          "max(0px, env(safe-area-inset-" + (isLeft ? "left" : "right") + ", 0px))",
      }}
      data-hover-side-drawer={side}
      data-open={open ? "1" : "0"}
    >
      {/*
        유일한 hover 셸 — 폭만 접고 펼친다.
        자식끼리 pointer-events를 토글하지 않는다.
      */}
      <div
        className={`pointer-events-auto absolute inset-y-0 flex flex-col overflow-hidden transition-[width] duration-300 ease-out ${
          isLeft ? "left-0 items-start" : "right-0 items-end"
        }`}
        style={{
          width: open ? "min(22rem, calc(100vw - 1.25rem))" : `${PEEP_HIT_PX}px`,
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
        {peepLabel ? (
          <div
            id={peepId}
            className={`absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[1] transition-opacity duration-200 ${
              isLeft ? "left-0" : "right-0"
            } ${open ? "pointer-events-none opacity-0" : "opacity-100"}`}
            aria-hidden={open}
          >
            <div
              className={`rounded-full border border-sky-200/25 bg-[#0a1428]/55 px-1.5 py-2 text-micro font-medium tracking-wide text-sky-100/80 shadow-md backdrop-blur-sm ${
                isLeft ? "rounded-l-none" : "rounded-r-none"
              }`}
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {peepLabel}
            </div>
          </div>
        ) : null}

        <div
          className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain py-[max(0.55rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] transition-[opacity,transform] duration-300 ease-out ${
            isLeft ? "items-start pl-0.5" : "items-end pr-0.5"
          } ${
            open
              ? "translate-x-0 opacity-100"
              : isLeft
                ? "-translate-x-2 opacity-0"
                : "translate-x-2 opacity-0"
          }`}
          aria-hidden={!open}
        >
          {/*
            접힌 동안에도 children은 마운트 유지(포털 슬롯 id).
            폭이 PEEP_HIT_PX로 잘려 보이지 않음.
          */}
          {children}
        </div>
      </div>
    </div>
  );
}
