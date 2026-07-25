"use client";

import { useEffect, useState } from "react";
import type { CountryEconomicRisk, WbIndicatorReading } from "@/lib/worldBank";
import { riskBandLabel } from "@/lib/worldBank";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  iso3: string | null;
  lang: LabelLanguage;
};

const BAND_ACCENT: Record<CountryEconomicRisk["band"], string> = {
  high: "#f43f5e",
  elevated: "#fb923c",
  moderate: "#facc15",
  low: "#34d399",
  unknown: "#64748b",
};

function Sparkbars({ history, accent }: { history: Array<{ year: string; value: number }>; accent: string }) {
  if (history.length < 2) {
    return <span className="inline-block h-5 w-16 rounded bg-white/5" />;
  }
  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <span className="inline-flex h-5 items-end gap-[2px]">
      {history.slice(-16).map((h, i) => {
        const norm = (h.value - min) / range;
        const height = 2 + norm * 16;
        return (
          <span
            key={`${h.year}-${i}`}
            className="w-[3px] rounded-sm"
            style={{ height: `${height}px`, backgroundColor: accent, opacity: 0.45 + norm * 0.55 }}
          />
        );
      })}
    </span>
  );
}

function IndicatorRow({ reading, lang }: { reading: WbIndicatorReading; lang: LabelLanguage }) {
  const ko = lang !== "en";
  const label = ko ? reading.labelKo : reading.labelEn;
  const accent =
    reading.riskScore == null
      ? "#64748b"
      : reading.riskScore >= 70
        ? "#f43f5e"
        : reading.riskScore >= 50
          ? "#fb923c"
          : reading.riskScore >= 30
            ? "#facc15"
            : "#34d399";
  const valueText =
    reading.value == null
      ? "—"
      : `${reading.value >= 0 && reading.id === "currentAccount" ? "+" : ""}${reading.value.toFixed(1)}${reading.unit}`;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-[11px] text-slate-300">{label}</p>
        {reading.year ? (
          <p className="text-[9px] text-slate-500">{reading.year}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Sparkbars history={reading.history} accent={accent} />
        <span
          className="w-14 text-right font-mono text-[12px] tabular-nums"
          style={{ color: accent }}
        >
          {valueText}
        </span>
      </div>
    </div>
  );
}

export function CountryEconomicRiskCard({ iso3, lang }: Props) {
  const ko = lang !== "en";
  const [data, setData] = useState<CountryEconomicRisk | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    if (!iso3 || !/^[A-Za-z]{3}$/.test(iso3)) {
      setState("empty");
      return;
    }
    let cancelled = false;
    setState("loading");
    void (async () => {
      try {
        const res = await fetch(`/api/world-bank/country?iso=${encodeURIComponent(iso3)}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setState("empty");
          return;
        }
        const payload = (await res.json()) as CountryEconomicRisk & { indicators?: WbIndicatorReading[] };
        if (cancelled) return;
        const hasAny = Array.isArray(payload.indicators) && payload.indicators.some((r) => r.value != null);
        if (!hasAny) {
          setData(payload);
          setState("empty");
          return;
        }
        setData(payload);
        setState("ready");
      } catch {
        if (!cancelled) setState("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [iso3]);

  if (state === "empty" && !data?.indicators?.length) {
    return (
      <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {ko ? "지국 경제 위험도" : "Economic risk"}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          {ko
            ? "World Bank 공개 지표를 찾지 못했습니다 (미수교·소국·데이터 미제공)."
            : "No World Bank indicators available for this country."}
        </p>
        <p className="mt-2 text-[10px] text-slate-600">World Bank Open Data</p>
      </section>
    );
  }

  const accent = data ? BAND_ACCENT[data.band] : BAND_ACCENT.unknown;
  const score = data?.riskScore ?? null;

  return (
    <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {ko ? "지국 경제 위험도" : "Economic risk"}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: accent, backgroundColor: `${accent}1f`, border: `1px solid ${accent}55` }}
        >
          {data ? riskBandLabel(data.band, ko) : ko ? "불러오는 중" : "Loading"}
        </span>
      </div>

      {state === "loading" ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-3">
            <p className="font-mono text-[2.25rem] font-semibold leading-none tabular-nums" style={{ color: accent }}>
              {score ?? "—"}
            </p>
            <p className="pb-1 text-[11px] leading-snug text-slate-500">
              {ko ? "종합 위험 지수" : "Composite risk"}
              <br />
              {ko ? "0 안정 · 100 위기" : "0 stable · 100 crisis"}
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{ width: `${score ?? 0}%`, backgroundColor: accent }}
            />
          </div>
          <div className="mt-3 divide-y divide-white/5">
            {data?.indicators.map((reading) => (
              <IndicatorRow key={reading.id} reading={reading} lang={lang} />
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-600">
            World Bank Open Data · {ko ? "연간 지표 (최신값 지연 가능)" : "annual (may lag)"}
          </p>
        </>
      )}
    </section>
  );
}
