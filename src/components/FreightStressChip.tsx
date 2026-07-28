"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { FreightIndex } from "@/components/FinintTicker";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type Props = {
  lang: LabelLanguage;
  className?: string;
};

/**
 * 해운 프록시(BDRY) — 전일 대비 %. "BDI" 표기 금지.
 */
export function FreightStressChip({ lang, className = "" }: Props) {
  const ko = lang !== "en";
  const [item, setItem] = useState<FreightIndex | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/freight-indices", { cache: "no-store" });
        if (!res.ok) throw new Error("freight");
        const payload = (await res.json()) as { indices?: FreightIndex[] };
        const bdry = (payload.indices ?? []).find((i) => i.symbol === "BDRY");
        if (!cancelled) {
          setItem(bdry ?? null);
          setError(!bdry);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const light = useBasemapTone() === "light";
  const pct = item?.changePercent;
  const tone =
    pct == null
      ? light
        ? "text-slate-600"
        : "text-slate-400"
      : pct > 0.5
        ? light
          ? "text-rose-700"
          : "text-rose-300"
        : pct < -0.5
          ? light
            ? "text-emerald-700"
            : "text-emerald-300"
          : light
            ? "text-slate-700"
            : "text-slate-300";

  return (
    <div
      className={`freight-stress-chip tone-chip rounded-lg border border-sky-400/25 bg-[#071225]/88 px-2.5 py-1.5 shadow-lg backdrop-blur-md ${className}`}
      title={ko ? "해운 프록시(BDRY) · Yahoo 종가 전일대비" : "Shipping proxy (BDRY) · Yahoo close"}
    >
      <p
        className={`text-[9px] font-semibold uppercase tracking-wider ${
          light ? "text-cyan-800" : "text-sky-200/80"
        }`}
      >
        {ko ? "해운 프록시" : "Shipping proxy"}
      </p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className={`text-[10px] ${light ? "text-slate-600" : "text-slate-500"}`}>BDRY</span>
        {error || pct == null ? (
          <span className={`text-[11px] ${light ? "text-slate-600" : "text-slate-500"}`}>—</span>
        ) : (
          <span className={`font-mono text-[12px] font-semibold tabular-nums ${tone}`}>
            {ko ? "전일 " : "d/d "}
            {pct > 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
