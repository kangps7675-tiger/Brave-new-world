"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasemapTone } from "@/hooks/useBasemapTone";
import type { ViewerMode } from "@/lib/viewPackages";

type ViewModeSwitcherProps = {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
};

/** 상단 3토글 — 지정학 · 프리미엄(Cesium) · 지경학 */
type TopMode = Extract<ViewerMode, "conflict" | "satellite" | "economy">;

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
      id: "satellite",
      label: t("modePremium"),
      hint: t("modePremiumHint"),
    },
    {
      id: "economy",
      label: t("modeEconomy"),
      hint: t("modeEconomyHint"),
    },
  ];

  /** 역사 렌즈(viewerMode=history)는 지정학 탭으로 표시 */
  const displayMode: TopMode =
    mode === "economy"
      ? "economy"
      : mode === "satellite"
        ? "satellite"
        : "conflict";

  const activeClass = (id: TopMode) => {
    if (id === "economy") {
      return light
        ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-600/35"
        : "bg-emerald-400/25 text-emerald-50 ring-1 ring-emerald-300/35";
    }
    if (id === "satellite") {
      return light
        ? "bg-teal-100 text-teal-950 ring-1 ring-teal-600/35"
        : "bg-teal-400/25 text-teal-50 ring-1 ring-teal-300/35";
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
        const active = displayMode === item.id;
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
