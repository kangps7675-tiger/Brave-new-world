"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasemapTone } from "@/hooks/useBasemapTone";
import type { ViewerMode } from "@/lib/viewPackages";

type ViewModeSwitcherProps = {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
};

/** 상단 토글 — 지정학 · 지경학 */
type TopMode = Extract<ViewerMode, "conflict" | "economy">;

export function ViewModeSwitcher({
  mode,
  onChange,
}: ViewModeSwitcherProps) {
  const { t } = useLocale();
  const light = useBasemapTone() === "light";

  const MODES: Array<{ id: TopMode; label: string; hint: string }> = [
    {
      id: "conflict",
      label: t("modeConflict"),
      hint: t("modeConflictHint"),
    },
    {
      id: "economy",
      label: t("modeEconomy"),
      hint: t("modeEconomyHint"),
    },
  ];

  /** 레거시 history/live 저장값 → 지정학 탭으로 표시 */
  const displayMode: TopMode = mode === "economy" ? "economy" : "conflict";

  const activeClass = (id: TopMode) => {
    if (id === "economy") {
      return light
        ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-600/35"
        : "bg-emerald-400/25 text-emerald-50 ring-1 ring-emerald-300/35";
    }
    return light
      ? "bg-rose-100 text-rose-950 ring-1 ring-rose-700/35"
      : "bg-rose-400/25 text-rose-50 ring-1 ring-rose-300/35";
  };

  return (
    <div
      id="view-mode-switcher"
      className={`flex w-full justify-start rounded-full border p-0.5 shadow-lg sm:w-auto ${
        light
          ? "border-slate-300 bg-white"
          : "border-sky-200/15 bg-[#0f1d35]/88 backdrop-blur-xl"
      }`}
      role="tablist"
      aria-label={t("viewerModeLabel")}
    >
      {MODES.map((item) => {
        const active = displayMode === item.id;
        return (
          <HoverHint key={item.id} placement="bottom" title={item.label} detail={item.hint}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={item.label}
              onClick={() => onChange(item.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold transition sm:flex-none sm:px-3 ${
                active
                  ? activeClass(item.id)
                  : light
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>{item.label}</span>
            </button>
          </HoverHint>
        );
      })}
    </div>
  );
}
