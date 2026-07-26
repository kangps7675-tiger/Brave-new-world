"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import type { BasemapMode } from "@/lib/basemapMode";

type BasemapModeToggleProps = {
  mode: BasemapMode;
  onChange: (mode: BasemapMode) => void;
};

export function BasemapModeToggle({ mode, onChange }: BasemapModeToggleProps) {
  const { t } = useLocale();

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
      className="flex rounded-full border border-sky-200/15 bg-[#0f1d35]/88 p-0.5 shadow-lg backdrop-blur-xl"
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
                    ? "bg-amber-400/20 text-amber-50 ring-1 ring-amber-300/35"
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
