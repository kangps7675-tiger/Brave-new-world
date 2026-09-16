"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  className?: string;
  /**
   * top — 상단 중앙 스트립용 한 줄 (레이어 버튼 위).
   * stack — 우측 지표 스택용 블록 (레거시; 기본은 top).
   */
  variant?: "top" | "stack";
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

/**
 * 로컬 시각 전자시계.
 * 상단 중앙(레이어 위) 고정용 `top`이 기본 — 지표 호버 서랍과 분리.
 */
export function ImmersionDigitalClock({
  lang,
  className = "",
  variant = "top",
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      // 표시용 ~32ms — 밀리초 자릿수만 보이면 충분
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
  const dateStr = ko ? `${y}.${mo}.${d}` : `${y}-${mo}-${d}`;

  if (variant === "top") {
    return (
      <div
        className={`immersion-digital-clock pointer-events-none select-none ${className}`}
        aria-live="off"
        title={ko ? "로컬 시각" : "Local time"}
      >
        <p className="font-data-mono text-center text-micro tabular-nums tracking-wide text-cyan-100/80">
          <span className="text-cyan-200/55">{dateStr}</span>
          <span className="mx-1.5 text-cyan-300/35" aria-hidden>
            ·
          </span>
          <span className="font-semibold text-cyan-50">
            {h}:{mi}:{s}
            <span className="text-cyan-300/70">.{ms}</span>
          </span>
        </p>
      </div>
    );
  }

  return (
    <div
      className={`immersion-digital-clock pointer-events-none select-none rounded-lg border border-cyan-300/25 bg-black/70 px-2.5 py-1.5 shadow-lg backdrop-blur-md ${className}`}
      aria-live="off"
      title={ko ? "로컬 시각" : "Local time"}
    >
      <p className="font-data-mono text-micro font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
        LOCAL TIME
      </p>
      <p className="mt-0.5 font-data-mono text-meta tabular-nums tracking-wide text-cyan-100/85">
        {dateStr}
      </p>
      <p className="font-data-mono text-sm font-semibold tabular-nums leading-tight text-cyan-50">
        {h}:{mi}:{s}
        <span className="text-cyan-300/80">.{ms}</span>
      </p>
    </div>
  );
}
