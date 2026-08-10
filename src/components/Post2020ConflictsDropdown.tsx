"use client";

import { useEffect, useRef, useState } from "react";
import { HoverHint } from "@/components/HoverHint";
import {
  formatConflictStartDate,
  POST_2020_CONFLICTS,
  type Post2020Conflict,
} from "@/data/post2020Conflicts";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  activeId: string | null;
  onSelect: (conflict: Post2020Conflict) => void;
  /** 단독 펄스 모드 종료 */
  onClear?: () => void;
};

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.5 4.25L6 7.75L9.5 4.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * NAV 검색 아래 — 주요전장/유틸과 센티넬 사이.
 * 「2020년 이후 일어난 분쟁들」개전일로 단독 펄스 모드 진입.
 */
export function Post2020ConflictsDropdown({
  lang,
  activeId,
  onSelect,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ko = lang !== "en";
  const label = ko ? "2020년 이후 일어난 분쟁들" : "Conflicts since 2020";
  const hint = ko
    ? "개전 지점이 전역 시야 앞으로 오며, 다른 레이어는 끄고 펄스만 표시합니다."
    : "Keeps global view — centers the onset point; clears layers and shows pulse only.";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto relative z-[100]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative flex flex-col items-end">
        <HoverHint placement="bottom" title={label} detail={hint}>
          <button
            id="post-2020-conflicts-dropdown"
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((v) => !v)}
            className={`flex max-w-[min(92vw,220px)] items-center gap-2 border px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-200 ${
              activeId
                ? "border-rose-400/45 bg-rose-950/85 text-rose-50"
                : "border-rose-300/30 bg-[#180a0e]/88 text-rose-100/90 hover:border-rose-200/40"
            } ${
              open
                ? "rounded-t-full rounded-b-md border-b-rose-300/10"
                : "rounded-full"
            }`}
          >
            <span className="truncate font-medium tracking-tight">{label}</span>
            <ChevronDown
              className={`shrink-0 text-rose-200/50 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </HoverHint>

        <div
          className={`absolute right-0 top-full z-[200] w-[min(94vw,320px)] origin-top transition-all duration-200 ease-out ${
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.98] opacity-0"
          }`}
        >
          <div className="overflow-hidden rounded-b-2xl rounded-tl-2xl border border-rose-300/25 border-t-0 bg-[#14080c]/96 shadow-2xl backdrop-blur-md">
            {activeId && onClear ? (
              <div className="border-b border-rose-300/15 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-micro text-rose-200/80 transition hover:bg-rose-500/15 hover:text-rose-50"
                >
                  {ko ? "펄스 모드 종료 · 레이어 복귀 안 함" : "Exit pulse mode"}
                </button>
              </div>
            ) : null}
            <ul
              className="max-h-[min(62vh,420px)] divide-y divide-rose-300/10 overflow-y-auto p-1.5"
              role="listbox"
            >
              {POST_2020_CONFLICTS.map((c) => {
                const active = activeId === c.id;
                const dateLabel = formatConflictStartDate(
                  c.startDate,
                  ko ? "ko" : "en",
                );
                const note =
                  c.noteDate &&
                  `${ko ? c.noteDateLabelKo : c.noteDateLabelEn}: ${formatConflictStartDate(
                    c.noteDate,
                    ko ? "ko" : "en",
                  )}`;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onSelect(c);
                        setOpen(false);
                      }}
                      className={`flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left transition ${
                        active
                          ? "bg-rose-500/20 text-rose-50"
                          : "text-rose-50/90 hover:bg-rose-500/12"
                      }`}
                    >
                      <span className="font-data-mono text-micro tracking-wide text-rose-300/90">
                        {dateLabel}
                        {note ? ` · ${note}` : ""}
                      </span>
                      <span className="text-xs font-medium leading-snug">
                        {ko ? c.nameKo : c.nameEn}
                      </span>
                      <span className="text-micro leading-snug text-rose-200/55">
                        {ko ? c.partiesKo : c.partiesEn}
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
