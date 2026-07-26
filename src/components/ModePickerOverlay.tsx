"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { brandName } from "@/lib/brand";
import { ECONOMY_HUB_OPTIONS, type EconomyHubChoice } from "@/lib/autoFlyTarget";
import type { ViewerMode } from "@/lib/viewerChrome";
import {
  MODE_PICKER_CHROME,
  previewModeSelectionLocalized,
  t,
  VIEW_THEATER_LABELS,
} from "@/lib/uiStrings";
import { economyHubLabel } from "@/lib/autoFlyTarget";
import { conceptLayerKeysForSelection } from "@/lib/conceptLayers";
import { LAYER_PREF_LABELS, VIEW_THEATER_OPTIONS, type ViewTheaterChoice } from "@/lib/viewPackages";

type ModePickerOverlayProps = {
  initialMode?: ViewerMode;
  initialTheater?: ViewTheaterChoice;
  initialEconomyHub?: EconomyHubChoice;
  /** 대문에서 이미 지정학/지경학을 고른 경우 — 모드 토글 숨김 */
  lockMode?: boolean;
  onConfirm: (mode: ViewerMode, theater: ViewTheaterChoice, economyHub: EconomyHubChoice) => void;
  onCustom: () => void;
  onCancel?: () => void;
};

const MODES: ViewerMode[] = ["conflict", "economy"];

function layerHoverTitle(
  mode: ViewerMode,
  theater: ViewTheaterChoice,
  economyHub: EconomyHubChoice,
): string {
  const keys = conceptLayerKeysForSelection(mode, theater, economyHub);
  if (keys.length === 0) return "이 선택 시 켜지는 레이어: (기본 유지)";
  const labels = keys
    .map((key) => LAYER_PREF_LABELS[key] ?? key.replace(/^show/, ""))
    .slice(0, 8);
  const more = keys.length > labels.length ? ` 외 ${keys.length - labels.length}` : "";
  return `이 선택 시 켜지는 레이어: ${labels.join(" · ")}${more}`;
}

