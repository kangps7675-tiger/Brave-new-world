/**
 * 첫 90초 — 상태 머신 (P0-2 / P0-3)
 *
 * 제품 약속: **"90초 안에, 오늘의 긴장을 지도 위에서 한 번 보고 나온다."**
 *
 * ── 왜 상태 머신인가 ──────────────────────────────────────────────
 * 기존 진입 흐름은 `entryGate` 문자열 + boolean 대여섯 개의 조합으로 표현돼
 * 있었고, 화면 곳곳에 `!showLeftPanel && !selected && !isCompactUi && ...`
 * 같은 방어 조건이 누적됐다. 그건 설계가 아니라 버그마다 조건을 덧댄 흔적이다.
 *
 * 첫 90초는 **순서가 정해진 1회성 시퀀스**다. 유한 상태로 못 박아두면
 * "지금 어느 단계인가"를 한 곳에서 답할 수 있고, 각 단계의 종료 조건도 명시된다.
 *
 * ── 시퀀스 ────────────────────────────────────────────────────────
 *   boot    지구본이 전역 스케일로 열린다            (~3초)
 *   gti     오늘의 GTI 한 줄 → 우상단 칩으로 축소     (~5초)
 *   fly     오늘의 핫전장으로 자동 이동 (취소 가능)    (~7초)
 *   scene   한 장면 — 핀·전선·초크 중 하나가 읽힌다   (~25초)
 *   market  왜 돈과 닿나 한 줄 (선택)                (~50초)
 *   done    이후는 평상시 화면. 온보딩 예산 시작
 *
 * ── 설계 원칙 ─────────────────────────────────────────────────────
 * ① 사용자가 지도를 만지면 시퀀스는 **즉시 양보**한다. 자동 연출이 조작을
 *    이기면 안 된다. 자동 이동이 불안한 이유는 "움직여서"가 아니라
 *    "멈출 수 없어서"다.
 * ② reduced-motion이면 fly를 건너뛰고 컷 전환한다 (안전 항목).
 * ③ 한 번 done이면 그 세션에선 다시 시작하지 않는다.
 */

export type FirstImpressionPhase =
  | "idle"
  | "boot"
  | "gti"
  | "fly"
  | "scene"
  | "market"
  | "done";

/** 각 단계의 기본 지속시간(ms) — 누적이 곧 90초 예산 */
export const PHASE_DURATION_MS: Record<
  Exclude<FirstImpressionPhase, "idle" | "done">,
  number
> = {
  boot: 3_000,
  gti: 5_000,
  fly: 7_000,
  scene: 25_000,
  market: 50_000,
};

/** 첫 인상 총 예산 */
export const FIRST_IMPRESSION_BUDGET_MS = 90_000;

/** 첫 화면에 동시에 켤 수 있는 레이어 상한 — 일반 캡(30)과 별개 */
export const FIRST_IMPRESSION_LAYER_BUDGET = 8;

const ORDER: FirstImpressionPhase[] = [
  "idle",
  "boot",
  "gti",
  "fly",
  "scene",
  "market",
  "done",
];

export function nextPhase(phase: FirstImpressionPhase): FirstImpressionPhase {
  const i = ORDER.indexOf(phase);
  if (i < 0 || i >= ORDER.length - 1) return "done";
  return ORDER[i + 1]!;
}

export function isSequenceActive(phase: FirstImpressionPhase): boolean {
  return phase !== "idle" && phase !== "done";
}

/** 이 단계에서 GTI 히어로(중앙 대형)를 보여주는가 */
export function showsGtiHero(phase: FirstImpressionPhase): boolean {
  return phase === "gti";
}

/**
 * 이 단계에서 온보딩 넛지를 띄워도 되는가.
 * 90초 한복판에 코치마크가 끼어들면 첫 인상이 무너진다.
 */
export function allowsOnboarding(phase: FirstImpressionPhase): boolean {
  return phase === "done";
}

export type FirstImpressionInput = {
  /** 지구본 렌더 준비 완료 */
  globeReady: boolean;
  /** 오늘의 핫전장 산출 여부 — 없으면 fly를 건너뛴다 */
  hasHotTheater: boolean;
  /** GTI 스냅샷 존재 — 없으면 gti 단계를 건너뛴다 */
  hasGti: boolean;
  /** 시장 연결 한 줄이 준비됐는가 — 없으면 market을 건너뛴다 */
  hasMarketLink: boolean;
  /** 사용자가 지도를 조작했는가 (드래그·휠·터치) */
  userTookControl: boolean;
  /** OS 모션 축소 설정 */
  reducedMotion: boolean;
  /** 폰은 지구본이 없어 시퀀스를 돌리지 않는다 */
  isPhone: boolean;
};

/**
 * 현재 단계에서 다음으로 갈 곳을 결정한다.
 *
 * 데이터가 없는 단계는 **건너뛴다** — 빈 화면을 몇 초 보여주느니 다음으로 간다.
 * 사용자가 지도를 만지면 어느 단계에서든 즉시 done.
 */
export function resolveNextPhase(
  phase: FirstImpressionPhase,
  input: FirstImpressionInput,
): FirstImpressionPhase {
  // ① 통제권은 항상 사용자에게
  if (input.userTookControl && isSequenceActive(phase)) return "done";
  if (input.isPhone) return "done";

  switch (phase) {
    case "idle":
      return input.globeReady ? "boot" : "idle";
    case "boot":
      if (input.hasGti) return "gti";
      return input.hasHotTheater ? "fly" : "done";
    case "gti":
      return input.hasHotTheater ? "fly" : "done";
    case "fly":
      return "scene";
    case "scene":
      return input.hasMarketLink ? "market" : "done";
    case "market":
      return "done";
    default:
      return "done";
  }
}

/**
 * 이 단계의 지속시간. reduced-motion이면 fly를 **컷 전환**으로 만든다.
 * (이동 자체를 없애는 게 아니라, 이동에 걸리는 시간을 0으로 만든다)
 */
export function phaseDurationMs(
  phase: FirstImpressionPhase,
  reducedMotion: boolean,
): number {
  if (phase === "idle" || phase === "done") return 0;
  if (phase === "fly" && reducedMotion) return 0;
  return PHASE_DURATION_MS[phase];
}

/**
 * 첫 인상 레이어 예산 — 핫전장 패치에서 상위 N개만 남긴다.
 *
 * 캡이 30이라고 30개를 켜면 "한 장면"이 아니라 "덩어리"가 된다.
 * 첫 화면의 합격 기준은 **핀·전선·초크 중 하나가 눈에 들어오는가**이다.
 *
 * @param patch  핫전장 레이어 패치 (켤 레이어 → true)
 * @param keep   유지 우선순위 (앞쪽일수록 남긴다)
 */
export function clampToFirstImpression<T extends string>(
  patch: Partial<Record<T, boolean>>,
  keep: readonly T[],
  budget: number = FIRST_IMPRESSION_LAYER_BUDGET,
): Partial<Record<T, boolean>> {
  const on = (Object.keys(patch) as T[]).filter((k) => patch[k] === true);
  if (on.length <= budget) return { ...patch };

  const rank = new Map(keep.map((k, i) => [k, i] as const));
  const sorted = [...on].sort((a, b) => {
    const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });

  const next: Partial<Record<T, boolean>> = { ...patch };
  for (const key of sorted.slice(budget)) {
    next[key] = false;
  }
  return next;
}
