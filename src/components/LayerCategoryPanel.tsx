"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

export type LayerToggleAccent =
  | "emerald"
  | "red"
  | "orange"
  | "amber"
  | "fuchsia"
  | "violet"
  | "blue"
  | "cyan"
  | "white"
  | "green";

export type LayerToggleItem = {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: LayerToggleAccent;
  /** checkbox(기본) | tag(위치 태그 칩) | dropdown(중첩 체크) */
  presentation?: "checkbox" | "tag" | "dropdown";
  /** presentation === "dropdown" 일 때 하위 체크 또는 중첩 드롭다운 */
  options?: LayerToggleItem[];
  disabled?: boolean;
  /** Ultra-Lite 등 — 이름 옆 짧은 경고 태그 */
  cautionTag?: string | null;
  /** 경고 태그 호버 후킹 문구 */
  cautionHint?: string | null;
  /**
   * 지정학/지경학 노출 제한. 없으면 양쪽.
   * 카테고리 필터 후 항목 단위로 한 번 더 거른다.
   */
  modes?: Array<"conflict" | "economy">;
};

export type LayerCategory = {
  id: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  items: LayerToggleItem[];
  footer?: React.ReactNode;
  /** 카테고리 내 boolean 레이어 전체 켜기/끄기 (배치 모드) */
  onToggleAll?: (enabled: boolean) => void;
};

const OPEN_STATE_KEY = "geowatch-layer-categories-open-v1";
const CAUTION_BUBBLE_MS = 2800;

function accentClass(accent: LayerToggleAccent) {
  switch (accent) {
    case "red":
      return "accent-red-400";
    case "orange":
      return "accent-orange-400";
    case "amber":
      return "accent-amber-400";
    case "fuchsia":
      return "accent-fuchsia-400";
    case "violet":
      return "accent-violet-400";
    case "blue":
      return "accent-blue-400";
    case "cyan":
      return "accent-cyan-400";
    case "white":
      return "accent-slate-200";
    case "green":
      return "accent-green-400";
    default:
      return "accent-emerald-300";
  }
}

function tagAccentClasses(accent: LayerToggleAccent, checked: boolean) {
  if (!checked) {
    return "border-slate-700/90 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-300";
  }
  switch (accent) {
    case "red":
      return "border-red-400/45 bg-red-500/15 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.12)]";
    case "orange":
      return "border-orange-400/45 bg-orange-500/15 text-orange-100 shadow-[0_0_12px_rgba(251,146,60,0.12)]";
    case "amber":
      return "border-amber-400/45 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.12)]";
    case "fuchsia":
      return "border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-100";
    case "violet":
      return "border-violet-400/45 bg-violet-500/15 text-violet-100 shadow-[0_0_12px_rgba(168,85,247,0.14)]";
    case "blue":
      return "border-blue-400/45 bg-blue-500/15 text-blue-100";
    case "cyan":
      return "border-cyan-400/50 bg-cyan-500/15 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.14)]";
    default:
      return "border-sky-400/45 bg-sky-500/15 text-sky-100";
  }
}

