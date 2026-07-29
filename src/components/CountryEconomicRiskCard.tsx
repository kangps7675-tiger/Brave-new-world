"use client";

import { useEffect, useMemo, useState } from "react";
import type { CountryEconomicRisk, WbIndicatorReading } from "@/lib/worldBank";
import { riskBandLabel } from "@/lib/worldBank";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { primaryChokesForIso } from "@/data/isoChokeMap";
import { LOGISTICS_RISK_POINTS } from "@/data/logisticsRiskPoints";
import {
  countSanctionsByIso3,
  sanctionsCountForIso,
} from "@/lib/sanctionsSnapshotCount";
import { expandStaticPoints } from "@/lib/compactData";
import type { StaticPoint } from "@/data/geoTypes";

type Props = {
  iso3: string | null;
  lang: LabelLanguage;
};

type LoadState = "loading" | "ready" | "empty";
type EmptyReason = "no-iso" | "stub" | "no-data" | "error";

const BAND_ACCENT: Record<CountryEconomicRisk["band"], string> = {
  high: "#f43f5e",
  elevated: "#fb923c",
  moderate: "#facc15",
  low: "#34d399",
  unknown: "#64748b",
};

function chokeLabel(id: string, ko: boolean): string {
  const p = LOGISTICS_RISK_POINTS.find((x) => x.id === id);
  if (!p) return id.replace(/^choke-/, "");
  if (ko) return p.name;
  const en = p.meta && typeof p.meta.nameEn === "string" ? p.meta.nameEn : null;
  return en ?? p.name;
}

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
        <p className="truncate text-meta text-slate-300">{label}</p>
        {reading.year ? (
          <p className="text-micro text-slate-500">{reading.year}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Sparkbars history={reading.history} accent={accent} />
        <span
          className="w-14 text-right font-mono text-caption tabular-nums"
          style={{ color: accent }}
        >
          {valueText}
        </span>
      </div>
    </div>
  );
}

function emptyCopy(reason: EmptyReason, ko: boolean): { title: string; body: string } {
  switch (reason) {
    case "no-iso":
      return ko
        ? {
            title: "ISO 코드 없음",
            body: "이 영토에는 ISO A3가 없어 World Bank 지표를 조회할 수 없습니다.",
          }
        : {
            title: "No ISO code",
            body: "This territory has no ISO A3, so World Bank indicators cannot be loaded.",
          };
    case "stub":
      return ko
        ? {
            title: "Stub 모드",
            body: "개발 stub 모드에서는 World Bank 실데이터를 불러오지 않습니다.",
          }
        : {
            title: "Stub mode",
            body: "World Bank live data is disabled while API stub mode is on.",
          };
    case "error":
      return ko
        ? {
            title: "일시 실패",
            body: "World Bank 응답을 받지 못했습니다. 잠시 후 다시 눌러 보세요.",
          }
        : {
            title: "Temporary failure",
            body: "Could not reach World Bank. Try selecting the country again.",
          };
    default:
      return ko
        ? {
            title: "데이터 없음",
            body: "World Bank 공개 지표를 찾지 못했습니다 (미수교·소국·데이터 미제공).",
          }
        : {
            title: "No data",
            body: "No World Bank indicators available for this country.",
          };
  }
}

