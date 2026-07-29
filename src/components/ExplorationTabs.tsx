"use client";

import { useEffect, useRef, useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import type { ExplorationPreset } from "@/data/navRegions";

type ExplorationTabsProps = {
  presets: ExplorationPreset[];
  activeId: string | null;
  onSelect: (preset: ExplorationPreset) => void;
  label?: string;
  hint?: string;
  /** hubs = emerald styling (economy); fronts = sky (conflict) */
  variant?: "fronts" | "hubs";
  /** 메뉴 안 임베드 시 stretch */
  align?: "end" | "stretch";
};

export function ExplorationTabs({
  presets,
  activeId,
  onSelect,
  label = "주요전장",
  hint = "대만·한반도·우크라이나·중동 등 지정학적 충돌지로 바로 이동합니다.",
  variant = "fronts",
  align = "end",
}: ExplorationTabsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(preset: ExplorationPreset) {
    onSelect(preset);
    setOpen(false);
  }

  const stretch = align === "stretch";

  return (
    <div
      ref={rootRef}
      className={`pointer-events-auto relative z-[100] ${stretch ? "w-full" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className={`relative flex flex-col ${stretch ? "items-stretch" : "items-end"}`}>
        <HoverHint placement="bottom" title={label} detail={hint}>
          <button
            id="exploration-theater-dropdown"
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((value) => !value)}
            className={`flex items-center gap-2 border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-200 ${
              stretch ? "w-full justify-between" : ""
            } ${
              variant === "hubs"
                ? "border-emerald-300/25 bg-[#071018]/88 text-emerald-100/90 hover:border-emerald-200/35"
                : "border-sky-300/25 bg-[#0a1830]/88 text-sky-100/90 hover:border-sky-200/35"
            } ${
              open
                ? "rounded-t-full rounded-b-md border-b-emerald-300/10"
                : "rounded-full"
            }`}
          >
            <span className="font-medium tracking-tight">{label}</span>
            <ChevronDown
              className={`text-sky-200/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </HoverHint>

        <div
          className={`absolute top-full z-[200] origin-top transition-all duration-200 ease-out ${
            stretch ? "left-0 right-0 w-full" : "right-0 w-[min(92vw,240px)]"
          } ${
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.98] opacity-0"
          }`}
        >
          <div className="overflow-hidden rounded-b-2xl rounded-tl-2xl border border-sky-300/20 border-t-0 bg-[#0a1830]/95 shadow-2xl backdrop-blur-md">
            <ul className="divide-y divide-sky-300/10 p-1.5" role="listbox">
              {presets.map((preset) => {
                const active = activeId === preset.id;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => handleSelect(preset)}
                      className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-sky-400/15 text-sky-50"
                          : "text-sky-100/90 hover:bg-sky-300/10"
                      }`}
                    >
                      <span className="text-sm font-semibold leading-tight">{preset.label}</span>
                      <span
                        className={`mt-0.5 text-meta leading-snug ${
                          active ? "text-sky-100/75" : "text-sky-200/50"
                        }`}
                      >
                        {preset.tagline}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
