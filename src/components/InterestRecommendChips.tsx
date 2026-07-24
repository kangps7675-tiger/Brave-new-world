"use client";

import { useInterestProfile } from "@/hooks/useInterestProfile";
import { useLocale } from "@/contexts/LocaleContext";
import type { InterestRecommendChip } from "@/lib/interest/interestTypes";
import type { NewsTheater } from "@/lib/news/types";
import { isNewsTheaterId } from "@/lib/interest/recommendFromInterest";

type Props = {
  economy?: boolean;
  onFlyToTheater?: (theater: NewsTheater) => void;
  onOpenSheet?: (theater?: "all" | NewsTheater) => void;
  onEnableLayer?: (layerKey: string) => void;
};

export function InterestRecommendChips({
  economy = false,
  onFlyToTheater,
  onOpenSheet,
  onEnableLayer,
}: Props) {
  const { lang } = useLocale();
  const { chips } = useInterestProfile(economy ? "economy" : "conflict");

  if (chips.length === 0) return null;

  const handleClick = (chip: InterestRecommendChip) => {
    const action = chip.action;
    if (action.type === "fly-theater" && onFlyToTheater && isNewsTheaterId(action.theater)) {
      onFlyToTheater(action.theater);
      return;
    }
    if (action.type === "enable-layer" && onEnableLayer) {
      if (
        economy &&
        (action.layerKey === "showMilitaryActivity" ||
          action.layerKey === "showUsCarriers" ||
          action.layerKey === "showMilitaryBases" ||
          action.layerKey === "showDisguisedVessels")
      ) {
        return;
      }
      onEnableLayer(action.layerKey);
      return;
    }
    if (action.type === "open-sheet" && onOpenSheet) {
      const t = action.theater;
      onOpenSheet(t && isNewsTheaterId(t) ? t : "all");
    }
  };

  return (
    <div
      className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-lg backdrop-blur-md ${
        economy
          ? "border-emerald-400/20 bg-[#071018]/88"
          : "border-violet-400/25 bg-[#0c1020]/90"
      }`}
      role="navigation"
      aria-label={lang === "en" ? "For you" : "맞춤 추천"}
    >
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-1.5">
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
            economy ? "text-emerald-200/70" : "text-violet-200/75"
          }`}
        >
          {lang === "en" ? "For you" : "맞춤"}
        </span>
        <span className="text-[10px] text-slate-400/70">
          {lang === "en" ? "from this device" : "이 기기 기록"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-2.5 py-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleClick(chip)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              economy
                ? "border-emerald-400/25 bg-emerald-950/50 text-emerald-100 hover:border-emerald-300/45 hover:bg-emerald-900/55"
                : "border-violet-400/30 bg-violet-950/45 text-violet-100 hover:border-violet-300/50 hover:bg-violet-900/50"
            }`}
          >
            {lang === "en" ? chip.labelEn : chip.labelKo}
          </button>
        ))}
      </div>
    </div>
  );
}
