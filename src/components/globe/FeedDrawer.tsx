"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { FEED_TABS, hasUnread, nextOpenTab, type FeedTabId } from "@/lib/feedDrawer/tabs";

const SEEN_KEY = "straitdesk-feed-drawer-seen-v1";

function loadSeen(): Partial<Record<FeedTabId, string>> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<FeedTabId, string>>) : {};
  } catch {
    return {};
  }
}

function saveSeen(seen: Partial<Record<FeedTabId, string>>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* 저장 못 해도 동작에는 지장 없음 */
  }
}

type Props = {
  lang: LabelLanguage;
  /** 탭별 지금 내용의 지문. 바뀌면 이름표에 점이 찍힌다. null = 내용 없음 */
  signatures: Partial<Record<FeedTabId, string | null>>;
  /** 탭 이름표 옆 숫자 (선택) */
  counts?: Partial<Record<FeedTabId, number>>;
  /** 펼쳐진 서랍의 내용 */
  renderTab: (id: FeedTabId) => ReactNode;
};

/**
 * 슬롯 C — 우측 서랍장.
 * 사건 스택(슬롯 A) 바로 아래 붙는다. 이름표는 항상 보이고, 누른 서랍 하나만 펼친다.
 * 새 소식은 점만 찍고 자동으로 펼치지 않는다.
 */
export function FeedDrawer({
  lang,
  signatures,
  counts,
  renderTab,
}: Props) {
  const en = lang === "en";
  const [openTab, setOpenTab] = useState<FeedTabId | null>(null);
  const [seen, setSeen] = useState<Partial<Record<FeedTabId, string>>>({});

  useEffect(() => {
    setSeen(loadSeen());
  }, []);

  const tabs = FEED_TABS;
  const activeTab = openTab;

  /** 열려 있는 서랍은 보고 있는 중이니 새 내용이 와도 점을 찍지 않는다 */
  const activeSig = activeTab ? signatures[activeTab] ?? null : null;
  useEffect(() => {
    if (!activeTab || !activeSig) return;
    setSeen((prev) => {
      if (prev[activeTab] === activeSig) return prev;
      const next = { ...prev, [activeTab]: activeSig };
      saveSeen(next);
      return next;
    });
  }, [activeTab, activeSig]);

  return (
    <section
      className="pointer-events-auto flex min-h-0 w-[min(20rem,84vw)] flex-col overflow-hidden rounded-md border border-teal-500/35 bg-[#041018]/92 shadow-lg backdrop-blur-md"
      aria-label={en ? "Feeds" : "피드 서랍"}
      data-feed-drawer
    >
      <ul className="flex min-h-0 flex-col" role="list">
        {tabs.map((tab) => {
          const open = activeTab === tab.id;
          const dot = !open && hasUnread(signatures[tab.id] ?? null, seen[tab.id]);
          const count = counts?.[tab.id];
          return (
            <li
              key={tab.id}
              className={`flex min-h-0 flex-col border-t border-teal-500/15 first:border-t-0 ${open ? "flex-1" : ""}`}
            >
              <button
                type="button"
                aria-expanded={open}
                className={`flex w-full shrink-0 items-center justify-between gap-2 px-2.5 py-1.5 text-left text-micro transition hover:bg-teal-500/10 ${
                  open ? "bg-teal-500/15 text-cyan-50" : "text-teal-100/85"
                }`}
                onClick={() => {
                  const next = nextOpenTab(activeTab, tab.id);
                  setOpenTab(next);
                }}
              >
                <span className="flex items-center gap-1.5 font-medium tracking-wide">
                  {en ? tab.en : tab.ko}
                  {dot ? (
                    <span
                      aria-label={en ? "New" : "새 소식"}
                      className="h-1.5 w-1.5 rounded-full bg-orange-500"
                    />
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 tabular-nums text-teal-200/60">
                  {typeof count === "number" && count > 0 ? count : null}
                  <span aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`}>
                    ›
                  </span>
                </span>
              </button>
              {open ? (
                <div className="intel-scroll-y max-h-[min(40vh,22rem)] min-h-0 overflow-y-auto border-t border-teal-500/15">
                  {renderTab(tab.id)}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
