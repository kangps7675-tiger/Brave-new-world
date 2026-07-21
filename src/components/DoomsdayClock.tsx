"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type DoomsdayClockProps = {
  /** WTI 전 지구 긴장도 점수 (0~100) */
  score: number | null;
  /** 전일 대비 델타 (WTI 스코어 스케일) */
  deltaScore?: number | null;
  /** 이 점수를 가져온 시각 (ISO) — 상황판 "기준 시각" 표시용 */
  asOf?: string | null;
  lang: LabelLanguage;
  className?: string;
};

function formatAsOfTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
}

/**
 * 지정학 뷰 전용 — WTI 전 지구 긴장도를 "자정까지 N분"으로 재포장한 배지.
 * HOI4 세계긴장도의 "불타는 지구" 대신, 실제 지정학 커뮤니티에서 쓰는
 * Bulletin of the Atomic Scientists 둠스데이 클록 은유를 차용 (지재권 이슈 없음).
 *
 * 0점 = 자정까지 30분(여유), 100점 = 자정(위기 정점). 30분 스케일은
 * 순수 스타일링용 상수이며 WTI 산출 로직과는 무관.
 */
const MAX_MINUTES_TO_MIDNIGHT = 30;
/** 시침은 실제 둠스데이 클록 관행대로 11시 근방에 고정, 분침만 움직인다 */
const HOUR_HAND_DEG = -30;
/** 이 분 이하로 남으면 붉은 경고 톤으로 전환 */
const URGENT_MINUTES_THRESHOLD = 5;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function minutesToMidnightFromScore(score: number): number {
  const clamped = clampScore(score);
  return Math.round(((100 - clamped) / 100) * MAX_MINUTES_TO_MIDNIGHT);
}

export function DoomsdayClock({ score, deltaScore, asOf, lang, className }: DoomsdayClockProps) {
  if (score == null || !Number.isFinite(score)) return null;
  const asOfLabel = formatAsOfTime(asOf);

  const minutes = minutesToMidnightFromScore(score);
  const atMidnight = minutes <= 0;
  const minuteHandDeg = (60 - minutes) * 6;
  const urgent = minutes <= URGENT_MINUTES_THRESHOLD;

  const deltaMinutes =
    deltaScore != null && Number.isFinite(deltaScore)
      ? Math.round((deltaScore / 100) * MAX_MINUTES_TO_MIDNIGHT)
      : null;

  const deltaLabel =
    deltaMinutes != null && deltaMinutes !== 0
      ? deltaMinutes > 0
        ? t("doomsdayClockDeltaCloser", lang).replace("{n}", String(deltaMinutes))
        : t("doomsdayClockDeltaFarther", lang).replace("{n}", String(Math.abs(deltaMinutes)))
      : null;

  const timeLabel = atMidnight
    ? t("doomsdayClockAtMidnight", lang)
    : `${minutes}${t("doomsdayClockMinutesUnit", lang)} · ${t("doomsdayClockToMidnight", lang)}`;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/55 px-2.5 py-1.5 transition-colors ${
        urgent ? "animate-pulse border-red-500/50" : ""
      } ${className ?? ""}`}
      title={t("doomsdayClockHint", lang)}
      role="img"
      aria-label={`${t("doomsdayClockTitle", lang)} — ${timeLabel}`}
    >
      <svg
        viewBox="0 0 40 40"
        width="26"
        height="26"
        className={
          urgent
            ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.75)]"
            : "drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
        }
        aria-hidden
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="rgba(10,7,3,0.9)"
          stroke={urgent ? "rgba(239,68,68,0.85)" : "rgba(251,191,36,0.7)"}
          strokeWidth="1.5"
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const deg = i * 30;
          const rad = (deg * Math.PI) / 180;
          const x1 = 20 + Math.sin(rad) * 15;
          const y1 = 20 - Math.cos(rad) * 15;
          const x2 = 20 + Math.sin(rad) * 17;
          const y2 = 20 - Math.cos(rad) * 17;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(252,211,77,0.55)"
              strokeWidth="1"
            />
          );
        })}
        {/* 시침 — 11시 근방 고정 */}
        <line
          x1="20"
          y1="20"
          x2="20"
          y2="9"
          stroke="rgba(252,211,77,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${HOUR_HAND_DEG} 20 20)`}
        />
        {/* 분침 — 긴장도가 오를수록 자정(12시)에 접근 */}
        <line
          x1="20"
          y1="20"
          x2="20"
          y2="5"
          stroke={urgent ? "rgba(248,113,113,0.95)" : "rgba(254,243,199,0.95)"}
          strokeWidth="1.6"
          strokeLinecap="round"
          transform={`rotate(${minuteHandDeg} 20 20)`}
        />
        <circle cx="20" cy="20" r="1.4" fill="rgba(252,211,77,0.95)" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/85">
          {t("doomsdayClockTitle", lang)}
        </span>
        <span
          className={`text-[11px] font-medium tabular-nums ${
            urgent ? "text-red-300" : "text-amber-100/90"
          }`}
        >
          {timeLabel}
        </span>
        {deltaLabel ? <span className="text-[9px] text-amber-200/60">{deltaLabel}</span> : null}
        {asOfLabel ? (
          <span className="text-[9px] tabular-nums text-amber-200/40">
            {lang === "en" ? "as of" : "기준"} {asOfLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
