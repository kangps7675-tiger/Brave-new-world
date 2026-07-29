"use client";

import { useEffect, useState } from "react";
import { localizeNeptunThreatCopy, neptunConfidenceLabel, neptunTypeLabel } from "@/lib/neptunDisplay";
import { getNeptunTypeMeta, type NeptunLiveThreat } from "@/lib/neptun";

import type { LabelLanguage } from "@/lib/layerPrefs";

type NeptunThreatDetailPanelProps = {
  threat: NeptunLiveThreat;
  lang: LabelLanguage;
  onClose: () => void;
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** 우측 사이드바 — 드론·미사일 상세 */
export function NeptunThreatDetailPanel({
  threat,
  lang,
  onClose,
}: NeptunThreatDetailPanelProps) {
  const meta = getNeptunTypeMeta(threat.type);
  const [copy, setCopy] = useState({
    title: threat.title,
    location: [threat.locality, threat.district, threat.region].filter(Boolean).join(" · "),
    explanation: threat.explanationShort ?? null,
  });

  useEffect(() => {
    let cancelled = false;
    void localizeNeptunThreatCopy(threat, lang).then((next) => {
      if (!cancelled) setCopy(next);
    });
    return () => {
      cancelled = true;
    };
  }, [threat, lang]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-orange-200/75">우크라 공중 위협</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-100">{neptunTypeLabel(threat.type, lang)}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      <section
        className="rounded-xl border p-4"
        style={{ borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }}
      >
        {copy.title ? <p className="text-sm font-medium text-slate-100">{copy.title}</p> : null}
        {copy.location ? <p className="mt-2 text-sm text-slate-300">{copy.location}</p> : null}
        {copy.explanation ? (
          <p className="mt-3 text-sm leading-6 text-slate-300">{copy.explanation}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Metric label="신뢰도" value={neptunConfidenceLabel(threat.confidenceLevel, lang)} />
        <Metric label="궤적 점" value={`${threat.trail?.length ?? 0}개`} />
        <Metric label="위도" value={threat.predictedLat.toFixed(3)} />
        <Metric label="경도" value={threat.predictedLon.toFixed(3)} />
        {threat.velocity?.speedKmh ? (
          <Metric label="속도" value={`${Math.round(threat.velocity.speedKmh)} km/h`} />
        ) : null}
        {threat.predictedHeading != null ? (
          <Metric label="방위" value={`${Math.round(threat.predictedHeading)}°`} />
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-black/25 p-4 text-sm text-slate-400">
        <p>갱신 {formatTime(threat.updatedAt)}</p>
        {threat.sourceCount ? <p className="mt-1">출처 {threat.sourceCount}건</p> : null}
        <p className="mt-2 text-xs leading-5 text-slate-500">
          실선은 현재 공중 궤적, 점선은 예측·지나간 항로입니다. 탄도·순항·드론 유형별 고도 프로필이 적용됩니다.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <dt className="text-micro uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{value}</dd>
    </div>
  );
}
