"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";

type UsCarrierFixedToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  carrierCount?: number;
  deployedCount?: number;
  /** 모바일 상단 — 짧은 라벨 */
  compact?: boolean;
  /** 우측 레일에서는 left, 상단 바에서는 bottom */
  hintPlacement?: "top" | "bottom" | "left" | "right";
};

/** 지도 고정 토글 — 작전중 항모는 항상 표시, 토글 시 전체 함대 */
export function UsCarrierFixedToggle({
  checked,
  onChange,
  carrierCount = 0,
  deployedCount = 0,
  compact = false,
  hintPlacement = "bottom",
}: UsCarrierFixedToggleProps) {
  const { t, lang } = useLocale();
  return (
    <HoverHint
      placement={hintPlacement}
      title={t("hoverUsCarrierTrack")}
      detail={checked ? t("hoverUsCarrierAll") : t("hoverUsCarrierDeployed")}
    >
      <label
        className={`pointer-events-auto flex cursor-pointer items-center shadow-lg backdrop-blur-md transition hover:border-sky-200/35 ${
          compact
            ? "h-10 gap-1.5 rounded-xl border border-sky-300/25 bg-[#0a1830]/88 px-2.5 text-meta text-sky-50"
            : "gap-2.5 rounded-full border border-sky-300/25 bg-[#0a1830]/82 px-3.5 py-2 text-xs text-sky-50"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-red-400"
        />
        <span className="font-medium tracking-tight whitespace-nowrap">
          {compact ? (lang === "en" ? "CVN" : "항모") : t("hoverUsCarrierTrack")}
        </span>
        {!compact && !checked && deployedCount > 0 ? (
          <span className="text-micro text-sky-100/50">
            {lang === "en" ? "Deployed only" : "작전중만 표시"}
          </span>
        ) : null}
        {deployedCount > 0 ? (
          <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-micro font-semibold text-red-100">
            {deployedCount}
          </span>
        ) : null}
        {!compact && checked && carrierCount > 0 ? (
          <span className="text-micro text-sky-100/45">{carrierCount}</span>
        ) : null}
      </label>
    </HoverHint>
  );
}
