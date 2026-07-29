/**
 * 온보딩 예산제 — 한 세션에 사용자를 몇 번까지 붙잡을 수 있는가.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────
 * 코치·투어·힌트·제안이 **각자 자기 localStorage 키만 보고** 독립적으로 뜬다.
 * 서로의 존재를 모르므로 조율이 불가능하고, 첫 방문자는 지도를 보기도 전에
 * 안내를 연달아 맞는다. (UX 감사 2-1 「주의 예산 파산」)
 *
 * 이 모듈은 그 위에 **총량 제한**을 얹는다. 개별 넛지는 여전히
 * "나는 떠도 되는가"를 알지만, 이제 "지금 이 세션에 자리가 남았는가"도 물어야 한다.
 *
 * ── overlayQueue와의 차이 ─────────────────────────────────────────
 *   overlayQueue      : 지금 **동시에** 뜨려는 것 중 누가 이기는가 (공간 경합)
 *   onboardingBudget  : 이번 세션에 **총 몇 개**까지 뜰 수 있는가 (시간 경합)
 * 둘은 대체가 아니라 보완이다. 배너는 둘 다 통과해야 뜬다.
 *
 * ── 설계 원칙 ─────────────────────────────────────────────────────
 * ① 기존 저장 키를 그대로 쓴다. 새 통합 키를 만들면 **이미 온보딩을 끝낸
 *    사용자 전원이 다시 처음부터 보게 된다.** (LAYER_PREFS_KEY v38이
 *    릴리스마다 설정을 날린 것과 같은 실수를 반복하지 않는다.)
 * ② 예산은 세션 단위(sessionStorage). 탭을 새로 열면 회복된다.
 * ③ 쿨다운을 둔다. 예산이 2라도 3초 간격으로 두 번 뜨면 체감은 여전히 폭격이다.
 * ④ 중요한 것이 먼저다. 예산이 1자리 남았는데 힌트가 선점하면 안 된다.
 */

/** 한 세션에 노출 가능한 온보딩 넛지 총량 */
export const ONBOARDING_BUDGET_PER_SESSION = 2;

/** 넛지 사이 최소 간격 — 연속 폭격 방지 */
export const ONBOARDING_COOLDOWN_MS = 45_000;

const BUDGET_KEY = "geowatch-onboarding-budget-v1";
const LAST_SHOWN_KEY = "geowatch-onboarding-last-v1";

export type NudgeId =
  | "chromeCoach"
  | "firstVisitTour"
  | "tourInvite"
  | "frictionCoach"
  | "airRaidCoach"
  | "theaterCoach"
  | "intelDragHint"
  | "ultraLiteOffer"
  | "soundUnmute";

type NudgeSpec = {
  /** 낮을수록 먼저 — 예산이 부족할 때 무엇을 살릴지 결정 */
  priority: number;
  /**
   * 기존 컴포넌트가 쓰던 저장 키 (마이그레이션 없이 그대로 재사용).
   * null이면 이 모듈이 완료 여부를 관리하지 않고 호출측이 판단한다.
   */
  legacyKey: string | null;
  /** localStorage(영구) | sessionStorage(세션) */
  scope: "persistent" | "session";
  /**
   * 예산을 소비하지 않는 넛지.
   * 사용자가 **직접 요청**해서 뜨는 것(도움말 → 투어 시작)은 방해가 아니다.
   */
  exempt?: boolean;
  /**
   * 세션 초반에 **조건 없이** 뜨려는 넛지인가.
   *
   * 이 구분이 필요한 이유: "아직 안 봤다"와 "지금 뜨려 한다"는 다르다.
   * 공습 코치는 공습이 나야, 마찰 코치는 마찰 UI에 들어가야 뜬다. 이런
   * 상황형 넛지를 "대기 중"으로 세면 **평생 오지 않을 상황 때문에 다른
   * 넛지가 영구히 막힌다.** (실제로 soundUnmute가 그 아래 전부를 막았다.)
   *
   * 따라서 마지막 한 자리를 놓고 다투는 선점 판정에는 eager만 참여시킨다.
   */
  eager?: boolean;
};

