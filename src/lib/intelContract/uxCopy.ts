/**
 * 유저용 카피 — 내부 용어(Gate/PIR/modality)를 화면에서 풀어 쓴다.
 */

import type { DisplayGrade } from "@/lib/intelContract/types";
import type { LabelLanguage } from "@/lib/layerPrefs";

export function gradeLabelFriendly(
  grade: DisplayGrade,
  lang: LabelLanguage,
): string {
  const en = lang === "en";
  if (grade === "high") return en ? "Strong" : "탄탄함";
  if (grade === "std") return en ? "Checked" : "교차확인";
  if (grade === "low") return en ? "Thin" : "얇음";
  if (grade === "hold") return en ? "Waiting" : "모으는 중";
  return en ? "Hidden" : "숨김";
}

export function gradeHint(
  grade: DisplayGrade,
  lang: LabelLanguage,
): string {
  const en = lang === "en";
  if (grade === "high") {
    return en
      ? "Several kinds of open sources agree — start here if you’re short on time."
      : "여러 종류의 공개 출처가 맞춰져 있어요. 시간 없으면 여기부터 보시면 됩니다.";
  }
  if (grade === "std") {
    return en
      ? "More than one separate source lines up — worth a careful look."
      : "서로 다른 출처가 한쪽으로 맞춰져, 천천히 볼 만합니다.";
  }
  if (grade === "low") {
    return en
      ? "Still thin — treat it as a lead, not settled fact."
      : "아직 얇습니다. 단서로만 보고, 사실처럼 굳히지 마세요.";
  }
  if (grade === "hold") {
    return en
      ? "Still gathering — you can skip this for now."
      : "아직 모으는 중이라, 지금은 넘겨도 됩니다.";
  }
  return en
    ? "Not solid enough to highlight — leave it in the background."
    : "아직 강조할 만큼은 아닙니다. 배경에만 남겨 둡니다.";
}

