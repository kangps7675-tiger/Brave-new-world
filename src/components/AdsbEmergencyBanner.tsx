"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  adsbEmergencyHeadline,
  type AdsbEmergencyOffer,
} from "@/components/globe/hooks/useAdsbEmergencyAlert";

type Props = {
  offer: AdsbEmergencyOffer;
  lang: LabelLanguage;
  onDismiss?: () => void;
};

const COPY = {
  ko: {
    headline: "ADS-B 비상 스쿼크",
    body: "비상 스쿼크 기체로 이동했습니다. 사이렌은 설정에서 끌 수 있습니다.",
    dismiss: "닫기",
  },
  en: {
    headline: "ADS-B emergency squawk",
    body: "Flown to the emergency squawk aircraft. Mute sirens in settings if needed.",
    dismiss: "Dismiss",
  },
} as const;

export function AdsbEmergencyBanner({ offer, lang, onDismiss }: Props) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const ko = lang !== "en";
  const callsign =
    offer.aircraft.callsign?.trim() ||
    offer.aircraft.registration ||
    offer.aircraft.hex.toUpperCase();

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[10030] w-[min(94vw,32rem)] -translate-x-1/2"
      role="alert"
      aria-live="assertive"
    >
      <div className="relative overflow-hidden rounded-md border border-amber-400/55 bg-[#1a1205]/95 shadow-[0_18px_56px_rgba(80,40,0,0.55)] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-amber-700/25 via-transparent to-orange-600/20"
          aria-hidden
        />
        <div className="relative border-b border-amber-400/30 bg-amber-950/55 px-4 py-3">
          <p className="text-[14px] font-semibold tracking-wide text-amber-50">
            {copy.headline}
            <span className="ml-2 text-[11px] font-medium text-amber-200/80">
              {adsbEmergencyHeadline(offer.squawk, ko)}
            </span>
          </p>
          <p className="mt-1 truncate text-[16px] font-semibold text-white">{callsign}</p>
          {offer.activeCount > 1 ? (
            <p className="mt-0.5 text-[11px] text-amber-200/70">
              {ko
                ? `비상 스쿼크 ${offer.activeCount}기`
                : `${offer.activeCount} emergency contacts`}
            </p>
          ) : null}
        </div>
        <div className="relative flex items-start gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-amber-50/85">{copy.body}</p>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md border border-white/15 bg-transparent px-2.5 py-1 text-[11px] text-amber-100/75 transition hover:bg-white/5 hover:text-amber-50"
            >
              {copy.dismiss}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
