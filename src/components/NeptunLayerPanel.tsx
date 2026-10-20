"use client";

import type { NeptunStreamStatus } from "@/hooks/useNeptunStream";
import { useNeptunLocalizedCopy } from "@/hooks/useNeptunLocalizedCopy";
import {
  neptunConfidenceLabel,
  neptunTypeLabel,
} from "@/lib/neptunDisplay";
import {
  getNeptunTypeMeta,
  type NeptunAlerts,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import type { LabelLanguage } from "@/lib/layerPrefs";

type NeptunLayerPanelProps = {
  threats: NeptunLiveThreat[];
  alerts: NeptunAlerts;
  live: boolean;
  liveStatus: NeptunStreamStatus;
  serverTime?: string | null;
  error?: string | null;
  lang: LabelLanguage;
  viewportHint?: string | null;
  onSelectThreat: (threat: NeptunLiveThreat) => void;
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** 햄버거(레이어) 패널 안 — 우크라 드론·미사일 경보·트랙 목록 */
export function NeptunLayerPanel({
  threats,
  alerts,
  live,
  liveStatus,
  serverTime,
  error,
  lang,
  viewportHint,
  onSelectThreat,
}: NeptunLayerPanelProps) {
  const alertItems = [...alerts.oblasts, ...alerts.raions];
  const { threatCopy, alertNames, alertOblasts } = useNeptunLocalizedCopy(threats, alertItems, lang);

  return (
    <div className="rounded-xl border border-orange-300/20 bg-orange-950/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-micro uppercase tracking-[0.22em] text-orange-200/75">우크라 공중 경보</p>
          <p className="mt-0.5 text-xs text-orange-50/90">드론·미사일 추적 · 항목을 누르면 해당 위치로 이동</p>
        </div>
        <span className="shrink-0 rounded-full border border-orange-300/25 bg-orange-400/10 px-2 py-0.5 text-micro text-orange-100/85">
          {alertItems.length > 0
            ? `경보 ${alertItems.length}`
            : live
              ? `추적 ${threats.length}`
              : liveStatus === "loading"
                ? "연결 중"
                : "대기"}
        </span>
      </div>

      {viewportHint ? (
        <p className="mb-2 rounded-lg border border-slate-700/50 bg-slate-950/35 px-2.5 py-2 text-xs text-slate-400">
          {viewportHint}
        </p>
      ) : null}

      {error ? (
        <p className="mb-2 rounded-lg border border-red-400/30 bg-red-950/30 px-2.5 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {alertItems.length > 0 ? (
        <section className="mb-3">
          <h3 className="mb-1.5 text-micro font-medium uppercase tracking-[0.18em] text-orange-200/70">
            공습 경보 지역
          </h3>
          <ul className="space-y-1.5">
            {alertItems.map((alert) => (
              <li
                key={alert.key}
                className="rounded-lg border border-orange-400/20 bg-orange-950/25 px-2.5 py-2 text-xs text-orange-50/95"
              >
                <p className="font-medium">{alertNames[alert.key] ?? alert.name}</p>
                {alert.oblast ? (
                  <p className="mt-0.5 text-meta text-orange-100/65">
                    {alertOblasts[alert.key] ?? alert.oblast}
                  </p>
                ) : null}
                <p className="mt-1 text-micro text-orange-200/55">{formatTime(alert.since)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-1.5 text-micro font-medium uppercase tracking-[0.18em] text-sky-200/70">
          활성 드론·미사일
        </h3>
        {threats.length === 0 ? (
          <p className="rounded-lg border border-slate-700/40 bg-slate-950/30 px-2.5 py-3 text-center text-xs text-slate-400">
            현재 추적 중인 위협 없음
          </p>
        ) : (
          <ul className="max-h-52 space-y-1.5 overflow-y-auto">
            {threats.map((threat) => {
              const meta = getNeptunTypeMeta(threat.type);
              const copy = threatCopy[threat.id];
              const typeLabel = neptunTypeLabel(threat.type, lang);
              return (
                <li key={threat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectThreat(threat)}
                    className="flex w-full flex-col rounded-lg border border-slate-700/50 bg-slate-950/35 px-2.5 py-2 text-left transition hover:border-orange-300/35 hover:bg-orange-950/20"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-100">
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {typeLabel}
                        {threat.count && threat.count > 1 ? ` ×${threat.count}` : ""}
                      </span>
                      <span className="shrink-0 text-micro text-slate-400">
                        {neptunConfidenceLabel(threat.confidenceLevel, lang)}
                      </span>
                    </span>
                    {copy?.title ? (
                      <span className="mt-0.5 block text-meta text-slate-300">{copy.title}</span>
                    ) : null}
                    {copy?.location ? (
                      <span className="mt-0.5 block text-meta text-slate-400">{copy.location}</span>
                    ) : null}
                    {copy?.explanation ? (
                      <span className="mt-1 block text-meta leading-5 text-slate-400">
                        {copy.explanation}
                      </span>
                    ) : null}
                    <span className="mt-1 text-micro text-slate-500">
                      {formatTime(threat.updatedAt)}
                      {threat.trail?.length ? ` · 궤적 ${threat.trail.length}점` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-2 text-micro leading-4 text-slate-500">
        갱신 {formatTime(serverTime)} · 비공식 피드 · 공식 경보 우선
      </p>
    </div>
  );
}
