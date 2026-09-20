"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasemapTone } from "@/hooks/useBasemapTone";
import type { ViewerMode } from "@/lib/viewPackages";

type ViewModeSwitcherProps = {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
};

/** 상단 3토글 — 지정학 · 역사 · 지경학 (관측·항적은 지정학 하위 도구) */
type TopMode = Extract<ViewerMode, "conflict" | "history" | "economy">;

export function ViewModeSwitcher({ mode, onChange }: ViewModeSwitcherProps) {
  const { t } = useLocale();
  const light = useBasemapTone() === "light";

  const MODES: Array<{ id: TopMode; label: string; hint: string }> = [
    {
      id: "conflict",
      label: t("modeConflict"),
      hint: t("modeConflictHint"),
    },
    {
      id: "history",
      label: t("modeHistory"),
      hint: t("modeHistoryHint"),
    },
    {
      id: "economy",
      label: t("modeEconomy"),
      hint: t("modeEconomyHint"),
    },
  ];

  const activeClass = (id: (typeof TOP_MODES)[number]) => {
    if (id === "economy") {
      return light
        ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-600/35"
        : "bg-emerald-400/25 text-emerald-50 ring-1 ring-emerald-300/35";
    }
    if (id === "history") {
      return light
        ? "bg-amber-100 text-amber-950 ring-1 ring-amber-600/35"
        : "bg-amber-400/25 text-amber-50 ring-1 ring-amber-300/35";
    }
    return light
      ? "bg-sky-100 text-sky-950 ring-1 ring-sky-700/35"
      : "bg-sky-400/25 text-sky-50 ring-1 ring-sky-300/35";
  };

  return (
    <div
      id="view-mode-switcher"
      className={`flex rounded-full border p-0.5 shadow-lg ${
        light
          ? "border-slate-300 bg-white"
          : "border-sky-200/15 bg-[#0f1d35]/88 backdrop-blur-xl"
      }`}
      role="tablist"
      aria-label={t("viewerModeLabel")}
    >
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <HoverHint key={item.id} placement="bottom" title={item.label} detail={item.hint}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={`rounded-full px-2.5 py-1 text-caption font-semibold transition sm:px-3 ${
                active
                  ? activeClass(item.id)
                  : light
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          </HoverHint>
        );
      })}
    </div>
  );
}
