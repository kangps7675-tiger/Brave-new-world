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
  /**
   * 지정학/지경학/항적(MapLibre) 모드에서 감지된 경우에만 전달됨 — 이미
   * 관측(Cesium) 모드라면 fly가 자동으로 일어나므로 버튼이 필요 없다.
   */
  onGoToObserve?: () => void;
};

const COPY = {
  ko: {
    headline: "ADS-B 비상 스쿼크",
    body: "비상 스쿼크 기체로 이동했습니다. 사이렌은 설정에서 끌 수 있습니다.",
    bodyNeedsObserve:
      "비상 스쿼크 기체가 감지됐습니다. 항적은 관측(Cesium) 모드에서만 보여요.",
    dismiss: "닫기",
    goToObserve: "관측 모드로 이동",
  },
  en: {
    headline: "ADS-B emergency squawk",
    body: "Flown to the emergency squawk aircraft. Mute sirens in settings if needed.",
    bodyNeedsObserve:
      "Emergency squawk detected. Live tracks only render in Observe (Cesium) mode.",
    dismiss: "Dismiss",
    goToObserve: "Go to Observe",
  },
} as const;

export function AdsbEmergencyBanner({ offer, lang, onDismiss, onGoToObserve }: Props) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const ko = lang !== "en";
  const callsign =
    offer.aircraft.callsign?.trim() ||
    offer.aircraft.registration ||
    offer.aircraft.hex.toUpperCase();

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[800] w-[min(94vw,32rem)] -translate-x-1/2"
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
            <span className="ml-2 text-meta font-medium text-amber-200/80">
              {adsbEmergencyHeadline(offer.squawk, ko)}
            </span>
          </p>
          <p className="mt-1 truncate text-[16px] font-semibold text-white">{callsign}</p>
          {offer.activeCount > 1 ? (
            <p className="mt-0.5 text-meta text-amber-200/70">
              {ko
                ? `비상 스쿼크 ${offer.activeCount}기`
                : `${offer.activeCount} emergency contacts`}
            </p>
          ) : null}
        </div>
        <div className="relative flex items-start gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 text-caption leading-relaxed text-amber-50/85">
            {onGoToObserve ? copy.bodyNeedsObserve : copy.body}
          </p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2 px-4 pb-3">
          {onGoToObserve ? (
            <button
              type="button"
              onClick={onGoToObserve}
              className="rounded-md border border-amber-300/50 bg-amber-500/25 px-3.5 py-1.5 text-caption font-semibold text-amber-50 hover:bg-amber-500/40"
            >
              {copy.goToObserve}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md border border-white/15 bg-transparent px-2.5 py-1 text-meta text-amber-100/75 transition hover:bg-white/5 hover:text-amber-50"
            >
              {copy.dismiss}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
