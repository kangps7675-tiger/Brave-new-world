"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasemapTone } from "@/hooks/useBasemapTone";
import type { ViewerMode } from "@/lib/viewPackages";

type ViewModeSwitcherProps = {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
  /** 관측대 soft unlock — false면 잠금 표시 */
  observeUnlocked?: boolean;
};

/** 상단 3토글 — 지정학 · 관측대(잠금) · 지경학 */
type TopMode = Extract<ViewerMode, "conflict" | "satellite" | "economy">;

export function ViewModeSwitcher({
  mode,
  onChange,
  observeUnlocked = false,
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

  /** 레거시 history/live 저장값 → 지정학·관측대 탭으로 표시 */
  const displayMode: TopMode =
    mode === "economy"
      ? "economy"
      : mode === "satellite" || mode === "live"
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
        const locked = item.id === "satellite" && !observeUnlocked;
        return (
          <HoverHint key={item.id} placement="bottom" title={item.label} detail={item.hint}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={
                locked
                  ? `${item.label} (${t("modePremiumHint")})`
                  : item.label
              }
              onClick={() => onChange(item.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold transition sm:flex-none sm:px-3 ${
                active
                  ? activeClass(item.id)
                  : light
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {locked ? (
                <span className="text-micro opacity-80" aria-hidden>
                  🔒
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          </HoverHint>
        );
      })}
    </div>
  );
}