/**
 * 넛지 레지스트리 — 우선순위 정본.
 *
 * 우선순위 기준: "이걸 못 보면 사용자가 곤란해지는가?"
 *  10대 = 안전·성능 (놓치면 앱이 버벅이거나 소리가 튄다)
 *  20대 = 첫 방향 잡기 (이게 없으면 뭘 해야 할지 모른다)
 *  30대 = 상황별 안내 (해당 기능을 만났을 때만 의미)
 *  40대 = 편의 힌트 (몰라도 큰 지장 없다)
 */
export const NUDGE_REGISTRY: Record<NudgeId, NudgeSpec> = {
  /** FPS 프로브가 자동으로 돌아 세션 초반에 뜬다 → eager */
  ultraLiteOffer: {
    priority: 10,
    legacyKey: "geowatch-ultralite-offer-v1",
    scope: "session",
    eager: true,
  },
  /**
   * 90초 종료 후에만, 그것도 소리를 한 번도 안 고른 사람에게만.
   *
   * ⚠️ legacyKey가 null인 이유 — `cv-sound-enabled`를 넣으면 안 된다.
   * 그 키는 "봤음" 플래그가 아니라 **사용자 설정값**이다.
   * markNudgeShown이 "1"을 쓰는 순간 **소리가 켜진다.**
   * (기본 OFF 정책을 정면으로 위반한다.)
   * 완료 판정은 컴포넌트가 `hasSoundChoice()`로 직접 한다.
   *
   * eager도 아니다 — eager면 소리 설정을 안 건드린 모든 사용자에게
   * 영구 '대기 중'이 되어 아래 넛지 전부를 막는다.
   */
  soundUnmute: { priority: 15, legacyKey: null, scope: "persistent" },
  /** 진입 직후 자동 노출 → eager */
  chromeCoach: {
    priority: 20,
    legacyKey: "geowatch-chrome-coach-v4",
    scope: "persistent",
    eager: true,
  },
  /** 등불 직후 자동 노출 → eager */
  tourInvite: {
    priority: 25,
    legacyKey: "geowatch-tour-invite-v1",
    scope: "persistent",
    eager: true,
  },
  /** 사용자가 「투어 시작」을 눌러 진입 — 방해가 아니므로 예산 면제 */
  firstVisitTour: {
    priority: 30,
    legacyKey: "geowatch-first-visit-tour-v1",
    scope: "persistent",
    exempt: true,
  },
  airRaidCoach: { priority: 32, legacyKey: "geowatch-air-raid-coach-v1", scope: "persistent" },
  frictionCoach: { priority: 34, legacyKey: "geowatch-friction-coach-v1", scope: "persistent" },
  theaterCoach: { priority: 36, legacyKey: "geowatch-theater-coach-v1", scope: "persistent" },
  intelDragHint: { priority: 40, legacyKey: "geowatch-intel-drag-hint-v1", scope: "persistent" },
};

function store(scope: NudgeSpec["scope"]): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return scope === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function readNumber(key: string, fallback: number): number {
  const s = store("session");
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number): void {
  const s = store("session");
  if (!s) return;
  try {
    s.setItem(key, String(value));
  } catch {
    /* ignore quota */
  }
}

/** 이번 세션에 이미 사용한 넛지 수 */
export function usedBudget(): number {
  return readNumber(BUDGET_KEY, 0);
}

export function remainingBudget(): number {
  return Math.max(0, ONBOARDING_BUDGET_PER_SESSION - usedBudget());
}

/** 마지막 넛지 이후 충분히 지났는가 */
export function cooldownElapsed(now: number = Date.now()): boolean {
  const last = readNumber(LAST_SHOWN_KEY, 0);
  if (last <= 0) return true;
  return now - last >= ONBOARDING_COOLDOWN_MS;
}

