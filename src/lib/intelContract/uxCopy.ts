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
      ? "Different kinds of sources agree — worth reading first."
      : "서로 다른 종류의 출처가 맞춰져, 먼저 보기 좋습니다.";
  }
  if (grade === "std") {
    return en
      ? "Enough independent sources to show on the board or as an alert."
      : "독립 출처가 충분해 보드·경보에 올릴 수 있는 수준입니다.";
  }
  if (grade === "low") {
    return en
      ? "Useful as a tip — open Why? before treating it as fact."
      : "참고용입니다. 「왜?」를 열어 본 뒤에만 사실처럼 읽으세요.";
  }
  if (grade === "hold") {
    return en
      ? "Still collecting — not ready to highlight as a desk item."
      : "아직 근거를 모으는 중이라 강조 안건으로 올리지 않습니다.";
  }
  return en
    ? "Did not pass the evidence check — kept in raw data only."
    : "근거 검사를 통과하지 못해 원자료에만 남깁니다.";
}

export const INTEL_UX = {
  watchboardTitle: {
    ko: "오늘 볼 안건",
    en: "Today's watch items",
  },
  watchboardSubtitle: {
    ko: "교차확인을 통과한 것만 올립니다. 비밀 정보가 아니라 공개 출처 규율입니다.",
    en: "Only items that pass an evidence check. Public sources — not secret intel.",
  },
  watchboardEmpty: {
    ko: "아직 올릴 안건이 없습니다. 피드가 채워지면 여기부터 읽으면 됩니다.",
    en: "Nothing ready yet. When feeds fill in, start reading here.",
  },
  watchboardActiveHeader: {
    ko: "올려둔 안건",
    en: "On the board",
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
    ko: "필요",
    en: "Need",
  },
  pirHave: {
    ko: "확보",
    en: "Have",
  },
  pirMissing: {
    ko: "빈칸",
    en: "Empty",
  },
  drillWhyHeader: {
    ko: "왜 올렸나 (3줄)",
    en: "Why it is up (3 lines)",
  },
  kindConflict: {
    ko: "교차 사건",
    en: "Corroborated event",
  },
  helpTitle: {
    ko: "이 보드가 뭔가요?",
    en: "What is this board?",
  },
  helpBody: {
    ko: [
      "관측대는 ‘다 보여주기’가 아니라, 교차확인을 통과한 안건만 강조합니다.",
      "등급(탄탄함·교차확인·얇음·모으는 중)은 비밀 등급이 아니라 「얼마나 여러 출처가 맞는지」입니다.",
      "「왜?」를 누르면 출처·탈락 이유·언제 폐기할지(하향 조건)가 나옵니다. 의도·확률·임박 %는 말하지 않습니다.",
      "전황 보고서는 여기서만 엽니다. 지정학·지경학 화면에는 같은 책을 이식하지 않습니다.",
    ],
    en: [
      "The Observatory highlights only items that pass an evidence check — not everything collected.",
      "Grades (Strong / Checked / Thin / Waiting) are about source agreement, not secrecy.",
      "Why? shows sources, fail reasons, and when we would drop the item. We do not claim intent or odds.",
      "Theater sitrep books open only from here — not on the geopolitics or geoeconomics desks.",
    ],
  },
  drillTitle: {
    ko: "왜 이 안건인가요?",
    en: "Why is this on the desk?",
  },
  drillClaim: {
    ko: "지금 말하는 것",
    en: "What we are saying",
  },
  drillHow: {
    ko: "어떻게 모았나",
    en: "How it was gathered",
  },
  drillIndependence: {
    ko: (indep: number, mods: number) =>
      `서로 다른 출처 ${indep}곳 · 종류 ${mods}가지`,
    en: (indep: number, mods: number) =>
      `${indep} independent source(s) · ${mods} kind(s)`,
  },
  drillReasons: {
    ko: "통과·보류 이유",
    en: "Pass / hold reasons",
  },
  drillSources: {
    ko: "근거로 쓴 출처",
    en: "Sources used",
  },
  drillKill: {
    ko: "이런 일이면 내립니다",
    en: "We would drop it if…",
  },
  drillAlt: {
    ko: "다른 설명도 가능",
    en: "Other explanations possible",
  },
  drillFoot: {
    ko: "예측이 아닙니다. 의도나 확률은 평가하지 않습니다.",
    en: "Not a forecast. Intent and probability are not assessed.",
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
    ko: "관측대 · 안건 보드",
    en: "Observatory · watch board",
  },
  observeFirstTipBody: {
    ko: "오른쪽 「오늘 볼 안건」은 레이어 목록이 아닙니다. 교차확인을 통과한 전황·해상 경보만 모은 읽기 목록입니다. 「왜?」로 근거를 펼치고, 제목을 누르면 보고서가 열립니다.",
    en: "「Today's watch items」 is not a layer list — it is a reading queue of theater and maritime items that passed an evidence check. Use Why? for sources; tap a title to open the report.",
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
