"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import type { BasemapMode } from "@/lib/basemapMode";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type BasemapModeToggleProps = {
  mode: BasemapMode;
  onChange: (mode: BasemapMode) => void;
};

export function BasemapModeToggle({ mode, onChange }: BasemapModeToggleProps) {
  const { t } = useLocale();
  const light = useBasemapTone() === "light";

  const MODES: Array<{ id: BasemapMode; label: string; hint: string }> = [
    {
      id: "intel",
      label: t("basemapIntel"),
      hint: t("basemapIntelHint"),
    },
    {
      id: "terrain",
      label: t("basemapTerrain"),
      hint: t("basemapTerrainHint"),
    },
  ];

  return (
    <div
      id="basemap-mode-toggle"
      className={`flex rounded-full border p-0.5 shadow-lg backdrop-blur-xl ${
        light
          ? "border-slate-400/30 bg-white"
          : "border-sky-200/15 bg-[#0f1d35]/88"
      }`}
      role="tablist"
      aria-label={t("basemapModeLabel")}
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
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 ${
                active
                  ? item.id === "terrain"
                    ? light
                      ? "bg-amber-500/20 text-amber-950 ring-1 ring-amber-600/40"
                      : "bg-amber-400/20 text-amber-50 ring-1 ring-amber-300/35"
                    : light
                      ? "bg-cyan-600/15 text-cyan-950 ring-1 ring-cyan-700/35"
                      : "bg-sky-400/25 text-sky-50 ring-1 ring-sky-300/35"
                  : light
                    ? "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
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