export function CountryEconomicRiskCard({ iso3, lang }: Props) {
  const ko = lang !== "en";
  const [data, setData] = useState<CountryEconomicRisk | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [emptyReason, setEmptyReason] = useState<EmptyReason>("no-data");
  const [sanctionsCounts, setSanctionsCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/layers/sanctions-entities", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as { points?: unknown[] };
        const raw = Array.isArray(payload.points) ? payload.points : [];
        const points = expandStaticPoints(
          raw as Parameters<typeof expandStaticPoints>[0],
        ) as StaticPoint[];
        if (!cancelled) setSanctionsCounts(countSanctionsByIso3(points));
      } catch {
        /* optional tag */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!iso3 || !/^[A-Za-z]{3}$/.test(iso3)) {
      setData(null);
      setEmptyReason("no-iso");
      setState("empty");
      return;
    }
    let cancelled = false;
    setData(null);
    setState("loading");
    void (async () => {
      try {
        const res = await fetch(`/api/world-bank/country?iso=${encodeURIComponent(iso3)}`, {
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setEmptyReason("error");
          setState("empty");
          return;
        }
        const payload = (await res.json()) as CountryEconomicRisk & {
          indicators?: WbIndicatorReading[];
          stub?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (payload.stub) {
          setData(payload);
          setEmptyReason("stub");
          setState("empty");
          return;
        }
        if (
          payload.error &&
          !(Array.isArray(payload.indicators) && payload.indicators.some((r) => r.value != null))
        ) {
          setData(payload);
          setEmptyReason("error");
          setState("empty");
          return;
        }
        const hasAny = Array.isArray(payload.indicators) && payload.indicators.some((r) => r.value != null);
        if (!hasAny) {
          setData(payload);
          setEmptyReason("no-data");
          setState("empty");
          return;
        }
        setData(payload);
        setState("ready");
      } catch {
        if (!cancelled) {
          setEmptyReason("error");
          setState("empty");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [iso3]);

  const scoreIndicators = useMemo(
    () => (data?.indicators ?? []).filter((r) => r.id !== "energyImports"),
    [data],
  );

  const vulnerabilityTags = useMemo(() => {
    if (!iso3) return [] as Array<{ key: string; label: string }>;
    const tags: Array<{ key: string; label: string }> = [];
    const energy = data?.indicators.find((r) => r.id === "energyImports");
    if (energy?.value != null && Number.isFinite(energy.value)) {
      tags.push({
        key: "energy",
        label: ko
          ? `에너지 순수입 ${energy.value.toFixed(0)}%`
          : `Energy import ${energy.value.toFixed(0)}%`,
      });
    }
    const chokes = primaryChokesForIso(iso3);
    if (chokes.length > 0) {
      const names = chokes.slice(0, 2).map((id) => chokeLabel(id, ko));
      tags.push({
        key: "choke",
        label: ko ? `관문 ${names.join("·")}` : `Choke ${names.join("·")}`,
      });
    }
    const sanc = sanctionsCountForIso(sanctionsCounts, iso3);
    if (sanc > 0) {
      tags.push({
        key: "sanctions",
        label: ko ? `제재 스냅샷 ${sanc}` : `Sanctions snap ${sanc}`,
      });
    }
    return tags;
  }, [data, iso3, ko, sanctionsCounts]);

  const title = ko ? "경제 위협도" : "Economic threat";

  if (state === "empty") {
    const copy = emptyCopy(emptyReason, ko);
    return (
      <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <span className="rounded-full border border-slate-600/60 bg-slate-700/20 px-2 py-0.5 text-micro font-semibold text-slate-400">
            {copy.title}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500">{copy.body}</p>
        <p className="mt-2 text-micro text-slate-600">World Bank Open Data</p>
      </section>
    );
  }

  const accent = data ? BAND_ACCENT[data.band] : BAND_ACCENT.unknown;
  const score = data?.riskScore ?? null;

  return (
    <section className="rounded-xl border border-slate-800 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{title}</p>
        <span
          className="rounded-full px-2 py-0.5 text-micro font-semibold"
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
            <p className="pb-1 text-meta leading-snug text-slate-500">
              {ko ? "종합 위협 지수" : "Composite threat"}
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
          {vulnerabilityTags.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {vulnerabilityTags.map((tag) => (
                <span
                  key={tag.key}
                  className="rounded-full border border-slate-600/50 bg-slate-800/40 px-2 py-0.5 text-micro text-slate-300"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 divide-y divide-white/5">
            {scoreIndicators.map((reading) => (
              <IndicatorRow key={reading.id} reading={reading} lang={lang} />
            ))}
          </div>
          <p className="mt-3 text-micro text-slate-600">
            World Bank Open Data
            {vulnerabilityTags.some((t) => t.key === "choke")
              ? ko
                ? " · curated chokepoints"
                : " · curated chokepoints"
              : ""}
            {vulnerabilityTags.some((t) => t.key === "sanctions")
              ? ko
                ? " · sanctions snapshot"
                : " · sanctions snapshot"
              : ""}
            {ko ? " · 연간 지표 (최신값 지연 가능)" : " · annual (may lag)"}
          </p>
        </>
      )}
    </section>
  );
}
