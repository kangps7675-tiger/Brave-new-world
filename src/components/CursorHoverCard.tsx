"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { clampBoxToViewport, VIEWPORT_EDGE_PAD } from "@/lib/viewportClamp";

const CURSOR_OFFSET = 14;

type CursorHoverCardProps = {
  visible: boolean;
  x: number;
  y: number;
  title?: string;
  detail?: string;
  badge?: string;
  meta?: string;
  body?: string;
  hint?: string;
  /** 지정 시 기본 타이틀/본문 대신 이 내용만 표시 (물류 스트레스 카드 등) */
  children?: ReactNode;
  className?: string;
};

export function CursorHoverCard({
  visible,
  x,
  y,
  title,
  detail,
  badge,
  meta,
  body,
  hint,
  children,
  className,
}: CursorHoverCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x + CURSOR_OFFSET, top: y + CURSOR_OFFSET });

  useLayoutEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;

    const parent = el.offsetParent as HTMLElement | null;
    const boundsW = parent?.clientWidth ?? window.innerWidth;
    const boundsH = parent?.clientHeight ?? window.innerHeight;
    const cardW = el.offsetWidth;
    const cardH = el.offsetHeight;

    let left = x + CURSOR_OFFSET;
    let top = y + CURSOR_OFFSET;

    if (left + cardW + VIEWPORT_EDGE_PAD > boundsW) {
      left = x - cardW - CURSOR_OFFSET;
    }
    if (top + cardH + VIEWPORT_EDGE_PAD > boundsH) {
      top = y - cardH - CURSOR_OFFSET;
    }

    setPosition(
      clampBoxToViewport(left, top, cardW, cardH, VIEWPORT_EDGE_PAD, {
        width: boundsW,
        height: boundsH,
      }),
    );
  }, [visible, x, y, title, detail, badge, meta, body, hint, children]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className={
        className ??
        "pointer-events-none absolute z-[200] max-w-[min(88vw,340px)] rounded-xl border border-sky-300/25 bg-[#0a1830]/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
      }
      style={{ left: position.left, top: position.top }}
    >
      {children ? (
        children
      ) : (
        <>
          {title ? <p className="font-medium text-sky-100">{title}</p> : null}
          {badge ? (
            <p className="mt-1">
              <span className="inline-flex rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-micro font-medium text-orange-100">
                {badge}
              </span>
            </p>
          ) : null}
          {detail ? (
            <p className={badge ? "mt-1.5 text-sky-100/85" : "mt-1 text-sky-100/85"}>{detail}</p>
          ) : null}
          {body ? <p className="mt-1.5 text-meta leading-4 text-sky-100/70">{body}</p> : null}
          {meta ? <p className="mt-1 text-micro text-sky-200/55">{meta}</p> : null}
          {hint ? <p className="mt-1 text-micro text-sky-200/45">{hint}</p> : null}
        </>
      )}
    </div>
  );
}
