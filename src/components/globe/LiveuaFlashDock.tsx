"use client";

import { useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

type Props = {
  lang: LabelLanguage;
  events: LiveuamapEvent[];
  unreadCount: number;
  onOpen: (index: number) => void;
};

export function LiveuaFlashDock({ lang, events, unreadCount, onOpen }: Props) {
  const en = lang === "en";
  const [open, setOpen] = useState(false);

  return (
    <section
      className="pointer-events-auto flex max-w-[min(18rem,70vw)] flex-col overflow-hidden rounded-md border border-amber-600/35 bg-[#120e08]/92"
      aria-label={en ? "Frontline flash inbox" : "전선 속보함"}
    >
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-micro text-amber-100/90 transition hover:bg-amber-500/10 ${
          open ? "border-b border-amber-600/25" : ""
        }`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium tracking-wide">
          {en ? "Frontline" : "전선 속보"}
        </span>
        <span className="flex items-center gap-1.5 tabular-nums text-amber-200/70">
          {unreadCount > 0 ? (
            <span className="rounded-sm bg-amber-600/80 px-1 text-micro text-black">
              {unreadCount}
            </span>
          ) : null}
          {events.length}
          <span aria-hidden>{open ? "▾" : "▴"}</span>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`min-h-0 overflow-hidden ${open ? "" : "pointer-events-none"}`}>
          {events.length === 0 ? (
            <p className="px-2.5 py-2 text-micro text-amber-200/50">
              {en ? "No frontline flashes yet." : "전선 속보가 아직 없습니다."}
            </p>
          ) : (
            <ul className="intel-scroll-y max-h-52 overflow-y-auto">
              {events.map((ev, index) => {
                const title =
                  lang === "ko" ? ev.titleKo?.trim() || ev.title : ev.title;
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-amber-500/10"
                      onClick={() => onOpen(index)}
                    >
                      {ev.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.imageUrl}
                          alt=""
                          className="mt-0.5 h-9 w-12 shrink-0 rounded-sm object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <span className="min-w-0 flex flex-col items-start gap-0.5">
                        <span className="text-micro text-amber-300/75">{ev.regionId}</span>
                        <span className="line-clamp-2 text-meta text-amber-50">{title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
