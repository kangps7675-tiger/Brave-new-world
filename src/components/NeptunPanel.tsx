"use client";

import {
  formatNeptunLocation,
  getNeptunTypeMeta,
  NEPTUN_ATTRIBUTION_URL,
  type NeptunAlerts,
  type NeptunLiveThreat,
} from "@/lib/neptun";
import type { NeptunStreamStatus } from "@/hooks/useNeptunStream";

type NeptunPanelProps = {
  threats: NeptunLiveThreat[];
  alerts: NeptunAlerts;
  live: boolean;
  liveStatus: NeptunStreamStatus;
  serverTime?: string | null;
  error?: string | null;
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

export function NeptunPanel({
  threats,
  alerts,
  live,
  liveStatus,
  serverTime,
  error,
}: NeptunPanelProps) {
  const alertCount = alerts.raions.length + alerts.oblasts.length;
  const hasAlerts = alertCount > 0;
  const hasThreats = threats.length > 0;

  return (
    <div
      className={`pointer-events-auto absolute left-4 top-4 z-30 flex h-[calc(100vh-32px)] w-[min(92vw,384px)] flex-col overflow-hidden rounded-lg border backdrop-blur-md ${
        hasAlerts || hasThreats
          ? "border-orange-400/45 bg-[#1a1208]/90 shadow-[0_0_28px_rgba(255,120,0,0.28)]"
          : "border-[#45f3ff]/30 bg-[#1a1a2e]/85 shadow-[0_0_20px_rgba(69,243,255,0.12)]"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 ${
          hasAlerts ? "border-orange-400/30" : "border-[#45f3ff]/25"
        }`}
      >
        <div>
          <p
            className={`font-mono text-micro uppercase tracking-[0.28em] ${
              hasAlerts ? "text-orange-200/90" : "text-[#45f3ff]/80"
            }`}
          >
            NEPTUN
          </p>
          <p
            className={`mt-0.5 text-sm font-semibold ${
              hasAlerts ? "text-orange-50" : "text-[#45f3ff]"
            }`}
          >
            우크라이나 공중 위협
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-micro ${
            hasAlerts
              ? "border-orange-300/40 bg-orange-500/20 text-orange-100 animate-pulse"
              : live
                ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
                : "border-slate-500/30 bg-slate-800/40 text-slate-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              hasAlerts ? "bg-orange-400" : live ? "bg-emerald-400" : "bg-slate-500"
            }`}
          />
          {hasAlerts
            ? `경보 ${alertCount}`
            : liveStatus === "loading"
              ? "연결 중"
              : live
                ? `트랙 ${threats.length}`
                : liveStatus === "stub"
                  ? "데모"
                  : liveStatus === "error"
                    ? "오류"
                    : "대기"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="mb-3 rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        ) : null}

        <p className="mb-3 text-meta leading-5 text-slate-400">
          정보 수집용 비공식 피드입니다. 생명 안전 관련 결정에는 공식 경보를 우선하세요.
        </p>

        {hasAlerts ? (
          <section className="mb-4">
            <h3 className="mb-2 font-mono text-micro uppercase tracking-[0.2em] text-orange-200/80">
              공식 공습 경보
            </h3>
            <ul className="space-y-2">
              {[...alerts.oblasts, ...alerts.raions].map((alert) => (
                <li
                  key={alert.key}
                  className="rounded-lg border border-orange-400/25 bg-orange-950/25 px-3 py-2"
                >
                  <p className="text-sm font-medium text-orange-50">{alert.name}</p>
                  {alert.oblast ? (
                    <p className="mt-0.5 text-xs text-orange-100/70">{alert.oblast}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-micro text-orange-200/60">
                    {formatTime(alert.since)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-2 font-mono text-micro uppercase tracking-[0.2em] text-sky-200/80">
            활성 위협 트랙
          </h3>
          {threats.length === 0 ? (
            <p className="rounded-lg border border-slate-600/30 bg-slate-900/30 px-3 py-4 text-center text-xs text-slate-400">
              현재 활성 트랙 없음
            </p>
          ) : (
            <ul className="space-y-2">
              {threats.map((threat) => {
                const meta = getNeptunTypeMeta(threat.type);
                const location = formatNeptunLocation(threat);
                return (
                  <li
                    key={threat.id}
                    className="rounded-lg border border-slate-600/30 bg-slate-900/35 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          <span
                            className="mr-1.5 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {meta.label}
                          {threat.count && threat.count > 1 ? ` ×${threat.count}` : ""}
                        </p>
                        {threat.title ? (
                          <p className="mt-0.5 text-xs text-slate-300">{threat.title}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded border border-slate-500/30 px-1.5 py-0.5 font-mono text-micro uppercase text-slate-400">
                        {threat.confidenceLevel}
                      </span>
                    </div>
                    {location ? (
                      <p className="mt-1 text-xs text-slate-400">{location}</p>
                    ) : null}
                    {threat.explanationShort ? (
                      <p className="mt-1 text-xs leading-5 text-slate-300">
                        {threat.explanationShort}
                      </p>
                    ) : null}
                    <p className="mt-1.5 font-mono text-micro text-slate-500">
                      {formatTime(threat.updatedAt)}
                      {threat.flying && threat.velocity?.speedKmh
                        ? ` · ${Math.round(threat.velocity.speedKmh)} km/h`
                        : ""}
                      {threat.predictedHeading != null
                        ? ` · ${Math.round(threat.predictedHeading)}°`
                        : ""}
                      {threat.trail?.length ? ` · 궤적 ${threat.trail.length}점` : ""}
                      {threat.sourceCount ? ` · 출처 ${threat.sourceCount}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-slate-600/25 px-4 py-2.5 text-micro text-slate-500">
        <p>서버 시각: {formatTime(serverTime)}</p>
        <p className="mt-1">
          데이터:{" "}
          <a
            href={NEPTUN_ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-300/80 underline-offset-2 hover:text-sky-200 hover:underline"
          >
            Карта повітряних тривог — NEPTUN
          </a>
        </p>
      </div>
    </div>
  );
}
