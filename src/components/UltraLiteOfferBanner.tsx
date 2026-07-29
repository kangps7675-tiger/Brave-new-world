"use client";

import { Z_ABOVE_NAV } from "@/lib/uiStack";
import type { PerfProbeResult } from "@/lib/perfProbe";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

type Props = {
  probe: PerfProbeResult | null;
  lang: LabelLanguage;
  onAccept: () => void;
  onDismiss: () => void;
};

/**
 * Ultra-Lite 자동 제안 — FPS 프로브가 느리다고 판정했을 때만 1회.
 *
 * 진입 전 "당신 PC 사양은?"을 묻는 대신, 실제로 느릴 때만 뜬다.
 * 강제 적용하지 않는다 — 유저가 수락해야 켜진다.
 *
 * 위치: 우하단. 지구본 중앙과 상단 nav를 가리지 않는다.
 * (첫 90초의 주인공은 지도이지 이 배너가 아니다.)
 */
export function UltraLiteOfferBanner({ probe, lang, onAccept, onDismiss }: Props) {
  const critical = probe?.tier === "critical";
  const body = t(critical ? "ultraLiteOfferBodyCritical" : "ultraLiteOfferBody", lang);
  const measured = probe
    ? t("ultraLiteOfferMeasured", lang).replace("{fps}", String(Math.round(probe.fps)))
    : null;

  return (
    <div
      className={`pointer-events-auto fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+1rem+env(safe-area-inset-bottom,0px))] right-3 ${Z_ABOVE_NAV} w-[min(92vw,21rem)] sm:right-4`}
      role="dialog"
      aria-labelledby="ultralite-offer-title"
      aria-describedby="ultralite-offer-body"
    >
      <div className="overflow-hidden rounded-xl border border-amber-400/35 bg-[#160f04]/96 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="px-4 pt-3.5">
          <p
            id="ultralite-offer-title"
            className="text-[15px] font-semibold leading-snug text-amber-50"
          >
            {t("ultraLiteOfferTitle", lang)}
          </p>
          <p
            id="ultralite-offer-body"
            className="mt-1.5 text-body leading-relaxed text-amber-100/80"
          >
            {body}
          </p>
          {measured ? (
            <p className="mt-1.5 text-meta tracking-wide text-amber-200/45">{measured}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 px-4 pb-3.5 pt-3">
          <button
            type="button"
            onClick={onAccept}
            className="min-h-[38px] flex-1 rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 text-body font-semibold text-amber-50 transition hover:bg-amber-400/30"
          >
            {t("ultraLiteOfferAccept", lang)}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[38px] rounded-lg border border-white/12 px-3 text-body text-white/65 transition hover:border-white/25 hover:text-white"
          >
            {t("ultraLiteOfferDismiss", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
