"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { openHubCount } from "@/lib/marketSessions";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type Props = {
  lang: LabelLanguage;
  className?: string;
};

/** 세션 N/6 개장 — 1분 갱신 */
export function MarketSessionChip({ lang, className = "" }: Props) {
  const ko = lang !== "en";
  const [count, setCount] = useState(() => openHubCount());

  useEffect(() => {
    const tick = () => setCount(openHubCount());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const light = useBasemapTone() === "light";

  return (
    <div
      className={`market-session-chip tone-chip rounded-lg border border-teal-400/30 bg-[#06141a]/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md ${className}`}
      title={ko ? "6대 금융허브 정규장" : "6 major market sessions"}
    >
      <p
        className={`text-micro font-semibold uppercase tracking-wider ${
          light ? "text-teal-800" : "text-teal-200/85"
        }`}
      >
        {ko ? "세션" : "Sessions"}
      </p>
      <p
        className={`mt-0.5 font-mono text-caption font-semibold tabular-nums ${
          light ? "text-teal-900" : "text-teal-100"
        }`}
      >
        {count.open}
        <span className={`text-micro font-normal ${light ? "text-slate-600" : "text-slate-500"}`}>
          /{count.total}
        </span>{" "}
        <span className={`text-micro font-medium ${light ? "text-slate-600" : "text-slate-400"}`}>
          {ko ? "개장" : "open"}
        </span>
      </p>
    </div>
  );
}
