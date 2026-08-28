"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  className?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

/**
 * 우상단 GTI / 물류 스트레스 왼쪽 — 로컬 시각 전자시계
 * (년·월·일 · 시:분:초.밀리초)
 */
export function ImmersionDigitalClock({ lang, className = "" }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      // ~60fps면 과도 — 표시용으로 ~32ms 간격
      if (t - last >= 32) {
        last = t;
        setNow(new Date());
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const y = now.getFullYear();
  const mo = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  const h = pad2(now.getHours());
  const mi = pad2(now.getMinutes());
  const s = pad2(now.getSeconds());
  const ms = pad3(now.getMilliseconds());
  const ko = lang !== "en";

  return (
    <div
      className={`immersion-digital-clock pointer-events-none select-none rounded-lg border border-cyan-300/25 bg-black/70 px-2.5 py-1.5 shadow-lg backdrop-blur-md ${className}`}
      aria-live="off"
      title={ko ? "로컬 시각" : "Local time"}
    >
      <p className="font-data-mono text-micro font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
        {ko ? "LOCAL TIME" : "LOCAL TIME"}
      </p>
      <p className="mt-0.5 font-data-mono text-meta tabular-nums tracking-wide text-cyan-100/85">
        {ko ? `${y}.${mo}.${d}` : `${y}-${mo}-${d}`}
      </p>
      <p className="font-data-mono text-sm font-semibold tabular-nums leading-tight text-cyan-50">
        {h}:{mi}:{s}
        <span className="text-cyan-300/80">.{ms}</span>
      </p>
    </div>
  );
}
