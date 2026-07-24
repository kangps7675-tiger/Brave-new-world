"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import type { ViewerMode } from "@/lib/viewPackages";

type ViewModeSwitcherProps = {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
};

export function ViewModeSwitcher({ mode, onChange }: ViewModeSwitcherProps) {
  const { t } = useLocale();

  const MODES: Array<{ id: ViewerMode; label: string; hint: string }> = [
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

  return (
    <div
      id="view-mode-switcher"
      className="flex rounded-full border border-sky-200/15 bg-[#0f1d35]/88 p-0.5 shadow-lg backdrop-blur-xl"
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
              onClick={() => {
                if (!active) onChange(item.id);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                active
                  ? item.id === "economy"
                    ? "bg-emerald-400/25 text-emerald-50 ring-1 ring-emerald-300/35"
                    : "bg-sky-400/25 text-sky-50 ring-1 ring-sky-300/35"
                  : "text-sky-100/60 hover:bg-white/5 hover:text-sky-50"
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
