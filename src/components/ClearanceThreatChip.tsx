"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearanceThreatCopy,
  hasSeenClearanceChip,
  markClearanceChipSeen,
  type ClearanceStatus,
} from "@/lib/analystClearance";
import type { LabelLanguage } from "@/lib/layerPrefs";

type ClearanceThreatChipProps = {
  status: ClearanceStatus;
  lang: LabelLanguage;
  dayKey: string;
  onCta: () => void;
  onDismiss?: () => void;
};

/**
 * 인가가 내려가려 하거나 이미 내려간 날 — 하루 한 번 칩.
 */
export function ClearanceThreatChip({
  status,
  lang,
  dayKey,
  onCta,
  onDismiss,
}: ClearanceThreatChipProps) {
  const ko = lang !== "en";
  const copy = clearanceThreatCopy(status, ko);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status.kind === "ok") {
      setVisible(false);
      return;
    }
    if (hasSeenClearanceChip(dayKey)) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [dayKey, status.kind]);

  const dismiss = useCallback(() => {
    markClearanceChipSeen(dayKey);
    setVisible(false);
    onDismiss?.();
  }, [dayKey, onDismiss]);

  if (!visible || status.kind === "ok") return null;

  const threat = status.kind === "threat";

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[100] w-[min(94vw,26rem)] -translate-x-1/2 px-2 sm:top-4">
      <div
        className={`relative overflow-hidden rounded-sm border px-3 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.4)] backdrop-blur-md ${
          threat
            ? "border-amber-500/40 bg-[#1a140c]/94 text-amber-50"
            : "border-rose-500/35 bg-[#1a1012]/94 text-rose-50"
        }`}
        role="status"
      >
        <p className="text-meta font-semibold uppercase tracking-[0.14em] text-inherit/90 sm:text-caption">
          {copy.title}
        </p>
        <p className="mt-1 text-meta leading-snug tracking-[0.02em] text-inherit/75 sm:text-caption">
          {copy.subtitle}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              dismiss();
              onCta();
            }}
            className={`rounded-sm border px-3 py-1.5 text-meta font-semibold tracking-[0.06em] transition sm:text-caption ${
              threat
                ? "border-amber-400/50 bg-amber-500/20 text-amber-50 hover:bg-amber-500/30"
                : "border-rose-400/45 bg-rose-500/20 text-rose-50 hover:bg-rose-500/30"
            }`}
          >
            {copy.cta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-sm px-2 py-1.5 text-micro tracking-[0.04em] text-inherit/55 transition hover:text-inherit/85"
            aria-label={ko ? "닫기" : "Dismiss"}
          >
            {ko ? "닫기" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}
