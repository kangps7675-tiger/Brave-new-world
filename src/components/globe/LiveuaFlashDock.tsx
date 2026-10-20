"use client";

import { useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { peelUrlsFromText } from "@/lib/liveuamap/peelTitleUrls";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

type Props = {
  lang: LabelLanguage;
  events: LiveuamapEvent[];
  unreadCount: number;
  /** 이미 연 속보 — 흐리게 + 읽음 표시. 목록에서 지우지는 않는다 */
  readIds?: ReadonlySet<string>;
  onMarkAllRead?: () => void;
  onOpen: (index: number) => void;
  /** 책갈피 레일 안에서는 헤더·접기를 숨긴다 */
  chrome?: "full" | "bare";
};

export function LiveuaFlashDock({
  lang,
  events,
  unreadCount,
  readIds,
  onMarkAllRead,
  onOpen,
  chrome = "full",
}: Props) {
  const en = lang === "en";
  const bare = chrome === "bare";
  const [open, setOpen] = useState(false);
  const expanded = bare || open;
  const unopenedCount = readIds
    ? events.filter((ev) => !readIds.has(ev.id)).length
    : 0;

  return (
    <section
      className={
        bare
          ? "pointer-events-auto flex flex-col overflow-hidden"
          : "pointer-events-auto flex max-w-[min(18rem,70vw)] flex-col overflow-hidden rounded-md border border-amber-600/35 bg-[#120e08]/92"
      }
      aria-label={en ? "Frontline flash inbox" : "전선 속보함"}
    >
      {!bare ? (
        <button
          type="button"
          className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-micro text-amber-100/90 transition hover:bg-amber-500/10 ${
            expanded ? "border-b border-amber-600/25" : ""
          }`}
          aria-expanded={expanded}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="font-medium tracking-wide">
            {en ? "Energy · routes" : "유가·항로"}
          </span>
          <span className="flex items-center gap-1.5 tabular-nums text-amber-200/70">
            {unreadCount > 0 ? (
              <span className="rounded-sm bg-amber-600/80 px-1 text-micro text-black">
                {unreadCount}
              </span>
            ) : null}
            {events.length}
            <span aria-hidden>{expanded ? "▾" : "▴"}</span>
          </span>
        </button>
      ) : null}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`min-h-0 overflow-hidden ${expanded ? "" : "pointer-events-none"}`}>
          {events.length === 0 ? (
            <p className="px-2.5 py-2 text-micro text-amber-200/50">
              {en
                ? "No oil · gas · chokepoint flashes yet."
                : "유가·가스·해협 속보가 아직 없습니다."}
            </p>
          ) : (
            <>
            {onMarkAllRead && unopenedCount > 0 ? (
              <div className="flex items-center justify-between gap-2 border-b border-amber-600/20 px-2.5 py-1 text-micro text-amber-200/60">
                <span className="tabular-nums">
                  {en ? `${unopenedCount} not opened` : `안 연 속보 ${unopenedCount}`}
                </span>
                <button
                  type="button"
                  tabIndex={expanded ? 0 : -1}
                  className="rounded-sm px-1 text-amber-200/80 hover:bg-amber-500/15 hover:text-amber-50"
                  onClick={onMarkAllRead}
                >
                  {en ? "Mark all read" : "모두 읽음 처리"}
                </button>
              </div>
            ) : null}
            <ul className={`intel-scroll-y max-h-72 overflow-y-auto font-sans ${en ? "font-en" : ""}`}>
              {events.map((ev, index) => {
                const raw =
                  lang === "ko" ? ev.titleKo?.trim() || ev.title : ev.title;
                const title = peelUrlsFromText(raw).text || raw;
                const isRead = readIds?.has(ev.id) ?? false;
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      tabIndex={expanded ? 0 : -1}
                      className={`flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-amber-500/10 ${
                        isRead ? "opacity-55 hover:opacity-90" : ""
                      }`}
                      aria-label={isRead ? `${title} (${en ? "read" : "읽음"})` : undefined}
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
                        <span className="flex items-center gap-1.5 text-micro font-medium tracking-tight text-amber-300/75">
                          {readIds && !isRead ? (
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                            />
                          ) : null}
                          {ev.regionId}
                          {isRead ? (
                            <span className="text-amber-200/60">
                              ✓ {en ? "Read" : "읽음"}
                            </span>
                          ) : null}
                        </span>
                        <span className="line-clamp-2 text-meta font-medium tracking-tight text-amber-50">
                          {title}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
