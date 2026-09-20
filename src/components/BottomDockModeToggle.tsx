"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

/** 지정학 하단 독 — 역사 영토 ↔ 주간 함선 (뉴스는 인텔 시트) */
export type BottomDockMode = "territory" | "ships";

const DOCK_MODE_KEY = "cv-bottom-dock-mode";

export function readBottomDockMode(): BottomDockMode {
  if (typeof window === "undefined") return "ships";
  try {
    const raw = sessionStorage.getItem(DOCK_MODE_KEY);
    if (raw === "territory" || raw === "ships") return raw;
    // 레거시: history(asOf) → 영토, news → 함선
    if (raw === "history") return "territory";
    if (raw === "news") return "ships";
  } catch {
    /* ignore */
  }
  return "ships";
}

export function writeBottomDockMode(mode: BottomDockMode) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DOCK_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

type BottomDockModeToggleProps = {
  lang: LabelLanguage;
  mode: BottomDockMode;
  onChange: (mode: BottomDockMode) => void;
  compact?: boolean;
  /** 상단 고정 스트립 — 불투명 패널 없이 지도가 비치게 */
  transparent?: boolean;
};

/**
 * 하단 독 — 역사 영토(연도 스크럽) / 주간 함선 전환.
 * 상단 3토글의「역사」슬롯을 대체한다.
 */
export function BottomDockModeToggle({
  lang,
  mode,
  onChange,
  compact = false,
  transparent = false,
}: BottomDockModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label={t("bottomDockToggleAria", lang)}
      className={`pointer-events-auto mx-auto flex w-fit items-center gap-0.5 rounded-full border p-0.5 ${
        transparent
          ? "border-sky-200/25 bg-transparent shadow-none backdrop-blur-none"
          : "border-sky-200/20 bg-[#0a1428]/88 shadow-lg backdrop-blur-md"
      } ${compact ? "text-micro" : "text-caption"}`}
    >
      {(
        [
          {
            id: "territory" as const,
            label: t("bottomDockTerritory", lang),
            title: t("bottomDockTerritoryHint", lang),
          },
          {
            id: "ships" as const,
            label: t("bottomDockShips", lang),
            title: t("bottomDockShipsHint", lang),
          },
        ] as const
      ).map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={item.title}
            onClick={() => onChange(item.id)}
            className={`tap-target min-h-[36px] rounded-full px-3.5 font-medium transition ${
              active
                ? item.id === "territory"
                  ? "bg-amber-500/25 text-amber-50 shadow-sm"
                  : "bg-sky-500/30 text-sky-50 shadow-sm"
                : "text-sky-100/55 hover:bg-white/5 hover:text-sky-50/85"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
