"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AirRaidSirenKind } from "@/lib/airRaidFocus";
import type { AirRaidFocusTarget } from "@/components/TzevaAdomPanel";

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
 * 이스라엘·이란 공습경보 — 웹 상단 고정 배너.
 * 신규 발령 시 자동 fly/레이어 ON 이후 표시, 해제 시 함께 사라짐.
 */
export function AirRaidOfferBanner({
  offer,
  lang,
  onDismiss,
}: AirRaidActiveBannerProps) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const region = offer.target.label || (lang === "en" ? "Alert zone" : "경보 구역");

  return (
    <div
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[10030] w-[min(94vw,32rem)] -translate-x-1/2"
      role="alert"
      aria-live="assertive"
      aria-labelledby="air-raid-active-title"
      aria-describedby="air-raid-active-body"
    >
      <div className="relative overflow-hidden rounded-md border border-red-400/55 bg-[#1a0508]/95 shadow-[0_18px_56px_rgba(80,0,0,0.55)] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-red-700/25 via-transparent to-red-600/20"
          aria-hidden
        />
        <div className="relative border-b border-red-400/30 bg-red-950/55 px-4 py-3">
          <p
            id="air-raid-active-title"
            className="text-[14px] font-semibold tracking-wide text-red-50"
          >
            {copy.headline}
            <span className="ml-2 text-[11px] font-medium text-red-200/80">
              {kindBadge(offer.kind, lang)}
            </span>
          </p>
          <p className="mt-1 truncate text-[16px] font-semibold text-white">{region}</p>
          {offer.activeCount > 1 ? (
            <p className="mt-0.5 text-[11px] text-red-200/70">
              {lang === "en"
                ? `${offer.activeCount} zones active`
                : `활성 구역 ${offer.activeCount}곳`}
            </p>
          ) : null}
        </div>
        <div className="relative flex items-start gap-3 px-4 py-3">
          <p id="air-raid-active-body" className="min-w-0 flex-1 text-[12px] leading-relaxed text-red-50/85">
            {copy.body}
          </p>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md border border-white/15 bg-transparent px-2.5 py-1 text-[11px] text-red-100/75 transition hover:bg-white/5 hover:text-red-50"
            >
              {copy.dismiss}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
