"use client";

import type { ReactNode } from "react";
import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";

type MapOverlayLegendAccent = "sky" | "orange" | "red";

type MapOverlayLegendPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: MapOverlayLegendAccent;
  children: ReactNode;
};

const ACCENT_STYLES: Record<
  MapOverlayLegendAccent,
  { border: string; headerBorder: string; label: string; close: string }
> = {
  sky: {
    border: "border-sky-300/20",
    headerBorder: "border-sky-300/15",
    label: "text-sky-200/75",
    close: "border-sky-300/25 text-sky-100/60 hover:border-sky-200/40 hover:text-sky-50",
  },
  orange: {
    border: "border-orange-300/20",
    headerBorder: "border-orange-300/15",
    label: "text-orange-200/75",
    close: "border-orange-300/25 text-orange-100/60 hover:border-orange-200/40 hover:text-orange-50",
  },
  red: {
    border: "border-red-300/20",
    headerBorder: "border-red-300/15",
    label: "text-red-200/75",
    close: "border-red-300/25 text-red-100/60 hover:border-red-200/40 hover:text-red-50",
  },
};

export function MapOverlayLegendPanel({
  open,
  onClose,
  title,
  subtitle,
  accent = "sky",
  children,
}: MapOverlayLegendPanelProps) {
  if (!open) return null;

  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className="pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance)+env(safe-area-inset-bottom,0px))] left-1/2 z-[600] w-[min(92vw,440px)] -translate-x-1/2"
    >
      <div
        className={`overflow-hidden rounded-2xl border ${styles.border} bg-[#0a1830]/82 shadow-2xl backdrop-blur-md`}
      >
        <div
          className={`flex items-center justify-between gap-3 border-b ${styles.headerBorder} px-3 py-2.5`}
        >
          <div className="min-w-0 flex-1">
            <p className={`text-micro uppercase tracking-[0.22em] ${styles.label}`}>{title}</p>
            {subtitle ? <p className="mt-0.5 text-xs text-sky-50/90">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`${title} 닫기`}
            className={`shrink-0 rounded-lg border px-2 py-1 text-xs transition ${styles.close}`}
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-3 text-meta text-sky-100/85">{children}</div>
      </div>
    </div>
  );
}

export function LegendReopenButton({
  label,
  onClick,
  accent = "sky",
}: {
  label: string;
  onClick: () => void;
  accent?: MapOverlayLegendAccent;
}) {
  const { t } = useLocale();
  const accentClass =
    accent === "orange"
      ? "border-orange-300/25 bg-orange-950/50 text-orange-100/90 hover:border-orange-200/40"
      : accent === "red"
        ? "border-red-300/25 bg-red-950/50 text-red-100/90 hover:border-red-200/40"
        : "border-sky-300/25 bg-[#0a1830]/75 text-sky-100/90 hover:border-sky-200/40";

  return (
    <HoverHint placement="top" title={label} detail={t("hoverLegendReopen")}>
      <button
        type="button"
        onClick={onClick}
        className={`pointer-events-auto rounded-full border px-3 py-1.5 text-meta shadow-lg backdrop-blur-md transition ${accentClass}`}
      >
        {label}
      </button>
    </HoverHint>
  );
}
