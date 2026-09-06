"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { useBasemapTone } from "@/hooks/useBasemapTone";
import { useLocale } from "@/contexts/LocaleContext";
import { clampGlobeAltitude } from "@/lib/globeCamera";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";

const HIDDEN_KEY = "geowatch-zoom-control-hidden";
/** 클릭 1회당 altitude를 이 배수만큼 줄이거나(확대) 곱하거나(축소) 한다 */
const ZOOM_STEP_FACTOR = 1.6;
const ANIMATE_MS = 260;

type MapZoomControlProps = {
  globeRef: RefObject<MapGlobeMethods | null>;
  /**
   * 데스크톱에서는 좌하단이 일일브리핑 크롬(cv-chrome-daily-bottom)에 자주 점유되고,
   * 컴팩트(모바일/태블릿)에서는 우하단이 FAB 스택(cv-chrome-fab-bottom)에 자주 점유된다.
   * 그래서 항상 "덜 붐비는 쪽"에 붙인다 — 데스크톱은 우측, 컴팩트는 좌측.
   */
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
    /* localStorage 접근 불가 — 세션 내 상태만 유지 */
  }
}

/**
 * 지도 확대/축소 버튼 — 마우스 스크롤·트랙패드 핀치 없이도(터치·마우스 미보유 환경)
 * 지도를 조절할 수 있게 하는 상시 버튼.
 *
 * 배치: 하단 모서리, 다른 크롬이 쓰는 것과 똑같은 --bottom-intel-stack-clearance
 * 기준(cv-chrome-fab-bottom)으로 붙여서 하단 티커/인텔 스택과는 절대 안 겹치게 하고,
 * 좌/우는 isCompactUi에 따라 "그 모드에서 덜 붐비는 쪽"으로 바꾼다
 * (데스크톱: 좌하단은 일일브리핑 크롬이 자주 씀 → 우측 / 컴팩트: 우하단은 FAB 스택이 자주 씀 → 좌측).
 * 남는 예외 하나: 데스크톱에서 실시간 중계(liveBriefingSession) 중엔 우하단 FAB도 뜨는데,
 * 그 상태 플래그까지는 안 받아왔으니 그 조합만큼은 겹칠 수 있음 — 필요하면 그 플래그도 넘겨서
 * 추가로 숨기면 된다.
 *
 * 숨김 상태는 localStorage(geowatch-zoom-control-hidden)에 저장되어 새로고침 후에도 유지된다.
 */
export function MapZoomControl({ globeRef, isCompactUi }: MapZoomControlProps) {
  const { lang } = useLocale();
  const light = useBasemapTone() === "light";
  const [hidden, setHidden] = useState(false);
  const sideClass = isCompactUi ? "left-2 sm:left-3" : "right-2 sm:right-3";

  // SSR 하이드레이션 불일치 방지 — 마운트 후에만 저장된 숨김 상태 반영
  useEffect(() => {
    setHidden(readHiddenPref());
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      const methods = globeRef.current;
      const pov = methods?.pointOfView();
      if (!methods || !pov || pov.altitude == null) return;
      const nextAltitude = clampGlobeAltitude(
        direction > 0 ? pov.altitude / ZOOM_STEP_FACTOR : pov.altitude * ZOOM_STEP_FACTOR,
      );
      methods.pointOfView({ ...pov, altitude: nextAltitude }, ANIMATE_MS);
    },
    [globeRef],
  );

  const toggleHidden = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      writeHiddenPref(next);
      return next;
    });
  }, []);

  const skin = light
    ? "bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100"
    : "bg-[#0c1220]/85 text-slate-100 backdrop-blur-md hover:bg-[#141b2c]/90 active:bg-[#0c1220]";
  const containerSkin = light
    ? "border border-slate-300 divide-y divide-slate-200"
    : "border border-white/15 divide-y divide-white/10";

  if (hidden) {
    return (
      <button
        type="button"
        onClick={toggleHidden}
        aria-label={lang === "en" ? "Show zoom controls" : "확대·축소 버튼 표시"}
        title={lang === "en" ? "Show zoom controls" : "확대·축소 버튼 표시"}
        className={`cv-chrome-fab-bottom pointer-events-auto absolute z-40 flex h-9 w-9 items-center justify-center rounded-full text-micro font-semibold shadow-md transition ${sideClass} ${skin} border ${
          light ? "border-slate-300" : "border-white/15"
        }`}
      >
        +/−
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={lang === "en" ? "Map zoom controls" : "지도 확대·축소"}
      className={`cv-chrome-fab-bottom pointer-events-auto absolute z-40 flex w-10 flex-col items-stretch overflow-hidden rounded-lg shadow-md ${sideClass} ${containerSkin}`}
    >
      <button
        type="button"
        onClick={() => step(1)}
        aria-label={lang === "en" ? "Zoom in" : "확대"}
        title={lang === "en" ? "Zoom in" : "확대"}
        className={`flex h-10 w-10 items-center justify-center text-lg font-semibold transition active:scale-95 ${skin}`}
      >
        +
      </button>
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label={lang === "en" ? "Zoom out" : "축소"}
        title={lang === "en" ? "Zoom out" : "축소"}
        className={`flex h-10 w-10 items-center justify-center text-lg font-semibold transition active:scale-95 ${skin}`}
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
