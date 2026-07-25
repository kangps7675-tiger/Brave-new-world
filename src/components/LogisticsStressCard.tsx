"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  stressDisclaimer,
  stressLevelColor,
  stressLevelLabel,
  type ChokepointStress,
} from "@/lib/logisticsStress";

function relativeTime(iso: string | null, lang: LabelLanguage): string {
  if (!iso) return lang === "en" ? "time unknown" : "시점 미상";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return lang === "en" ? "time unknown" : "시점 미상";
  const diffMs = Date.now() - t;
  const h = Math.floor(diffMs / (60 * 60 * 1000));
  if (h < 1) return lang === "en" ? "just now" : "방금";
  if (h < 24) return lang === "en" ? `${h}h ago` : `${h}시간 전`;
  const d = Math.floor(h / 24);
  return lang === "en" ? `${d}d ago` : `${d}일 전`;
}

const TIER_LABEL: Record<string, { ko: string; en: string }> = {
  A: { ko: "공식", en: "official" },
  B: { ko: "간접", en: "indirect" },
  C: { ko: "대리", en: "proxy" },
};

type LogisticsStressCardProps = {
  title: string;
  stress: ChokepointStress;
  lang: LabelLanguage;
  className?: string;
};

/**
 * 물류 스트레스 관측 카드.
 * "점수"가 아니라 관측된 사실을 신뢰도(A/B/C)·시점과 함께 나열한다.
 * 등급이 확정 안 됐으면(graded=false) "관측 부족"으로 정직하게 표기.
 */
export function LogisticsStressCard({ title, stress, lang, className = "" }: LogisticsStressCardProps) {
  const en = lang === "en";
  const color = stressLevelColor(stress.level);

  return (
    <div
      className={`rounded-2xl border border-slate-600/30 bg-[#0b1020]/90 px-4 py-3.5 shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-slate-100">{title}</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ color, borderColor: `${color}55`, border: "1px solid" }}
        >
          {en ? "Logistics stress" : "물류 스트레스"}: {stressLevelLabel(stress.level, lang)}
        </span>
      </div>

      {stress.signals.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {stress.signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
              <span
                className="mt-0.5 shrink-0 rounded px-1 py-[1px] text-[9px] font-bold"
                style={{
                  color: s.tier === "A" ? "#fca5a5" : s.tier === "B" ? "#fcd34d" : "#94a3b8",
                  border: "1px solid currentColor",
                }}
                title={s.tier === "A" ? (en ? "official/direct" : "공식·직접") : s.tier === "B" ? (en ? "indirect" : "간접") : (en ? "proxy" : "대리지표")}
              >
                {s.tier}·{en ? TIER_LABEL[s.tier].en : TIER_LABEL[s.tier].ko}
              </span>
              <span className="text-slate-200/90">
                {en ? s.labelEn : s.labelKo}
                {s.isDemo ? (
                  <span className="ml-1 rounded bg-fuchsia-500/20 px-1 text-[9px] font-bold text-fuchsia-300">
                    DEMO
                  </span>
                ) : null}
                <span className="ml-1 text-slate-500">
                  — {en ? s.sourceEn : s.sourceKo} · {relativeTime(s.observedAt ?? null, lang)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-slate-400">
          {en
            ? "No qualifying observations in the recent window."
            : "최근 구간에 잡힌 관측 신호가 없습니다."}
        </p>
      )}

      {!stress.graded ? (
        <p className="mt-2.5 text-[11px] text-slate-500">
          {en
            ? "No official (A-grade) signal — grade withheld."
            : "공식(A급) 신호 없음 — 등급 판단을 보류합니다."}
        </p>
      ) : null}

      <p className="mt-2.5 border-t border-slate-600/20 pt-2 text-[10px] leading-4 text-slate-500">
        {stressDisclaimer(lang)}
      </p>
    </div>
  );
}
