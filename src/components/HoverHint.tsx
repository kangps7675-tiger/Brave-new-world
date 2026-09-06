"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { collectChromeObstacles, placeNearAnchor, VIEWPORT_EDGE_PAD } from "@/lib/viewportClamp";

type HoverHintProps = {
  title: string;
  detail?: string;
  /** 툴팁이 버튼 기준 어디에 뜰지 */
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
  /**
   * true면 터치에서 탭으로 툴팁 pin.
   * FAB·액션 버튼은 기본 false — 탭 한 번에 액션+툴팁이 겹치지 않게 함.
   */
  pinOnTouch?: boolean;
  children: ReactElement;
};

/**
 * 버튼 호버 설명. fixed 좌표 + 뷰포트 clamp로 화면 밖으로 나가지 않음.
 */
export function HoverHint({
  title,
  detail,
  placement = "top",
  className = "",
  pinOnTouch = false,
  children,
}: HoverHintProps) {
  const { t } = useLocale();
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  const open = pinned || hovered;

  const dismiss = useCallback(() => setPinned(false), []);

  const updatePosition = useCallback(() => {
    const root = rootRef.current;
    const tip = tipRef.current;
    if (!root) return;
    const anchor = root.getBoundingClientRect();
    const width = tip?.offsetWidth || Math.min(300, window.innerWidth - VIEWPORT_EDGE_PAD * 2);
    const height = tip?.offsetHeight || 64;
    const preferred =
      placement === "top" || placement === "left"
        ? "above"
        : "below";
    const placed = placeNearAnchor({
      anchor,
      width,
      height,
      preferred,
      gap: 8,
      obstacles: collectChromeObstacles(root),
    });
    setCoords({ left: placed.left, top: placed.top });
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, title, detail]);

  useEffect(() => {
    if (!pinned) return;
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
  }, [pinned, dismiss]);

  const visibleClass = open
    ? "scale-100 opacity-100"
    : "scale-[0.97] opacity-0 pointer-events-none";

  const child = cloneElement(children, {
    "aria-describedby": open ? tooltipId : children.props["aria-describedby"],
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
    },
    onPointerUp: (event: React.PointerEvent) => {
      children.props.onPointerUp?.(event);
      if (pinOnTouch && event.pointerType === "touch") {
        setPinned((prev) => !prev);
      }
    },
  });

  return (
    <span
      ref={rootRef}
      className={`group/hint relative inline-flex max-w-full ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) {
          setHovered(false);
        }
      }}
    >
      {child}
      <span
        ref={tipRef}
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none fixed z-[300] w-max max-w-[min(88vw,300px)] whitespace-normal rounded-xl border border-sky-300/30 bg-[#0a1830]/96 px-3 py-2 text-left shadow-2xl backdrop-blur-md transition-all duration-150 ${visibleClass}`}
        style={
          coords
            ? { left: coords.left, top: coords.top }
            : { left: -9999, top: -9999, visibility: "hidden" as const }
        }
      >
        <span className="block text-xs font-semibold leading-snug text-sky-50">{title}</span>
        {detail ? (
          <span className="mt-1 block text-meta leading-5 text-sky-100/78">{detail}</span>
        ) : null}
        {pinOnTouch ? (
          <span className="mt-1.5 block text-micro text-sky-200/45 sm:hidden">{t("hoverTapToPin")}</span>
        ) : null}
      </span>
    </span>
  );
}
