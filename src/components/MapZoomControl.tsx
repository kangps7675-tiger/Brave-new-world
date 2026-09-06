"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useBasemapTone } from "@/hooks/useBasemapTone";
import { useLocale } from "@/contexts/LocaleContext";
import { clampGlobeAltitude } from "@/lib/globeCamera";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";

const HIDDEN_KEY = "geowatch-zoom-control-hidden";
/** 누르고 있는 동안 초당 altitude 배수 변화 (1보다 작으면 확대, 크면 축소 쪽 속도) */
const HOLD_ZOOM_FACTOR_PER_SEC = 1.18;
const HOLD_TICK_MS = 50;

type MapZoomControlProps = {
  globeRef: RefObject<MapGlobeMethods | null>;
  isCompactUi: boolean;
};

function readHiddenPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHiddenPref(hidden: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * 지도 확대/축소 — 누르고 있는 동안 천천히 연속 줌.
 * 배치는 화면 왼쪽 중간(하단 인텔·우상단 지표·FAB과 겹치지 않게).
 */
export function MapZoomControl({ globeRef, isCompactUi }: MapZoomControlProps) {
  const { lang } = useLocale();
  const light = useBasemapTone() === "light";
  const [hidden, setHidden] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdDirRef = useRef<1 | -1 | null>(null);

  useEffect(() => {
    setHidden(readHiddenPref());
  }, []);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdDirRef.current = null;
  }, []);

  useEffect(() => () => stopHold(), [stopHold]);

  const nudge = useCallback(
    (direction: 1 | -1, dtSec: number) => {
      const methods = globeRef.current;
      const pov = methods?.pointOfView();
      if (!methods || !pov || pov.altitude == null) return;
      const factor = Math.pow(HOLD_ZOOM_FACTOR_PER_SEC, Math.min(0.12, Math.max(0, dtSec)));
      const nextAltitude = clampGlobeAltitude(
        direction > 0 ? pov.altitude / factor : pov.altitude * factor,
      );
      methods.pointOfView({ ...pov, altitude: nextAltitude }, 0);
    },
    [globeRef],
  );

  const startHold = useCallback(
    (direction: 1 | -1) => {
      stopHold();
      holdDirRef.current = direction;
      nudge(direction, HOLD_TICK_MS / 1000);
      holdTimerRef.current = window.setInterval(() => {
        if (holdDirRef.current == null) return;
        nudge(holdDirRef.current, HOLD_TICK_MS / 1000);
      }, HOLD_TICK_MS);
    },
    [nudge, stopHold],
  );

  const toggleHidden = useCallback(() => {
    stopHold();
    setHidden((prev) => {
      const next = !prev;
      writeHiddenPref(next);
      return next;
    });
  }, [stopHold]);

  const skin = light
    ? "bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100"
    : "bg-[#0c1220]/85 text-slate-100 backdrop-blur-md hover:bg-[#141b2c]/90 active:bg-[#0c1220]";
  const containerSkin = light
    ? "border border-slate-300 divide-y divide-slate-200"
    : "border border-white/15 divide-y divide-white/10";

  /** 좌측 세로 중앙 — 하단 스택·우상단 칩·우하단 FAB과 분리 */
  const placeClass = isCompactUi
    ? "left-2 top-[38%] -translate-y-1/2 sm:left-3"
    : "left-3 top-[42%] -translate-y-1/2";

  if (hidden) {
    return (
      <button
        type="button"
        onClick={toggleHidden}
        aria-label={lang === "en" ? "Show zoom controls" : "확대·축소 버튼 표시"}
        title={lang === "en" ? "Show zoom controls" : "확대·축소 버튼 표시"}
        className={`pointer-events-auto absolute z-40 flex h-9 w-9 items-center justify-center rounded-full text-micro font-semibold shadow-md transition ${placeClass} ${skin} border ${
          light ? "border-slate-300" : "border-white/15"
        }`}
      >
        +/−
      </button>
    );
  }

  const holdProps = (direction: 1 | -1) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      startHold(direction);
    },
    onPointerUp: stopHold,
    onPointerCancel: stopHold,
    onPointerLeave: stopHold,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  });

  return (
    <div
      role="group"
      aria-label={lang === "en" ? "Map zoom controls" : "지도 확대·축소"}
      className={`pointer-events-auto absolute z-40 flex w-10 flex-col items-stretch overflow-hidden rounded-lg shadow-md ${placeClass} ${containerSkin}`}
    >
      <button
        type="button"
        aria-label={lang === "en" ? "Zoom in (hold)" : "확대 (길게 누르기)"}
        title={lang === "en" ? "Hold to zoom in" : "길게 눌러 확대"}
        className={`flex h-10 w-10 items-center justify-center text-lg font-semibold transition select-none touch-none ${skin}`}
        {...holdProps(1)}
      >
        +
      </button>
      <button
        type="button"
        aria-label={lang === "en" ? "Zoom out (hold)" : "축소 (길게 누르기)"}
        title={lang === "en" ? "Hold to zoom out" : "길게 눌러 축소"}
        className={`flex h-10 w-10 items-center justify-center text-lg font-semibold transition select-none touch-none ${skin}`}
        {...holdProps(-1)}
      >
        −
      </button>
      <button
        type="button"
        onClick={toggleHidden}
        aria-label={lang === "en" ? "Hide zoom controls" : "확대·축소 버튼 숨기기"}
        title={lang === "en" ? "Hide zoom controls" : "확대·축소 버튼 숨기기"}
        className={`flex h-6 w-10 items-center justify-center text-micro transition active:scale-95 ${skin}`}
      >
        ×
      </button>
    </div>
  );
}
