"use client";

import { useEffect, useRef, useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import {
  scenarioPresetsForMode,
  type ScenarioPresetId,
} from "@/lib/scenarioPresets";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

/**
 * 시나리오 프리셋 — 가로 칩 대신 「주요전장/허브」 드롭다운.
 * 항목 = 레이어 세트 + 카메라 + 하단 Intel (한 번에 적용).
 */

type Props = {
  mode: ViewerMode;
  activeId: ScenarioPresetId | null;
  lang?: LabelLanguage;
  onSelect: (id: ScenarioPresetId) => void;
};

export function ScenarioPresetChips({ mode, activeId, lang = "ko", onSelect }: Props) {
  const presets = scenarioPresetsForMode(mode);
  const economy = mode === "economy";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const menuLabel = economy
    ? lang === "en"
      ? "Key hubs"
      : "주요 허브"
    : lang === "en"
      ? "Key theaters"
      : "주요전장";
  const menuHint = economy
    ? lang === "en"
      ? "One-tap layer set + camera for markets and logistics."
      : "시장·물류 시나리오 레이어와 카메라로 한 번에 이동합니다."
    : lang === "en"
      ? "One-tap layer set + camera for flashpoint theaters."
      : "대만·우크라·호르무즈·한반도·핵 등 전장 레이어와 카메라로 이동합니다.";

  const activePreset = presets.find((p) => p.id === activeId) ?? null;
  const triggerText = activePreset
    ? lang === "en"
      ? activePreset.labelEn
      : activePreset.labelKo
    : menuLabel;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(id: ScenarioPresetId) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto relative z-[100]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative flex flex-col items-center">
        <HoverHint placement="bottom" title={menuLabel} detail={menuHint}>
          <button
            id="scenario-theater-dropdown"
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={menuLabel}
            onClick={() => setOpen((value) => !value)}
            className={`flex min-h-[var(--tap-target-min)] items-center gap-2 border px-3 py-2 text-caption font-semibold tracking-tight shadow-lg backdrop-blur-md transition-all duration-200 ${
              economy
                ? "border-emerald-300/25 bg-[#071018]/88 text-emerald-100/90 hover:border-emerald-200/35"
                : "border-sky-300/25 bg-[#0a1830]/88 text-sky-100/90 hover:border-sky-200/35"
            } ${
              open
                ? economy
                  ? "rounded-t-full rounded-b-md border-b-emerald-300/10"
                  : "rounded-t-full rounded-b-md border-b-sky-300/10"
                : "rounded-full"
            } ${
              activePreset
                ? economy
                  ? "border-emerald-300/55 bg-emerald-500/20 text-emerald-50"
                  : "border-sky-300/55 bg-sky-500/20 text-sky-50"
                : ""
            }`}
          >
            <span className="max-w-[10rem] truncate">{triggerText}</span>
            <ChevronDown
              className={`shrink-0 opacity-55 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </HoverHint>

        <div
          className={`absolute top-full z-[200] w-[min(92vw,260px)] origin-top transition-all duration-200 ease-out ${
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.98] opacity-0"
          }`}
        >
          <div
            className={`overflow-hidden rounded-b-2xl rounded-t-md border border-t-0 shadow-2xl backdrop-blur-md ${
              economy
                ? "border-emerald-300/20 bg-[#071018]/95"
                : "border-sky-300/20 bg-[#0a1830]/95"
            }`}
          >
            <p
              className={`border-b px-3 py-2 text-micro uppercase tracking-[0.16em] ${
                economy
                  ? "border-emerald-300/15 text-emerald-200/55"
                  : "border-sky-300/15 text-sky-200/55"
              }`}
            >
              {menuLabel}
            </p>
            <ul
              className={`divide-y p-1.5 ${
                economy ? "divide-emerald-300/10" : "divide-sky-300/10"
              }`}
              role="listbox"
              aria-label={menuLabel}
            >
              {presets.map((preset) => {
                const active = preset.id === activeId;
                const label = lang === "en" ? preset.labelEn : preset.labelKo;
                const hint = lang === "en" ? preset.hintEn : preset.hintKo;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      aria-label={`${label} — ${hint}`}
                      title={hint}
                      onClick={() => handleSelect(preset.id)}
                      className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? economy
                            ? "bg-emerald-400/15 text-emerald-50"
                            : "bg-sky-400/15 text-sky-50"
                          : economy
                            ? "text-emerald-100/90 hover:bg-emerald-300/10"
                            : "text-sky-100/90 hover:bg-sky-300/10"
                      }`}
                    >
                      <span className="text-sm font-semibold leading-tight">{label}</span>
                      <span
                        className={`mt-0.5 text-meta leading-snug ${
                          active
                            ? economy
                              ? "text-emerald-100/75"
                              : "text-sky-100/75"
                            : economy
                              ? "text-emerald-200/50"
                              : "text-sky-200/50"
                        }`}
                      >
                        {hint}
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
