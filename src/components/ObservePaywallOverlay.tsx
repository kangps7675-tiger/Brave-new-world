"use client";

import { useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { OBSERVE_PREVIEW_MS } from "@/lib/observeAccess";
import { brandName } from "@/lib/brand";
import { zc } from "@/lib/uiStack";

type Props = {
  lang: LabelLanguage;
  /** preview = 카운트다운 중 · expired = 막힘 */
  phase: "preview" | "expired";
  previewStartedAt: number;
  onUnlock: () => void;
  onDismiss: () => void;
};

/**
 * 관측(Cesium) soft paywall — 미리보기 카운트다운 + 로컬 잠금 해제 CTA.
 */
export function ObservePaywallOverlay({
  lang,
  phase,
  previewStartedAt,
  onUnlock,
  onDismiss,
}: Props) {
  const en = lang === "en";
  const [remainMs, setRemainMs] = useState(() =>
    Math.max(0, OBSERVE_PREVIEW_MS - (Date.now() - previewStartedAt)),
  );

  useEffect(() => {
    if (phase !== "preview") return;
    const tick = () => {
      setRemainMs(
        Math.max(0, OBSERVE_PREVIEW_MS - (Date.now() - previewStartedAt)),
      );
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, previewStartedAt]);

  const secs = Math.ceil(remainMs / 1000);
  const blocking = phase === "expired";

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 ${zc("gate")} flex justify-center px-3`}
      style={{
        bottom: blocking
          ? "30%"
          : "calc(var(--bottom-chrome-floor, 0.75rem) + env(safe-area-inset-bottom, 0px) + 9rem)",
        top: blocking ? 0 : undefined,
        alignItems: blocking ? "center" : "flex-end",
        background: blocking ? "rgba(2, 4, 10, 0.55)" : undefined,
        pointerEvents: blocking ? "auto" : "none",
      }}
      role="dialog"
      aria-modal={blocking}
      aria-labelledby="observe-paywall-title"
    >
      <div
        className={`pointer-events-auto w-[min(26rem,94vw)] rounded-md border border-teal-400/40 bg-[#041018]/95 px-4 py-3 shadow-xl backdrop-blur-md ${
          blocking ? "ring-1 ring-teal-300/30" : ""
        }`}
      >
        <p
          id="observe-paywall-title"
          className="text-meta font-semibold tracking-wide text-teal-50"
        >
          {blocking
            ? en
              ? "Preview ended · Observatory"
              : "미리보기 종료 · 관측대"
            : en
              ? `${brandName("en")} · Live 3D preview`
              : `${brandName("ko")} · 실시간 3D 미리보기`}
        </p>
        <p className="mt-1 text-micro leading-snug text-teal-100/70">
          {blocking
            ? en
              ? "Unlock the observatory desk (demo) or return to the free map."
              : "관측대를 잠금 해제(데모)하거나 무료 지도로 돌아가세요."
            : en
              ? `${secs}s left · frontline flash & tracks stay in this tab after unlock.`
              : `${secs}초 남음 · 잠금 해제 후 전선 속보·항적은 이 탭에서.`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUnlock}
            className="rounded border border-teal-300/50 bg-teal-500/25 px-3 py-1.5 text-caption font-semibold text-teal-50 hover:bg-teal-500/35"
          >
            {en ? "Unlock observatory" : "관측대 잠금 해제"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded border border-white/15 px-3 py-1.5 text-caption text-teal-100/80 hover:bg-white/5"
          >
            {blocking
              ? en
                ? "Back to free map"
                : "무료 지도로"
              : en
                ? "Later"
                : "나중에"}
          </button>
        </div>
        <p className="mt-2 text-micro text-teal-200/45">
          {en
            ? "Demo unlock · no billing yet"
            : "데모 잠금 해제 · 결제 연동 전"}
        </p>
      </div>
    </div>
  );
}
