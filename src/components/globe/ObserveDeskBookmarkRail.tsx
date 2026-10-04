"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { zc } from "@/lib/uiStack";

export type ObserveDeskTabId = "flash" | "board" | "alerts" | "verify";

type TabDef = {
  id: ObserveDeskTabId;
  ko: string;
  en: string;
  accent: "amber" | "teal" | "cyan" | "violet";
  badge?: number;
  visible?: boolean;
};

type Props = {
  lang: LabelLanguage;
  unreadFlash?: number;
  alertCount?: number;
  boardCount?: number;
  hasVerify?: boolean;
  /** 포커스 안건이 생기면 검증 탭을 자동으로 연다 */
  autoOpenVerify?: boolean;
  flash: ReactNode;
  board: ReactNode;
  alerts: ReactNode;
  verify?: ReactNode;
};

const ACCENT: Record<
  TabDef["accent"],
  { tab: string; panel: string }
> = {
  amber: {
    tab: "border-amber-700/55 bg-[#f0d99f]/95 text-[#34230f] hover:bg-[#f8e8bd]",
    panel: "border-amber-600/35 bg-[#120e08]/94",
  },
  teal: {
    tab: "border-teal-600/50 bg-[#0a2430]/95 text-teal-50 hover:bg-[#0e3140]",
    panel: "border-teal-500/35 bg-[#041018]/94",
  },
  cyan: {
    tab: "border-cyan-600/45 bg-[#062028]/95 text-cyan-50 hover:bg-[#0a2e38]",
    panel: "border-cyan-500/30 bg-[#041018]/94",
  },
  violet: {
    tab: "border-violet-500/45 bg-[#1a1230]/95 text-violet-50 hover:bg-[#241840]",
    panel: "border-violet-400/30 bg-[#0c0818]/94",
  },
};

/**
 * 등불뉴스 접힘 탭과 같은 책갈피 패턴 —
 * 전선 속보·안건판·훈련/해상 알림·교차확인 HUD를 화면 좌측에 세로로 꽂아 두고
 * 필요할 때만 펼친다. 하단 관측대 독은 센서·스크러버만 남긴다.
 */
export function ObserveDeskBookmarkRail({
  lang,
  unreadFlash = 0,
  alertCount = 0,
  boardCount = 0,
  hasVerify = false,
  autoOpenVerify = false,
  flash,
  board,
  alerts,
  verify,
}: Props) {
  const en = lang === "en";
  const [active, setActive] = useState<ObserveDeskTabId | null>("board");

  useEffect(() => {
    if (autoOpenVerify && hasVerify) setActive("verify");
  }, [autoOpenVerify, hasVerify]);

  const tabs: TabDef[] = [
    {
      id: "flash",
      ko: "속보",
      en: "Flash",
      accent: "amber",
      badge: unreadFlash > 0 ? unreadFlash : undefined,
    },
    {
      id: "board",
      ko: "안건",
      en: "Desk",
      accent: "teal",
      badge: boardCount > 0 ? boardCount : undefined,
    },
    {
      id: "alerts",
      ko: "알림",
      en: "Alert",
      accent: "cyan",
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      id: "verify",
      ko: "검증",
      en: "Verify",
      accent: "violet",
      visible: hasVerify,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible !== false);
  const activeAccent =
    visibleTabs.find((t) => t.id === active)?.accent ?? "teal";

  const panel: ReactNode =
    active === "flash"
      ? flash
      : active === "board"
        ? board
        : active === "alerts"
          ? alerts
          : active === "verify"
            ? verify
            : null;

  return (
    <div
      className={`pointer-events-auto fixed right-0 ${zc("mapControl")} flex flex-row-reverse items-start gap-1.5`}
      style={{
        top: "calc(var(--mode-index-chip-bottom, 4rem) + 0.75rem)",
      }}
      role="region"
      aria-label={en ? "Observatory bookmarks" : "관측 책갈피"}
    >
      <div className="flex flex-col items-end gap-1.5">
        {visibleTabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive((cur) => (cur === tab.id ? null : tab.id))}
              className={`group flex items-center gap-1.5 rounded-l-md border border-r-0 py-2.5 pl-2 pr-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:pr-2.5 ${ACCENT[tab.accent].tab} ${
                selected ? "pr-2.5 ring-1 ring-white/25" : ""
              }`}
              aria-pressed={selected}
              aria-label={en ? tab.en : tab.ko}
              title={en ? tab.en : tab.ko}
            >
              {tab.badge != null ? (
                <span className="rounded-sm bg-black/25 px-1 text-micro tabular-nums">
                  {tab.badge}
                </span>
              ) : null}
              <span
                className="text-micro font-semibold tracking-[0.14em]"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                {en ? tab.en : tab.ko}
              </span>
            </button>
          );
        })}
      </div>

      {panel ? (
        <div
          className={`max-h-[min(70vh,36rem)] w-[min(22rem,84vw)] overflow-y-auto rounded-md border shadow-lg backdrop-blur-md ${ACCENT[activeAccent].panel}`}
        >
          {panel}
        </div>
      ) : null}
    </div>
  );
}
