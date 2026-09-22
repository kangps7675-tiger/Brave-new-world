"use client";

import { useDialog } from "@/hooks/useDialog";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type FlyToConfirmOffer = {
  key: string;
  /** 배너 상단 라벨 (예: "ADS-B 비상 스쿼크") */
  subtitle: string;
  /** 굵게 표시될 대상 이름 (콜사인·선명 등) */
  title: string;
  lat: number;
  lng: number;
};

type Props = {
  offer: FlyToConfirmOffer;
  lang: LabelLanguage;
  onAccept: () => void;
  onDismiss: () => void;
};

const COPY = {
  ko: { ask: "관측 모드로 전환됐습니다. 해당 위치로 이동할까요?", yes: "예 · 이동", no: "아니오" },
  en: { ask: "Switched to Observe mode. Fly to that location?", yes: "Yes · Go", no: "No" },
} as const;

/**
 * 지정학/지경학(MapLibre) 모드에서 ADS-B/AIS 속보 배너를 수락해 관측(Cesium)
 * 모드로 전환한 직후 — 전환 자체와 flyTo를 한 번에 몰아치지 않고, 카메라 이동은
 * 한 번 더 확인받는다(MaritimeAlertOfferBanner와 같은 톤의 2단계 확인).
 */
export function FlyToConfirmBanner({ offer, lang, onAccept, onDismiss }: Props) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const dialogRef = useDialog<HTMLDivElement>({ open: true, onClose: onDismiss, trapFocus: false });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[800] w-[min(94vw,32rem)] -translate-x-1/2 outline-none"
      role="dialog"
      aria-labelledby="flyto-confirm-title"
      aria-describedby="flyto-confirm-body"
    >
      <div className="relative overflow-hidden rounded-md border border-sky-400/50 bg-[#04101c]/95 shadow-[0_18px_56px_rgba(0,40,70,0.5)] backdrop-blur-md">
        <div className="relative border-b border-sky-400/25 bg-sky-950/50 px-4 py-3">
          <p className="text-meta font-medium uppercase tracking-[0.16em] text-sky-200/75">
            {offer.subtitle}
          </p>
          <p id="flyto-confirm-title" className="mt-1 text-[15px] font-semibold leading-snug text-white">
            {offer.title}
          </p>
        </div>
        <div className="relative space-y-3 px-4 py-3">
          <p id="flyto-confirm-body" className="text-caption font-medium text-sky-100">
            {copy.ask}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded-md border border-sky-300/50 bg-sky-500/25 px-3.5 py-1.5 text-caption font-semibold text-sky-50 hover:bg-sky-500/40"
            >
              {copy.yes}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-caption text-white/70 hover:bg-white/5 hover:text-white"
            >
              {copy.no}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
