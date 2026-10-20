"use client";

import { useEffect } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/** fly-to + 양피지 브리핑 — 계정/브라우저당 최초 1회만 */
export const AIR_RAID_FLY_BRIEF_KEY = "geowatch-air-raid-fly-brief-v1";

export function readAirRaidFlyBriefDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AIR_RAID_FLY_BRIEF_KEY) === "1";
  } catch {
    return true;
  }
}

export function markAirRaidFlyBriefDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AIR_RAID_FLY_BRIEF_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferAirRaidFlyBrief(): boolean {
  return !readAirRaidFlyBriefDone();
}

export type AirRaidOffer = {
  key: string;
  kind: AirRaidSirenKind;
  target: AirRaidFocusTarget;
  title?: string;
  since?: string;
  activeCount: number;
  /** 로켓·미사일 / UAV 등 */
  threatLabel?: string;
  /** 어느 쪽에서 접근하는지 */
  approachFrom?: string;
  /** 주·구 등 상세 위치 */
  locationDetail?: string;
};

type AirRaidActiveBannerProps = {
  offer: AirRaidOffer;
  lang: LabelLanguage;
  onDismiss?: () => void;
};

const COPY = {
  ko: {
    headline: "공습경보",
    body: "해당 구역으로 이동했습니다. 경보가 해제되면 이 알림과 레이어가 함께 꺼집니다.",
    dismiss: "닫기",
  },
  en: {
    headline: "Air-raid alert",
    body: "Flown to the alert zone. This banner and the layer turn off when the alert clears.",
    dismiss: "Dismiss",
  },
} as const;

function kindBadge(kind: AirRaidSirenKind, lang: LabelLanguage): string {
  if (lang === "en") {
    if (kind === "tzeva") return "Israel · Tzeva Adom";
    if (kind === "newfeeds") return "Iran · NewFeeds";
    return "Alert";
  }
  if (kind === "tzeva") return "이스라엘 · 체바 아돔";
  if (kind === "newfeeds") return "이란 · NewFeeds";
  return "경보";
}

/**
 * 이스라엘·이란 공습경보 — 웹 상단 고정 배너 (P2-4 Von Restorff).
 * 제안형 배너와 구분: 각진 모서리 · 채운 적색 · 좌측 경고 바 · 1회 미세 진동.
 */
export function AirRaidOfferBanner({
  offer,
  lang,
  onDismiss,
}: AirRaidActiveBannerProps) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const region = offer.target.label || (lang === "en" ? "Alert zone" : "경보 구역");

  useEffect(() => {
    if (prefersReducedMotion()) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(40);
      }
    } catch {
      /* ignore */
    }
  }, [offer.key]);

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[800] w-[min(94vw,32rem)] -translate-x-1/2"
      role="alert"
      aria-live="assertive"
      aria-labelledby="air-raid-active-title"
      aria-describedby="air-raid-active-body"
    >
      <div className="relative overflow-hidden rounded-none border border-red-300 bg-red-800 shadow-[0_18px_56px_rgba(80,0,0,0.65)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-yellow-300" aria-hidden />
        <div className="relative border-b border-red-600/80 bg-red-900 px-4 py-3 pl-5">
          <p
            id="air-raid-active-title"
            className="text-[14px] font-semibold tracking-wide text-red-50"
          >
            {copy.headline}
            <span className="ml-2 text-meta font-medium text-red-100/85">
              {kindBadge(offer.kind, lang)}
            </span>
          </p>
          <p className="mt-1 truncate text-[16px] font-semibold text-white">{region}</p>
          {offer.activeCount > 1 ? (
            <p className="mt-0.5 text-meta text-red-100/75">
              {lang === "en"
                ? `${offer.activeCount} zones active`
                : `활성 구역 ${offer.activeCount}곳`}
            </p>
          ) : null}
        </div>
        <div className="relative flex items-start gap-3 bg-red-800 px-4 py-3 pl-5">
          <p id="air-raid-active-body" className="min-w-0 flex-1 text-caption leading-relaxed text-red-50">
            {copy.body}
          </p>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-none border border-white/25 bg-red-950/40 px-2.5 py-1 text-meta text-red-50 transition hover:bg-red-950/70"
            >
              {copy.dismiss}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
