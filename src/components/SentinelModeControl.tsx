"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { SentinelFlyTarget } from "@/lib/sentinelMode";
import { t } from "@/lib/uiStrings";

/** 스포트라이트 코치·테스트용 앵커 */
export const SENTINEL_TOGGLE_ID = "sentinel-mode-toggle";

type Props = {
  lang: LabelLanguage;
  active: boolean;
  current: SentinelFlyTarget | null;
  /** 지경학이면 경제 중심지 카피 */
  economyMode?: boolean;
  onToggle: () => void;
};

/**
 * 자동 순회(센티넬) 토글 — 상황실 스크린세이버 진입/탈출.
 * 표시명은 한/영 모두 사용자 친화적으로 (SENTINEL 은 내부 코드명).
 */
export function SentinelModeButton({
  lang,
  active,
  current,
  economyMode = false,
  onToggle,
}: Props) {
  const ko = lang !== "en";
  const label = active
    ? t("sentinelActiveLabel", lang)
    : t("sentinelIdleLabel", lang);
  const title = economyMode
    ? t("sentinelTitleEconomy", lang)
    : t("sentinelTitleConflict", lang);

  return (
    <button
      id={SENTINEL_TOGGLE_ID}
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={title}
      title={title}
      className={
        active
          ? economyMode
            ? `pointer-events-auto rounded-sm border border-amber-400/50 bg-amber-950/80 px-2.5 py-1.5 text-micro font-bold ${ko ? "tracking-wide" : "uppercase tracking-[0.14em]"} text-amber-100 shadow-lg`
            : `pointer-events-auto rounded-sm border border-rose-400/50 bg-rose-950/80 px-2.5 py-1.5 text-micro font-bold ${ko ? "tracking-wide" : "uppercase tracking-[0.14em]"} text-rose-100 shadow-lg`
          : `pointer-events-auto rounded-sm border border-slate-500/40 bg-slate-950/75 px-2.5 py-1.5 text-micro font-bold ${ko ? "tracking-wide" : "uppercase tracking-[0.14em]"} text-slate-300 shadow-sm transition hover:border-rose-400/40 hover:text-rose-100`
      }
    >
      {label}
      {active && current ? (
        <span
          className={`mt-0.5 block truncate text-micro font-normal normal-case tracking-normal ${
            economyMode ? "text-amber-200/80" : "text-rose-200/80"
          }`}
        >
          #{current.rank} {ko ? current.labelKo : current.labelEn}
        </span>
      ) : null}
    </button>
  );
}

/** 자동 순회 ON일 때 상단 드라이 바 */
export function SentinelHud({
  lang,
  current,
  index,
  total,
  economyMode = false,
  onExit,
}: {
  lang: LabelLanguage;
  current: SentinelFlyTarget | null;
  index: number;
  total: number;
  economyMode?: boolean;
  onExit: () => void;
}) {
  const ko = lang !== "en";
  const modeLabel = economyMode
    ? t("sentinelHudEconomy", lang)
    : t("sentinelHudConflict", lang);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[900] flex justify-center px-3 pt-3 sm:pt-4">
      <div
        className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-sm border bg-[#05080f]/92 px-3 py-2 shadow-2xl backdrop-blur-md ${
          economyMode ? "border-amber-500/30" : "border-rose-500/30"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-micro font-bold ${ko ? "tracking-wide" : "uppercase tracking-[0.2em]"} ${
              economyMode ? "text-amber-300/90" : "text-rose-300/90"
            }`}
          >
            {modeLabel}
          </p>
          <p className="truncate text-caption text-slate-200">
            {current
              ? `${ko ? current.labelKo : current.labelEn} · #${current.rank}`
              : t("sentinelPreparing", lang)}
            {total > 0 ? (
              <span className="ml-2 text-micro text-slate-500">
                {index + 1}/{total}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded border border-slate-600/70 px-2.5 py-1.5 text-meta text-slate-300 hover:border-slate-400 hover:text-white"
        >
          {t("sentinelExit", lang)}
        </button>
      </div>
    </div>
  );
}
