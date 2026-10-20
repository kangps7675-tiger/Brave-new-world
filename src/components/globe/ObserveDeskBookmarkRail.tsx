"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { zc } from "@/lib/uiStack";

export type ObserveDeskTabId = "board" | "verify" | "case";

type TabDef = {
  id: ObserveDeskTabId;
  ko: string;
  en: string;
  accent: "teal" | "violet" | "rose";
  badge?: number;
  visible?: boolean;
};

type Props = {
  lang: LabelLanguage;
  boardCount?: number;
  hasVerify?: boolean;
  /** 포커스 안건이 생기면 검증 탭을 자동으로 연다 */
  autoOpenVerify?: boolean;
  /** 활성 사건 ID가 있으면 배지 */
  hasCase?: boolean;
  board: ReactNode;
  verify?: ReactNode;
  casePanel?: ReactNode;
};

const ACCENT: Record<
  TabDef["accent"],
  { tab: string; panel: string }
> = {
  teal: {
    tab: "border-teal-600/50 bg-[#0a2430]/95 text-teal-50 hover:bg-[#0e3140]",
    panel: "border-teal-500/35 bg-[#041018]/94",
  },
  violet: {
    tab: "border-violet-500/45 bg-[#1a1230]/95 text-violet-50 hover:bg-[#241840]",
    panel: "border-violet-400/30 bg-[#0c0818]/94",
  },
  rose: {
    tab: "border-rose-500/45 bg-[#2a1018]/95 text-rose-50 hover:bg-[#3a1520]",
    panel: "border-rose-400/30 bg-[#140810]/94",
  },
};

/**
 * 등불뉴스 접힘 탭과 같은 책갈피 패턴 —
 * 관측판·교차확인(검증)·케이스를 화면 우측에 세로로 꽂아 두고 필요할 때만 펼친다.
 * 속보는 지정학 지도 화면의 전선 속보 서랍 한 곳에서만 본다(여기에는 두지 않는다). 하단 관측대 독은 센서·스크러버만 남긴다.
 */
export function ObserveDeskBookmarkRail({
  lang,
  boardCount = 0,
  hasVerify = false,
  autoOpenVerify = false,
  hasCase = false,
  board,
  verify,
  casePanel,
}: Props) {
  const en = lang === "en";
  const [active, setActive] = useState<ObserveDeskTabId | null>("board");

  useEffect(() => {
    if (autoOpenVerify && hasVerify) setActive("verify");
  }, [autoOpenVerify, hasVerify]);

  const tabs: TabDef[] = [
    {
      id: "board",
      ko: "안건",
      en: "Desk",
      accent: "teal",
      badge: boardCount > 0 ? boardCount : undefined,
    },
    {
      id: "verify",
      ko: "검증",
      en: "Verify",
      accent: "violet",
      visible: hasVerify,
    },
    {
      id: "case",
      ko: "사건",
      en: "Case",
      accent: "rose",
      badge: hasCase ? 1 : undefined,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible !== false);
  const activeAccent =
    visibleTabs.find((t) => t.id === active)?.accent ?? "teal";

  const panel: ReactNode =
    active === "board"
      ? board
      : active === "verify"
        ? verify
        : active === "case"
          ? casePanel
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
