"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

export type BottomDockMode = "history" | "news";

const DOCK_MODE_KEY = "cv-bottom-dock-mode";

export function readBottomDockMode(): BottomDockMode {
  if (typeof window === "undefined") return "history";
  try {
    const raw = sessionStorage.getItem(DOCK_MODE_KEY);
    if (raw === "news" || raw === "history") return raw;
  } catch {
    /* ignore */
  }
  return "history";
}

export function writeBottomDockMode(mode: BottomDockMode) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DOCK_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

type BottomDockModeToggleProps = {
  lang: LabelLanguage;
  mode: BottomDockMode;
  onChange: (mode: BottomDockMode) => void;
  compact?: boolean;
};

/**
 * 하단 독 — 히스토리(시간 스크럽) / 뉴스(인텔 스택) 전환.
 * 바 바로 위에 두는 세그먼트 컨트롤.
 */
export function BottomDockModeToggle({
  lang,
  mode,
  onChange,
  compact = false,
}: BottomDockModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label={t("bottomDockToggleAria", lang)}
      className={`pointer-events-auto mx-auto flex w-fit items-center gap-0.5 rounded-full border border-sky-200/20 bg-[#0a1428]/88 p-0.5 shadow-lg backdrop-blur-md ${
        compact ? "text-micro" : "text-caption"
      }`}
    >
      {(
        [
          {
            id: "history" as const,
            label: t("bottomDockHistory", lang),
            title: t("bottomDockHistoryHint", lang),
          },
          {
            id: "news" as const,
            label: t("bottomDockNews", lang),
            title: t("bottomDockNewsHint", lang),
          },
        ] as const
      ).map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={item.title}
            onClick={() => onChange(item.id)}
            className={`tap-target min-h-[36px] rounded-full px-3.5 font-medium transition ${
              active
                ? item.id === "history"
                  ? "bg-amber-500/25 text-amber-50 shadow-sm"
                  : "bg-sky-500/30 text-sky-50 shadow-sm"
                : "text-sky-100/55 hover:bg-white/5 hover:text-sky-50/85"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