/** Ultra-Lite 「클릭 주의」— 호버 시 후킹 말풍선이 떴다가 자동으로 사라짐 */
function LayerCautionTag({ tag, hint }: { tag: string; hint: string }) {
  const [open, setOpen] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showBubble = useCallback(() => {
    clearHideTimer();
    setOpen(true);
    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      hideTimerRef.current = null;
    }, CAUTION_BUBBLE_MS);
  }, [clearHideTimer]);

  const hideBubble = useCallback(() => {
    clearHideTimer();
    setOpen(false);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return (
    <span
      className="relative z-10 inline-flex shrink-0"
      onMouseEnter={showBubble}
      onMouseLeave={hideBubble}
      onFocus={showBubble}
      onBlur={hideBubble}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <span
        tabIndex={0}
        role="note"
        aria-label={hint}
        className="cursor-help rounded border border-amber-400/55 bg-amber-500/25 px-1.5 py-px text-[9px] font-semibold tracking-wide text-amber-50 outline-none ring-amber-300/40 focus-visible:ring-2"
      >
        {tag}
      </span>
      <span
        role="tooltip"
        aria-hidden={!open}
        className={`pointer-events-none absolute left-0 bottom-full z-[95] mb-1.5 w-max max-w-[min(72vw,220px)] rounded-lg border border-amber-300/35 bg-[#2a1a08]/97 px-2.5 py-2 text-left shadow-xl backdrop-blur-md transition-all duration-200 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-0.5 scale-[0.96] opacity-0"
        }`}
      >
        <span className="block text-[11px] font-medium leading-snug text-amber-50">{hint}</span>
      </span>
    </span>
  );
}

export function LayerTagToggle({
  label,
  detail,
  checked,
  onChange,
  accent = "emerald",
  cautionTag,
  cautionHint,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: LayerToggleAccent;
  cautionTag?: string | null;
  cautionHint?: string | null;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`min-w-0 rounded-full border px-3 py-2 text-left text-xs transition ${tagAccentClasses(accent, checked)}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="block min-w-0 truncate font-medium">{label}</span>
        {cautionTag && cautionHint ? <LayerCautionTag tag={cautionTag} hint={cautionHint} /> : null}
      </span>
      <span className="mt-0.5 block truncate text-[10px] opacity-75">{detail}</span>
    </button>
  );
}

export function LayerToggle({
  label,
  detail,
  checked,
  onChange,
  accent = "emerald",
  disabled = false,
  cautionTag,
  cautionHint,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: LayerToggleAccent;
  disabled?: boolean;
  cautionTag?: string | null;
  cautionHint?: string | null;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 transition ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-900/40"
      }`}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="block truncate text-slate-200">{label}</span>
          {cautionTag && cautionHint ? <LayerCautionTag tag={cautionTag} hint={cautionHint} /> : null}
        </span>
        <span className="block truncate text-xs text-slate-500">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-4 w-4 shrink-0 ${accentClass(accent)}`}
      />
    </label>
  );
}

/** 드롭다운/중첩 포함 리프 체크 수 */
export function countLayerLeaves(item: LayerToggleItem): { on: number; total: number } {
  if (item.presentation === "dropdown" && item.options?.length) {
    return item.options.reduce(
      (acc, opt) => {
        const c = countLayerLeaves(opt);
        return { on: acc.on + c.on, total: acc.total + c.total };
      },
      { on: 0, total: 0 },
    );
  }
  return { on: item.checked ? 1 : 0, total: 1 };
}

/** 하위 전장 체크를 접는 드롭다운 행 (중첩 드롭다운 지원) */
export function LayerDropdownToggle({
  label,
  detail,
  options,
  accent = "emerald",
}: {
  label: string;
  detail: string;
  options: LayerToggleItem[];
  accent?: LayerToggleAccent;
}) {
  const [open, setOpen] = useState(false);
  const leaf = options.reduce(
    (acc, o) => {
      const c = countLayerLeaves(o);
      return { on: acc.on + c.on, total: acc.total + c.total };
    },
    { on: 0, total: 0 },
  );

  return (
    <div className="rounded-lg px-1 py-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg py-1.5 text-left transition hover:bg-slate-900/40"
      >
        <span className="min-w-0">
          <span className="block truncate text-slate-200">{label}</span>
          <span className="block truncate text-xs text-slate-500">{detail}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
          <span
            className={
              leaf.on > 0
                ? `rounded-full px-2 py-0.5 ${
                    accent === "fuchsia"
                      ? "bg-fuchsia-500/15 text-fuchsia-200"
                      : accent === "violet"
                        ? "bg-violet-500/15 text-violet-200"
                      : accent === "orange"
                        ? "bg-orange-500/15 text-orange-200"
                        : accent === "amber"
                          ? "bg-amber-500/15 text-amber-200"
                          : accent === "green"
                            ? "bg-green-500/15 text-green-200"
                            : "bg-sky-500/15 text-sky-200"
                  }`
                : ""
            }
          >
            {leaf.on}/{leaf.total}
          </span>
          <span className="text-slate-400" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </span>
      </button>
      {open ? (
        <div className="ml-2 space-y-0.5 border-l border-slate-700/70 pl-2.5">
          {options.map((opt) =>
            opt.presentation === "dropdown" && opt.options?.length ? (
              <LayerDropdownToggle
                key={opt.id}
                label={opt.label}
                detail={opt.detail}
                options={opt.options}
                accent={opt.accent ?? accent}
              />
            ) : (
              <LayerToggle
                key={opt.id}
                label={opt.label}
                detail={opt.detail}
                checked={opt.checked}
                onChange={opt.onChange}
                accent={opt.accent ?? accent}
                disabled={opt.disabled}
                cautionTag={opt.cautionTag}
                cautionHint={opt.cautionHint}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LayerCategoryPanel({
  categories,
  batchStatus,
  autoExpandCategoryId,
  autoExpandWhen,
  expandActiveCategories = false,
}: {
  categories: LayerCategory[];
  batchStatus?: string | null;
  /** 조건이 true일 때 해당 카테고리를 자동 펼침 */
  autoExpandCategoryId?: string;
  autoExpandWhen?: boolean;
  /** 켜진 레이어가 있는 카테고리를 자동 펼침 (저장된 접기 상태는 존중) */
  expandActiveCategories?: boolean;
}) {
  const { t } = useLocale();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_STATE_KEY);
      if (raw) {
        setOpenMap(JSON.parse(raw) as Record<string, boolean>);
      }
    } catch {
      // ignore — default collapsed
    }
    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!autoExpandCategoryId || !autoExpandWhen) return;
    setOpenMap((prev) => {
      if (prev[autoExpandCategoryId]) return prev;
      const next = { ...prev, [autoExpandCategoryId]: true };
      try {
        localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [autoExpandCategoryId, autoExpandWhen]);

  useEffect(() => {
    if (!expandActiveCategories || !storageLoaded) return;
    setOpenMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const category of categories) {
        const hasActive = category.items.some((item) => countLayerLeaves(item).on > 0);
        if (hasActive && prev[category.id] !== false && !next[category.id]) {
          next[category.id] = true;
          changed = true;
        }
      }
      if (!changed) return prev;
      try {
        localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [categories, expandActiveCategories, storageLoaded]);

  const toggleCategory = useCallback((id: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-2">
      {batchStatus ? (
        <p className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-2.5 py-2 text-[11px] leading-4 text-sky-100/90">
          {batchStatus}
        </p>
      ) : null}
      {categories.map((category) => {
        const activeCount = category.items.reduce((n, item) => n + countLayerLeaves(item).on, 0);
        const totalCount = category.items.reduce((n, item) => n + countLayerLeaves(item).total, 0);
        const isOpen = openMap[category.id] ?? false;

        return (
          <div
            key={category.id}
            className={`rounded-lg border border-slate-800/90 bg-slate-950/30 ${
              isOpen ? "overflow-visible" : "overflow-hidden"
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="min-w-0 flex-1 text-left transition hover:opacity-90"
                aria-expanded={isOpen}
              >
                <span className="block text-sm font-medium text-slate-100">{category.title}</span>
                {category.hint ? (
                  <span className="block text-[11px] text-slate-500">{category.hint}</span>
                ) : null}
              </button>
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                {category.onToggleAll ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => category.onToggleAll?.(true)}
                      className="rounded border border-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-sky-400/40 hover:text-sky-200"
                    >
                      {t("layerToggleAll")}
                    </button>
                    <button
                      type="button"
                      onClick={() => category.onToggleAll?.(false)}
                      className="rounded border border-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
                    >
                      {t("layerToggleOff")}
                    </button>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-2 transition hover:text-slate-300"
                  aria-expanded={isOpen}
                  aria-label={`${category.title} ${isOpen ? t("layerCategoryCollapse") : t("layerCategoryExpand")}`}
                >
                  <span
                    className={
                      activeCount > 0 ? "rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-200" : ""
                    }
                  >
                    {activeCount}/{totalCount}
                  </span>
                  <span className="text-slate-400" aria-hidden>
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>
              </div>
            </div>

            {isOpen ? (
              <div className="space-y-0.5 overflow-visible border-t border-slate-800/80 px-2 py-2">
                {category.items.some((item) => item.presentation === "tag") ? (
                  <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {category.items
                      .filter((item) => item.presentation === "tag")
                      .map((item) => (
                        <LayerTagToggle
                          key={item.id}
                          label={item.label}
                          detail={item.detail}
                          checked={item.checked}
                          onChange={item.onChange}
                          accent={item.accent}
                          cautionTag={item.cautionTag}
                          cautionHint={item.cautionHint}
                        />
                      ))}
                  </div>
                ) : null}
                {category.items
                  .filter((item) => item.presentation !== "tag")
                  .map((item) =>
                    item.presentation === "dropdown" && item.options?.length ? (
                      <LayerDropdownToggle
                        key={item.id}
                        label={item.label}
                        detail={item.detail}
                        options={item.options}
                        accent={item.accent}
                      />
                    ) : (
                      <LayerToggle
                        key={item.id}
                        label={item.label}
                        detail={item.detail}
                        checked={item.checked}
                        onChange={item.onChange}
                        accent={item.accent}
                        disabled={item.disabled}
                        cautionTag={item.cautionTag}
                        cautionHint={item.cautionHint}
                      />
                    ),
                  )}
                {category.footer ? (
                  <div className="mt-2 border-t border-slate-800/60 pt-2">{category.footer}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
