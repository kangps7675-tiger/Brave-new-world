"use client";

import { useMemo, useState } from "react";

export type IntelSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
};

type IntelSheetSearchBarProps = {
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  results: IntelSearchResult[];
  onSelect: (result: IntelSearchResult) => void;
  tone?: "sky" | "emerald";
};

export function IntelSheetSearchBar({
  placeholder,
  query,
  onQueryChange,
  results,
  onSelect,
  tone = "sky",
}: IntelSheetSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const showDropdown = focused && query.trim().length > 0;
  const preview = useMemo(() => results.slice(0, 8), [results]);

  const border =
    tone === "emerald" ? "border-emerald-400/20 bg-emerald-950/25" : "border-sky-300/15 bg-sky-950/25";
  const inputText = tone === "emerald" ? "text-emerald-50 placeholder:text-emerald-100/35" : "text-sky-50 placeholder:text-sky-100/35";
  const hover = tone === "emerald" ? "hover:bg-emerald-400/10" : "hover:bg-sky-400/10";

  return (
    <div className="relative min-w-0 flex-1">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${border}`}>
        <SearchIcon className={tone === "emerald" ? "text-emerald-200/45" : "text-sky-200/45"} />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm outline-none ${inputText}`}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className={`text-xs ${tone === "emerald" ? "text-emerald-100/45" : "text-sky-100/45"}`}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border shadow-2xl backdrop-blur-md ${
            tone === "emerald"
              ? "border-emerald-400/20 bg-[#071018]/98"
              : "border-sky-300/15 bg-[#0a1428]/98"
          }`}
        >
          {preview.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">검색 결과 없음</p>
          ) : (
            preview.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(item);
                  onQueryChange("");
                  setFocused(false);
                }}
                className={`flex w-full items-start justify-between gap-2 border-b px-3 py-2.5 text-left text-sm last:border-b-0 ${hover} ${
                  tone === "emerald" ? "border-emerald-400/10" : "border-sky-300/8"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block truncate ${tone === "emerald" ? "text-emerald-50" : "text-sky-50"}`}>
                    {item.title}
                  </span>
                  {item.subtitle ? (
                    <span className="mt-0.5 block truncate text-meta text-slate-500">{item.subtitle}</span>
                  ) : null}
                </span>
                {item.badge ? (
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-micro text-slate-400">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`shrink-0 ${className ?? ""}`} aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
