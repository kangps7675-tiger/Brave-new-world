"use client";

import { useEffect, useState } from "react";
import type { SovereignRateRow } from "@/lib/sovereignRates";
import { useLocale } from "@/contexts/LocaleContext";

type RatesResponse = {
  countries?: SovereignRateRow[];
  error?: string;
  needsFredKey?: boolean;
  attribution?: string;
};

function formatPct(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatSpread(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%p`;
}

/**
 * 장단기 금리차 그래프 — 0선을 기준으로 역전(음수)이 바로 보이게.
 */
function SpreadChart({ data, inverted }: { data: number[]; inverted: boolean }) {
  const width = 160;
  const height = 44;
  const pad = 2;

  if (data.length < 2) {
    return <span className="block h-11 w-full rounded bg-white/5" aria-hidden />;
  }

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const range = max - min || 1;
  const zeroY = height - ((0 - min) / range) * (height - pad * 2) - pad;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - pad * 2) - pad;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = inverted ? "#fb7185" : "#34d399";
  const fill = inverted ? "rgba(251,113,133,0.18)" : "rgba(52,211,153,0.14)";

  // area under/over zero: simple closed path from first→line→last→zero
  const firstX = 0;
  const lastX = width;
  const area = `${firstX},${zeroY.toFixed(1)} ${points} ${lastX},${zeroY.toFixed(1)}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      role="img"
      aria-label={inverted ? "yield curve inverted" : "yield curve spread"}
    >
      <line
        x1={0}
        x2={width}
        y1={zeroY}
        y2={zeroY}
        stroke="rgba(148,163,184,0.45)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <polygon fill={fill} points={area} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function CountryRateCard({
  row,
  lang,
}: {
  row: SovereignRateRow;
  lang: "ko" | "en";
}) {
  const name = lang === "en" ? row.nameEn : row.nameKo;
  const spreadLabel = lang === "en" ? row.spreadLabelEn : row.spreadLabelKo;
  const inverted = row.spread != null && row.spread < 0;
  const spreadTone =
    row.spread == null
      ? "text-slate-400"
      : inverted
        ? "text-rose-300"
        : "text-emerald-300";

  return (
    <article className="rounded-xl border border-sky-300/15 bg-[#071225]/75 px-3 py-2.5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-sky-50">{name}</h4>
        <span className={`font-mono text-xs font-semibold ${spreadTone}`}>
          {formatSpread(row.spread)}
        </span>
      </div>
      <p className="mt-0.5 text-micro text-slate-500">
        {lang === "en" ? "Spread" : "장단기차"} · {spreadLabel}
        {inverted
          ? lang === "en"
            ? " · inverted"
            : " · 역전"
          : ""}
      </p>
      <div className="mt-1.5">
        <SpreadChart data={row.spreadSparkline} inverted={inverted} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-md bg-white/[0.04] px-1 py-1.5">
          <dt className="text-micro text-slate-500">
            {lang === "en" ? "Policy" : "기준"}
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
            {formatPct(row.policyRate)}
          </dd>
        </div>
        <div className="rounded-md bg-white/[0.04] px-1 py-1.5">
          <dt className="text-micro text-slate-500">
            {lang === "en" ? "Short" : "단기"}
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
            {formatPct(row.shortYield)}
          </dd>
        </div>
        <div className="rounded-md bg-white/[0.04] px-1 py-1.5">
          <dt className="text-micro text-slate-500">
            {lang === "en" ? "10Y" : "장기"}
          </dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
            {formatPct(row.longYield)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function SovereignRatesPanel({ compact }: { compact?: boolean }) {
  const { lang } = useLocale();
  const [rows, setRows] = useState<SovereignRateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsFredKey, setNeedsFredKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/sovereign-rates", { cache: "no-store" });
        const payload = (await res.json()) as RatesResponse;
        if (cancelled) return;
        if (payload.needsFredKey) {
          setNeedsFredKey(true);
          setRows([]);
          setError(payload.error ?? null);
        } else if (!res.ok || payload.error) {
          setError(payload.error || `HTTP ${res.status}`);
          setRows([]);
        } else {
          setRows(Array.isArray(payload.countries) ? payload.countries : []);
          setError(null);
          setNeedsFredKey(false);
        }
      } catch {
        if (!cancelled) {
          setError(
            lang === "en"
              ? "Could not load sovereign rates."
              : "주요국 금리를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 20 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [lang]);

  return (
    <section className={compact ? "" : "space-y-2"}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
            {lang === "en" ? "Sovereign rates" : "주요국 금리"}
          </h3>
          <p className="mt-0.5 text-micro text-slate-500">
            {lang === "en"
              ? "Policy & bond yields as numbers · long–short spread as a chart (0 = flat)"
              : "기준·국채는 숫자 · 장단기 금리차는 그래프 (점선=0, 아래면 역전)"}
          </p>
        </div>
      </div>

      {loading && !rows ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : needsFredKey ? (
        <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
          {lang === "en"
            ? "Set FRED_API_KEY on the server to load official policy/bond rates and spreads."
            : "서버에 FRED_API_KEY 를 넣으면 주요국 기준·채권금리와 장단기차 그래프가 채워집니다."}
        </p>
      ) : error ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/85">
          {error}
        </p>
      ) : rows && rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row) => (
            <CountryRateCard key={row.id} row={row} lang={lang === "en" ? "en" : "ko"} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {lang === "en" ? "No rate series available." : "표시할 금리 시리즈가 없습니다."}
        </p>
      )}
    </section>
  );
}