export function ModePickerOverlay({
  initialMode = "conflict",
  initialTheater = "auto",
  initialEconomyHub = "auto",
  lockMode = false,
  onConfirm,
  onCustom,
  onCancel,
}: ModePickerOverlayProps) {
  const { lang } = useLocale();
  const [mode, setMode] = useState<ViewerMode>(initialMode);
  const [theater, setTheater] = useState<ViewTheaterChoice>(initialTheater);
  const [economyHub, setEconomyHub] = useState<EconomyHubChoice>(initialEconomyHub);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (lockMode) setMode(initialMode);
  }, [initialMode, lockMode]);

  const lockedMode = lockMode ? initialMode : mode;
  const activeMode = lockedMode;

  const preview = useMemo(() => {
    const theaterLabel =
      theater === "auto"
        ? VIEW_THEATER_LABELS[lang].auto
        : VIEW_THEATER_LABELS[lang][theater as keyof (typeof VIEW_THEATER_LABELS)["ko"]];
    const hubLabel = economyHub === "auto" ? VIEW_THEATER_LABELS[lang].auto : economyHubLabel(economyHub);
    return previewModeSelectionLocalized(
      activeMode,
      lang,
      theaterLabel,
      hubLabel,
      theater === "auto",
      economyHub === "auto",
    );
  }, [activeMode, economyHub, lang, theater]);

  function handleStart() {
    onConfirm(
      activeMode,
      activeMode === "conflict" ? theater : "auto",
      activeMode === "economy" ? economyHub : "auto",
    );
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-[#02040a]/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-picker-title"
    >
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-orange-400/20 bg-[#0a1428]/95 p-6 shadow-2xl sm:p-8">
        <p className="text-center text-[11px] font-medium tracking-[0.28em] text-orange-200/75 sm:tracking-[0.36em]">
          {brandName(lang)}
        </p>
        <h1
          id="mode-picker-title"
          className="mt-2 text-center text-xl font-semibold text-slate-50 sm:text-2xl"
        >
          {lockMode
            ? activeMode === "economy"
              ? t("modePickerDetailEconomyTitle", lang)
              : t("modePickerDetailConflictTitle", lang)
            : t("modePickerTitle", lang)}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          {lockMode ? t("modePickerDetailSubtitle", lang) : t("modePickerSubtitle", lang)}
        </p>

        {!lockMode ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {MODES.map((m) => {
              const preset = MODE_PICKER_CHROME[m][lang];
              const active = mode === m;
              const accent =
                m === "economy"
                  ? active
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-50"
                    : "border-slate-700/80 bg-black/20 text-slate-200 hover:border-slate-500"
                  : active
                    ? "border-orange-400/50 bg-orange-500/10 text-orange-50"
                    : "border-slate-700/80 bg-black/20 text-slate-200 hover:border-slate-500";
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(m)}
                  className={`relative flex flex-col rounded-xl border px-4 py-5 text-left transition ${accent}`}
                >
                  <span className="text-base font-semibold">{preset.title}</span>
                  <span className="mt-1 text-[11px] text-slate-400">{preset.tagline}</span>
                  <ul className="mt-3 space-y-1">
                    {preset.bullets.slice(0, 3).map((line) => (
                      <li key={line} className="flex gap-2 text-[10px] leading-snug text-slate-300">
                        <span className={m === "economy" ? "text-emerald-300/80" : "text-orange-300/80"}>
                          ·
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        ) : null}

        {activeMode === "conflict" ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("modePickerTheater", lang)}</p>
            <p className="mt-1 text-[11px] text-slate-600">{t("modePickerTheaterHint", lang)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {VIEW_THEATER_OPTIONS.filter((opt) => opt.id !== "global").map((opt) => {
                const active = theater === opt.id;
                const label =
                  opt.id === "auto"
                    ? VIEW_THEATER_LABELS[lang].auto
                    : VIEW_THEATER_LABELS[lang][opt.id as keyof (typeof VIEW_THEATER_LABELS)["ko"]];
                const hoverTitle = layerHoverTitle("conflict", opt.id, "auto");
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    title={hoverTitle}
                    onClick={() => setTheater(opt.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-sky-400/50 bg-sky-400/15 text-sky-100"
                        : "border-slate-700 bg-black/20 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("modePickerHub", lang)}</p>
            <p className="mt-1 text-[11px] text-slate-600">{t("modePickerHubHint", lang)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ECONOMY_HUB_OPTIONS.map((opt) => {
                const active = economyHub === opt.id;
                const hoverTitle = layerHoverTitle("economy", "auto", opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    title={hoverTitle}
                    onClick={() => setEconomyHub(opt.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                        : "border-slate-700 bg-black/20 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {opt.id === "auto" ? VIEW_THEATER_LABELS[lang].auto : economyHubLabel(opt.id)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2 rounded-lg border border-slate-800 bg-black/25 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {t("modePickerPreview", lang)}
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-slate-300">
            {preview.map((line) => (
              <li key={line} className="flex gap-2">
                <span
                  className={activeMode === "economy" ? "text-emerald-300/80" : "text-orange-300/80"}
                  aria-hidden
                >
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-[10px] leading-snug text-slate-500">
            {layerHoverTitle(
              activeMode,
              activeMode === "conflict" ? theater : "auto",
              activeMode === "economy" ? economyHub : "auto",
            )}
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            {showAdvanced ? t("modePickerAdvancedHide", lang) : t("modePickerAdvancedShow", lang)}
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              {t("cancel", lang)}
            </button>
          ) : null}
          {showAdvanced ? (
            <button
              type="button"
              onClick={onCustom}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              {t("modePickerCustomLayers", lang)}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleStart}
            className={`rounded-xl border px-6 py-2.5 text-sm font-semibold transition ${
              activeMode === "economy"
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30"
                : "border-orange-400/40 bg-orange-500/20 text-orange-50 hover:bg-orange-500/30"
            }`}
          >
            {activeMode === "economy" ? t("modeStartEconomy", lang) : t("modeStartConflict", lang)} →
          </button>
        </div>
      </div>
    </div>
  );
}
