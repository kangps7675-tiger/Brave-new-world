"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerCategory } from "@/components/LayerCategoryPanel";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type LayerQuickDropdownProps = {
  categories: LayerCategory[];
  lang: LabelLanguage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function countChecked(categories: LayerCategory[]): number {
  let n = 0;
  const walk = (items: LayerCategory["items"]) => {
    for (const item of items) {
      if (item.options?.length) walk(item.options);
      else if (item.checked) n += 1;
    }
  };
  for (const cat of categories) walk(cat.items);
  return n;
}

/**
 * 모드 토글 아래 레이어 체크 드롭다운.
 * 체크는 지도에 즉시 반영(togglePref). 「설정하기」는 확정·닫기 CTA.
 */
export function LayerQuickDropdown({
  categories,
  lang,
  open,
  onOpenChange,
}: LayerQuickDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const light = useBasemapTone() === "light";
  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const checkedCount = useMemo(() => countChecked(categories), [categories]);

  useEffect(() => {
    if (!open) {
      setTouched(false);
      setQuery("");
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.detail.toLowerCase().includes(q) ||
            item.id.includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, query]);

  const markTouchedAnd =
    (onChange: (checked: boolean) => void) => (checked: boolean) => {
      setTouched(true);
      onChange(checked);
    };

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <div ref={rootRef} className="relative z-[200]">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        className={`map-chrome-control flex h-9 items-center gap-1.5 rounded-xl border px-3 text-meta font-medium shadow-md transition ${
          light
            ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            : "border-sky-200/20 bg-[#162a48]/70 text-sky-50/95 backdrop-blur-md hover:border-sky-300/40 hover:bg-[#1e3a5f]/75"
        }`}
      >
        <span>{t("layers", lang)}</span>
        <span className="rounded-full bg-sky-400/20 px-1.5 py-0.5 text-micro tabular-nums text-sky-100">
          {checkedCount}
        </span>
        <span aria-hidden className={`text-micro opacity-60 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={lang === "en" ? "Layer quick toggles" : "레이어 빠른 토글"}
          className={`absolute left-1/2 top-[calc(100%+0.45rem)] z-[300] flex w-[min(92vw,44rem)] max-h-[min(78vh,36rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border shadow-2xl ${
            light
              ? "border-slate-200 bg-white text-slate-900"
              : "border-sky-200/20 bg-[#0c1528]/95 text-sky-50 backdrop-blur-xl"
          }`}
        >
          <div className="shrink-0 border-b border-sky-200/10 px-3 py-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "en" ? "Search layers…" : "레이어 검색…"}
              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none ${
                light
                  ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-slate-400"
                  : "border-sky-200/15 bg-slate-950/40 text-sky-50 placeholder:text-sky-100/35 focus:border-sky-300/40"
              }`}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <p className={`py-6 text-center text-xs ${light ? "text-slate-500" : "text-sky-100/45"}`}>
                {lang === "en" ? "No matching layers" : "일치하는 레이어 없음"}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filtered.map((cat) => (
                  <section
                    key={cat.id}
                    className={`rounded-xl border p-2.5 ${
                      light ? "border-slate-200 bg-slate-50" : "border-sky-200/10 bg-slate-950/35"
                    }`}
                  >
                    <h3 className={`mb-2 text-micro font-semibold uppercase tracking-[0.14em] ${
                      light ? "text-slate-500" : "text-sky-200/55"
                    }`}>
                      {cat.title}
                    </h3>
                    <ul className="space-y-1">
                      {cat.items.map((item) => (
                        <li key={item.id}>
                          <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 transition hover:bg-sky-400/10">
                            <input
                              type="checkbox"
                              className="mt-0.5 accent-sky-400"
                              checked={item.checked}
                              disabled={item.disabled}
                              onChange={(e) =>
                                markTouchedAnd(item.onChange)(e.target.checked)
                              }
                            />
                            <span className="min-w-0">
                              <span className={`block text-meta font-medium ${light ? "text-slate-900" : "text-sky-50/95"}`}>
                                {item.label}
                              </span>
                              <span className={`block text-micro leading-4 ${light ? "text-slate-500" : "text-sky-100/40"}`}>
                                {item.detail}
                              </span>
                            </span>
                          </label>
                          {item.options?.length ? (
                            <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-sky-200/10 pl-2">
                              {item.options.map((opt) => (
                                <li key={opt.id}>
                                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-sky-400/10">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 accent-sky-400"
                                      checked={opt.checked}
                                      disabled={opt.disabled}
                                      onChange={(e) =>
                                        markTouchedAnd(opt.onChange)(e.target.checked)
                                      }
                                    />
                                    <span className={`text-micro ${light ? "text-slate-700" : "text-sky-100/85"}`}>{opt.label}</span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
          <div className={`shrink-0 border-t px-3 py-2.5 ${light ? "border-slate-200 bg-slate-50" : "border-sky-200/15 bg-[#0a1424]/98"}`}>
            <p className={`mb-2 text-micro leading-4 ${light ? "text-slate-500" : "text-sky-100/50"}`}>
              {t("layerQuickApplyHint", lang)}
            </p>
            <button
              type="button"
              onClick={handleApply}
              className={`w-full rounded-xl px-3 py-2.5 text-caption font-semibold transition ${
                light
                  ? touched
                    ? "border border-slate-400 bg-slate-900 text-white hover:bg-slate-800"
                    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                  : touched
                    ? "border border-sky-300/55 bg-sky-500/35 text-sky-50 hover:bg-sky-500/50"
                    : "border border-sky-200/25 bg-sky-500/15 text-sky-100/90 hover:bg-sky-500/30"
              }`}
            >
              {t("layerQuickApply", lang)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