export const INTEL_UX = {
  watchboardTitle: {
    ko: "오늘 볼 안건",
    en: "Today's watch items",
  },
  watchboardSubtitle: {
    ko: "서로 다른 공개 출처가 맞춰진 소식만 모았습니다. 비밀 정보가 아닙니다.",
    en: "Only open-source items that cross-check. Not secret intel.",
  },
  watchboardEmpty: {
    ko: "아직 읽을 안건이 없습니다. 소식이 쌓이면 여기부터 보시면 됩니다.",
    en: "Nothing to read yet. When items arrive, start here.",
  },
  watchboardActiveHeader: {
    ko: "지금 볼 안건",
    en: "Ready to read",
  },
  watchboardHoldHeader: {
    ko: "근거 모으는 중",
    en: "Still collecting",
  },
  watchboardHoldHint: {
    ko: "사라진 게 아닙니다 — 출처가 더 쌓이면 위로 올라옵니다.",
    en: "Not gone — they move up when more sources arrive.",
  },
  drillButton: {
    ko: "왜?",
    en: "Why?",
  },
  openItemHint: {
    ko: "눌러 보고서·경보 열기",
    en: "Tap to open report or alert",
  },
  pirLabel: {
    ko: "관심 주제",
    en: "Priority topic",
  },
  pirNeed: {
    ko: "보면 좋은 것",
    en: "Helpful to have",
  },
  pirHave: {
    ko: "이미 있는 것",
    en: "Already here",
  },
  pirMissing: {
    ko: "아직 없는 것",
    en: "Still missing",
  },
  drillWhyHeader: {
    ko: "왜 지금 보면 좋은가",
    en: "Why this matters now",
  },
  kindConflict: {
    ko: "교차 확인된 사건",
    en: "Cross-checked event",
  },
  helpTitle: {
    ko: "이 보드가 뭔가요?",
    en: "What is this board?",
  },
  helpBody: {
    ko: [
      "여기에는 ‘다 모아 둔 소식’이 아니라, 서로 다른 공개 출처가 맞춰진 안건만 올립니다.",
      "탄탄함·교차확인·얇음은 비밀 등급이 아닙니다. 출처가 얼마나 겹치는지입니다.",
      "「왜?」는 이 소식이 지도에서 왜 눈에 띄는지, 얼마나 믿을지, 다음에 뭘 보면 좋은지를 짧게 말해 줍니다.",
      "전황 보고서는 관측대에서만 엽니다.",
    ],
    en: [
      "This board is not every feed item — only open-source items that cross-check.",
      "Strong / Checked / Thin are about source agreement, not secrecy.",
      "Why? explains what the item means on the map, how solid it looks, and what to check next.",
      "Theater sitrep books open only from the Observatory.",
    ],
  },
  drillTitle: {
    ko: "이 소식이 왜 중요한가",
    en: "Why this item matters",
  },
  drillClaim: {
    ko: "한 줄로 보면",
    en: "In one line",
  },
  drillHow: {
    ko: "출처가 얼마나 겹치나",
    en: "How sources line up",
  },
  drillIndependence: {
    ko: (indep: number, mods: number) =>
      `서로 다른 곳에서 ${indep}곳 · 종류 ${mods}가지가 맞춰져 있습니다`,
    en: (indep: number, mods: number) =>
      `${indep} separate source(s) · ${mods} kind(s) agree`,
  },
  drillReasons: {
    ko: "믿을 때 참고할 점",
    en: "What to keep in mind",
  },
  drillSources: {
    ko: "직접 열어볼 출처",
    en: "Sources you can open",
  },
  drillKill: {
    ko: "이런 소식이 나오면 중요도가 내려갑니다",
    en: "It would matter less if…",
  },
  drillAlt: {
    ko: "다른 해석도 가능합니다",
    en: "Other readings are possible",
  },
  drillFoot: {
    ko: "미래를 맞히거나 의도를 단정하지 않습니다. 공개 자료를 지도 위에 모아 둔 참고용입니다.",
    en: "Not a forecast or a claim about intent — a map-side reading aid from open sources.",
  },
  modality: {
    media: { ko: "보도", en: "Press" },
    sensor: { ko: "센서·지도", en: "Sensor/map" },
    alert: { ko: "경보", en: "Alert" },
    official: { ko: "공식", en: "Official" },
    stat: { ko: "지표", en: "Indicator" },
    tip: { ko: "제보·미확인", en: "Tip/unverified" },
  },
  observeFirstTipTitle: {
    ko: "관측대 · 오늘 볼 안건",
    en: "Observatory · today's items",
  },
  observeFirstTipBody: {
    ko: "오른쪽은 레이어 스위치가 아니라 읽을 안건 목록입니다. 「왜?」로 왜 중요한지 보고, 제목을 누르면 보고서가 열립니다. 아래 책갈피로 속보·알림·검증·사건(화재·공습·항적 붙이기)도 바꿀 수 있어요.",
    en: "The list on the right is a reading queue, not a layer switch. Tap Why? for why it matters; tap a title for the report. Bottom bookmarks switch flashes, alerts, verify, and Case (attach fires, air raids, tracks).",
  },
  observeFirstTipCta: {
    ko: "알겠어요",
    en: "Got it",
  },
  observeFirstTipHelp: {
    ko: "다시 보기",
    en: "Show again",
  },
  gradeBadgeAria: {
    ko: "근거 등급",
    en: "Evidence grade",
  },
} as const;

export function intelUx(
  key: keyof typeof INTEL_UX,
  lang: LabelLanguage,
): string {
  const entry = INTEL_UX[key];
  if (typeof entry === "object" && entry !== null && "ko" in entry) {
    const v = entry[lang === "en" ? "en" : "ko"];
    if (typeof v === "string") return v;
  }
  return "";
}

export const INTEL_DESK_TIP_KEY = "cv-intel-desk-tip-v1";

export function readIntelDeskTipDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(INTEL_DESK_TIP_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntelDeskTipDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTEL_DESK_TIP_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearIntelDeskTipDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(INTEL_DESK_TIP_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 설명 카드/팁 — **처음 들어온 유저**가 기능을 **처음 켤 때만**.
 * 일반·재방문 유저에게는 자동으로 띄우지 않는다 (등불뉴스와 반대).
 */
export function shouldOfferIntelDeskTip(): boolean {
  if (typeof window === "undefined") return false;
  if (readIntelDeskTipDone()) return false;
  try {
    // 동적 import 순환 회피 — 키를 직접 본다
    const tourDone =
      window.localStorage.getItem("geowatch-first-visit-tour-v1") === "1";
    const uxGuideDone =
      window.localStorage.getItem("cv-ux-guide-brief-v1") === "1";
    // 둘 다 끝냈으면 이미 익숙한 유저 → 설명창 자동 노출 없음
    if (tourDone && uxGuideDone) return false;
    return true;
  } catch {
    return false;
  }
}
