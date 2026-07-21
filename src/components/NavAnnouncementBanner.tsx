"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  CURRENT_NAV_ANNOUNCEMENT,
  dismissNavAnnouncement,
  readDismissedNavAnnouncementId,
} from "@/lib/navAnnouncement";
import { DonateQrModal } from "@/components/DonateQrModal";

/** nav 상단 한 줄 공지 — 닫으면 이 id 기준으로 다시 안 뜸(새 공지로 갈아끼우면 재노출) */
export function NavAnnouncementBanner({ lang }: { lang: LabelLanguage }) {
  const [dismissed, setDismissed] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const en = lang === "en";

  useEffect(() => {
    const seen = readDismissedNavAnnouncementId();
    setDismissed(seen === CURRENT_NAV_ANNOUNCEMENT.id);
  }, []);

  if (dismissed) return null;

  const { goalAmountUsd, currentAmountUsd } = CURRENT_NAV_ANNOUNCEMENT;
  const goalReached = currentAmountUsd >= goalAmountUsd;
  const pct = Math.max(0, Math.min(100, Math.round((currentAmountUsd / goalAmountUsd) * 100)));

  return (
    <>
      <div className="pointer-events-auto flex w-full items-center gap-2 border-b border-amber-400/25 bg-[#1a1206]/92 px-3 py-1.5 text-[11px] leading-4 text-amber-50/90 backdrop-blur-md sm:px-4">
        <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-200/90">
          {en ? CURRENT_NAV_ANNOUNCEMENT.labelEn : CURRENT_NAV_ANNOUNCEMENT.labelKo}
        </span>
        <span className="min-w-0 flex-1 truncate sm:whitespace-normal sm:truncate-none">
          {goalReached
            ? en
              ? CURRENT_NAV_ANNOUNCEMENT.goalReachedEn
              : CURRENT_NAV_ANNOUNCEMENT.goalReachedKo
            : en
              ? CURRENT_NAV_ANNOUNCEMENT.bodyEn
              : CURRENT_NAV_ANNOUNCEMENT.bodyKo}
        </span>
        {!goalReached ? (
          <>
            <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-amber-400/15">
                <span
                  className="block h-full rounded-full bg-amber-400/70"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="tabular-nums text-amber-200/70">
                ${currentAmountUsd}/${goalAmountUsd}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setDonateOpen(true)}
              className="shrink-0 rounded-md border border-amber-300/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-500/20"
            >
              {en ? "Chip in" : "후원하기"}
            </button>
          </>
        ) : null}
        <button
          type="button"
          aria-label={en ? "Dismiss announcement" : "공지 닫기"}
          onClick={() => {
            dismissNavAnnouncement();
            setDismissed(true);
          }}
          className="shrink-0 rounded-md border border-amber-300/20 px-1.5 py-0.5 text-[10px] text-amber-100/70 transition hover:border-amber-300/40 hover:text-amber-50"
        >
          ✕
        </button>
      </div>
      <DonateQrModal lang={lang} open={donateOpen} onClose={() => setDonateOpen(false)} />
    </>
  );
}
