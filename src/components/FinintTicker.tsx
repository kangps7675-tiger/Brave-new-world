"use client";

import { useEffect, useState } from "react";
import { useBasemapTone } from "@/hooks/useBasemapTone";

export interface FreightIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  updatedAt: string;
}

type FreightIndicesResponse = {
  indices?: FreightIndex[];
  updatedAt?: string;
  error?: string;
};

const REFRESH_MS = 60 * 60 * 1000;

function formatSigned(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}${suffix}`;
}

export function FinintTicker() {
  const [indices, setIndices] = useState<FreightIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/freight-indices");
        const payload = (await response.json()) as FreightIndicesResponse;
        if (!response.ok || payload.error) {
          throw new Error(payload.error || `HTTP ${response.status}`);
        }
        if (!cancelled) {
          setIndices(Array.isArray(payload.indices) ? payload.indices : []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "데이터 로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const light = useBasemapTone() === "light";

  return (
    <section
      className="finint-ticker tone-chip overflow-hidden rounded-xl border border-sky-300/15 bg-[#071225]/85 shadow-lg backdrop-blur-md"
      aria-labelledby="finint-ticker-title"
    >
      <div
        className={`flex items-center justify-between border-b px-3 py-2 ${
          light ? "border-slate-300/50" : "border-white/10"
        }`}
      >
        <div>
          <h2
            id="finint-ticker-title"
            className={`text-xs font-semibold tracking-wide ${
              light ? "text-slate-800" : "text-sky-50"
            }`}
          >
            해운 시장(운임 대리지표)
          </h2>
          <p className={`mt-0.5 text-[10px] ${light ? "text-slate-600" : "text-slate-500"}`}>
            등락은 전일 종가 대비입니다. 실시간 운임 지수가 아닙니다.
          </p>
        </div>
        <span className="text-[9px] font-medium tracking-wider text-slate-600">
          전일대비 · 1H
        </span>
      </div>

      {loading ? (
        <div className="flex h-16 items-center px-3 text-xs text-slate-500">
          해운 시장 데이터 로딩 중…
        </div>
      ) : error ? (
        <div className="flex h-16 items-center px-3 text-xs text-rose-300/80">
          {error}
        </div>
      ) : (
        <div className="grid divide-y divide-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {indices.map((item) => {
            const up = item.change > 0;
            const down = item.change < 0;
            const tone = up
              ? "text-emerald-400"
              : down
                ? "text-rose-400"
                : "text-slate-400";
            return (
              <div key={item.symbol} className="min-w-0 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-sky-100">
                    {item.symbol}
                  </span>
                  <span className={`text-[11px] font-medium ${tone}`}>
                    전일 {formatSigned(item.changePercent, "%")}
                  </span>
                </div>
                <p className="mt-1 truncate text-[10px] text-slate-500" title={item.name}>
                  {item.name}
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold tabular-nums text-slate-100">
                    {item.value.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-600">{item.unit}</span>
                  <span className={`text-[10px] tabular-nums ${tone}`}>
                    {formatSigned(item.change)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