/** 이 넛지를 이미 본(또는 끝낸) 적 있는가 — 기존 키를 그대로 읽는다 */
export function isNudgeDone(id: NudgeId): boolean {
  const spec = NUDGE_REGISTRY[id];
  if (!spec.legacyKey) return false;
  const s = store(spec.scope);
  // SSR·저장소 차단 환경에서는 "이미 봤다"로 취급해 넛지를 띄우지 않는다.
  // 알림을 놓치는 쪽이, 매 렌더마다 다시 뜨는 쪽보다 낫다.
  if (!s) return true;
  try {
    return s.getItem(spec.legacyKey) !== null && s.getItem(spec.legacyKey) !== "";
  } catch {
    return true;
  }
}

/**
 * 지금 이 넛지를 띄워도 되는가.
 *
 * @param id     넛지
 * @param ready  호출측 고유 조건 (예: 지구본 준비됨, FPS 측정 완료)
 */
export function canShowNudge(
  id: NudgeId,
  ready = true,
  now: number = Date.now(),
): boolean {
  if (!ready) return false;
  if (isNudgeDone(id)) return false;

  const spec = NUDGE_REGISTRY[id];
  if (spec.exempt) return true;

  if (remainingBudget() <= 0) return false;
  if (!cooldownElapsed(now)) return false;

  // 마지막 한 자리 — 더 중요한 **eager** 넛지가 아직 안 떴으면 양보한다.
  // 힌트가 성능 경고의 자리를 뺏으면 안 된다.
  // (상황형 넛지는 제외 — 오지 않을 상황 때문에 영구히 막히는 걸 방지)
  if (remainingBudget() === 1) {
    const moreImportantEagerPending = (Object.keys(NUDGE_REGISTRY) as NudgeId[]).some(
      (other) =>
        other !== id &&
        NUDGE_REGISTRY[other].eager &&
        !NUDGE_REGISTRY[other].exempt &&
        NUDGE_REGISTRY[other].priority < spec.priority &&
        !isNudgeDone(other),
    );
    if (moreImportantEagerPending) return false;
  }

  return true;
}

/** 넛지를 실제로 띄웠을 때 호출 — 예산 차감 + 쿨다운 시작 + 완료 기록 */
export function markNudgeShown(id: NudgeId, now: number = Date.now()): void {
  const spec = NUDGE_REGISTRY[id];

  if (spec.legacyKey) {
    const s = store(spec.scope);
    try {
      s?.setItem(spec.legacyKey, "1");
    } catch {
      /* ignore quota */
    }
  }

  if (spec.exempt) return;
  writeNumber(BUDGET_KEY, usedBudget() + 1);
  writeNumber(LAST_SHOWN_KEY, now);
}

/** 대기 중인 넛지 중 가장 중요한 것 — 디버그·테스트용 */
export function nextPendingNudge(): NudgeId | null {
  const pending = (Object.keys(NUDGE_REGISTRY) as NudgeId[])
    .filter((id) => !NUDGE_REGISTRY[id].exempt && !isNudgeDone(id))
    .sort((a, b) => NUDGE_REGISTRY[a].priority - NUDGE_REGISTRY[b].priority);
  return pending[0] ?? null;
}

/** 「투어 다시 보기」 등 — 예산과 완료 기록을 되돌린다 */
export function resetOnboarding(ids?: NudgeId[]): void {
  const targets = ids ?? (Object.keys(NUDGE_REGISTRY) as NudgeId[]);
  for (const id of targets) {
    const spec = NUDGE_REGISTRY[id];
    if (!spec.legacyKey) continue;
    // 소리 선호는 온보딩 기록이 아니라 사용자 설정이다 — 리셋 대상 아님
    if (id === "soundUnmute") continue;
    try {
      store(spec.scope)?.removeItem(spec.legacyKey);
    } catch {
      /* ignore */
    }
  }
  writeNumber(BUDGET_KEY, 0);
  writeNumber(LAST_SHOWN_KEY, 0);
}
