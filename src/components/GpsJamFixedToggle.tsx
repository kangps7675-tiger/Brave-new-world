"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasemapTone } from "@/hooks/useBasemapTone";

type GpsJamFixedToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  status?: "idle" | "loading" | "ok" | "error";
  cellCount?: number;
  date?: string | null;
  /** 모바일 상단 — 짧은 라벨 */
  compact?: boolean;
  /** 우측 레일에서는 left, 상단 바에서는 bottom */
  hintPlacement?: "top" | "bottom" | "left" | "right";
};

/** 지도 고정 토글 — 지정학 전용 GPSJam 솔로 히트맵 */
export function GpsJamFixedToggle({
  checked,
  onChange,
  status = "idle",
  cellCount = 0,
  date = null,
  compact = false,
  hintPlacement = "bottom",
}: GpsJamFixedToggleProps) {
  const { t, lang } = useLocale();
  const light = useBasemapTone() === "light";
  const detail = checked
    ? status === "loading"
      ? t("hoverGpsJamLoading")
      : status === "error"
        ? t("hoverGpsJamError")
        : t("hoverGpsJamOn")
    : t("hoverGpsJamOff");

  return (
    <HoverHint placement={hintPlacement} title={t("hoverGpsJam")} detail={detail}>
      <label
        className={`map-chrome-control pointer-events-auto flex cursor-pointer items-center shadow-md transition ${
          light
            ? compact
              ? "h-10 gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 text-meta text-slate-900 hover:bg-slate-50"
              : "gap-2.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 hover:bg-slate-50"
            : compact
              ? "h-10 gap-1.5 rounded-xl border border-amber-300/30 bg-[#1a1408]/88 px-2.5 text-meta text-amber-50 backdrop-blur-md hover:border-amber-200/40"
              : "gap-2.5 rounded-full border border-amber-300/30 bg-[#1a1408]/82 px-3.5 py-2 text-xs text-amber-50 backdrop-blur-md hover:border-amber-200/40"
        } ${
          checked
            ? light
              ? "border-amber-500/70 bg-amber-50"
              : "border-amber-300/55 bg-[#2a1c0a]/92"
            : ""
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-amber-400"
        />
        <span className="font-medium tracking-tight whitespace-nowrap">
          {compact ? "GPSJam" : t("hoverGpsJam")}
        </span>
        {checked && status === "loading" ? (
          <span className={`text-micro ${light ? "text-slate-600" : "text-amber-100/55"}`}>
            {lang === "en" ? "…" : "로드"}
          </span>
        ) : null}
        {checked && status === "error" ? (
          <span className="rounded-full bg-red-600/15 px-1.5 py-0.5 text-micro font-semibold text-red-800">
            ERR
          </span>
        ) : null}
        {checked && status === "ok" && cellCount > 0 ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-micro font-semibold ${
              light ? "bg-amber-100 text-amber-950" : "bg-amber-500/25 text-amber-100"
            }`}
          >
            {cellCount}
          </span>
        ) : null}
        {!compact && checked && date ? (
          <span className={`text-micro ${light ? "text-slate-500" : "text-amber-100/45"}`}>
            {date}
          </span>
        ) : null}
      </label>
    </HoverHint>
  );
}
