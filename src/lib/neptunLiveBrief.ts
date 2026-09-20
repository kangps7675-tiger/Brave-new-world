/**
 * 우크라이나 NEPTUN — 실피드 첫 인상 양피지 (브라우저당 1회).
 * 스텁/데모에서는 띄우지 않는다.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { AirRaidBriefingContent } from "@/components/AirRaidBriefingParchment";

export const NEPTUN_LIVE_BRIEF_KEY = "cv-neptun-live-feed-brief-v1";

export function readNeptunLiveBriefDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(NEPTUN_LIVE_BRIEF_KEY) === "1";
  } catch {
    return true;
  }
}

export function markNeptunLiveBriefDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NEPTUN_LIVE_BRIEF_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferNeptunLiveBrief(): boolean {
  return !readNeptunLiveBriefDone();
}

/** 라이브 피드일 때만 — 「실피드」와 「추정 궤적」을 한 장에 */
export function buildNeptunLiveBriefContent(
  lang: LabelLanguage,
): AirRaidBriefingContent {
  if (lang === "en") {
    return {
      kind: "neptun",
      title: "These tracks are a live open feed",
      paragraphs: [
        "Live air threats from neptun.in.ua (open OSINT)—not a simulation or demo.",
        "Solid line = reported track · dashed = predicted or elapsed. Position may be estimated between updates.",
        "Not a replacement for official alert apps. Informational only.",
      ],
      ctaLabel: "See the map",
    };
  }
  return {
    kind: "neptun",
    title: "지금 보이는 궤적은 실피드입니다",
    paragraphs: [
      "neptun.in.ua 공개 OSINT · 실시간 공중 위협입니다. 시뮬레이션·데모가 아닙니다.",
      "실선은 보고 궤적, 점선은 예측·경과입니다. 갱신 사이 위치는 추정일 수 있습니다.",
      "국가 공식 경보 앱을 대체하지 않습니다. 정보 수집용입니다.",
    ],
    ctaLabel: "지도에서 보기",
  };
}
