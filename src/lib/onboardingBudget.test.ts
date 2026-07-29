import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_BUDGET_PER_SESSION,
  canShowNudge,
  isNudgeDone,
  markNudgeShown,
  nextPendingNudge,
  remainingBudget,
  resetOnboarding,
  usedBudget,
} from "@/lib/onboardingBudget";

const NOW = 1_000_000;

/** Node 환경(vitest environment: node)에는 Web Storage가 없다 — 스텁 필수 */
function installMemoryStorage() {
  const create = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    };
  };
  const localStorage = create();
  const sessionStorage = create();
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorage,
    configurable: true,
    writable: true,
  });
  // onboardingBudget.store()는 `typeof window === "undefined"`로 조기 반환한다
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

installMemoryStorage();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("예산 총량", () => {
  it("신규 방문자는 세션당 2개", () => {
    expect(remainingBudget()).toBe(ONBOARDING_BUDGET_PER_SESSION);
  });

  it("소진되면 아무것도 뜨지 않는다", () => {
    markNudgeShown("ultraLiteOffer", NOW);
    markNudgeShown("chromeCoach", NOW);
    expect(remainingBudget()).toBe(0);
    expect(canShowNudge("tourInvite", true, NOW + 60_000)).toBe(false);
  });
});

describe("쿨다운", () => {
  it("연속으로 뜨지 않는다 (예산이 남아 있어도)", () => {
    markNudgeShown("ultraLiteOffer", NOW);
    expect(canShowNudge("chromeCoach", true, NOW + 10_000)).toBe(false);
    expect(canShowNudge("chromeCoach", true, NOW + 46_000)).toBe(true);
  });
});

describe("우선순위 선점", () => {
  it("마지막 한 자리는 덜 중요한 힌트에 주지 않는다", () => {
    markNudgeShown("ultraLiteOffer", NOW);
    const later = NOW + 60_000;
    expect(remainingBudget()).toBe(1);
    expect(canShowNudge("intelDragHint", true, later)).toBe(false);
    expect(canShowNudge("chromeCoach", true, later)).toBe(true);
  });

  /**
   * 회귀 방지 — 초기 구현은 "아직 안 본" 모든 넛지를 대기로 셌다.
   * 그 결과 soundUnmute(상황형)가 소리 설정을 안 건드린 **모든 사용자에게
   * 영구 대기**가 되어 그 아래 넛지를 전부 막았다.
   */
  it("상황형 넛지는 영구 대기로 아래를 막지 않는다", () => {
    expect(isNudgeDone("soundUnmute")).toBe(false); // 소리 미선택 상태
    markNudgeShown("ultraLiteOffer", NOW);
    expect(canShowNudge("chromeCoach", true, NOW + 60_000)).toBe(true);
  });
});

describe("예산 면제", () => {
  it("사용자가 직접 시작한 투어는 예산과 무관하다", () => {
    markNudgeShown("ultraLiteOffer", NOW);
    markNudgeShown("chromeCoach", NOW);
    expect(remainingBudget()).toBe(0);
    expect(canShowNudge("firstVisitTour", true, NOW)).toBe(true);
    markNudgeShown("firstVisitTour", NOW);
    expect(usedBudget()).toBe(ONBOARDING_BUDGET_PER_SESSION);
  });
});

describe("기존 사용자 보호", () => {
  /**
   * 새 통합 키를 만들면 이미 온보딩을 끝낸 사용자 전원이 처음부터 다시 본다.
   * (LAYER_PREFS_KEY가 v38까지 올라가며 설정을 날린 것과 같은 실수)
   */
  it("기존 저장 키를 그대로 존중한다", () => {
    localStorage.setItem("geowatch-chrome-coach-v4", "1");
    expect(isNudgeDone("chromeCoach")).toBe(true);
    expect(canShowNudge("chromeCoach", true, NOW)).toBe(false);
  });
});

describe("설정 키 오염 방지", () => {
  /**
   * 회귀 방지 — 초기 구현은 soundUnmute의 legacyKey를 `cv-sound-enabled`로 뒀다.
   * 그러면 markNudgeShown이 그 키에 "1"을 써서 **소리가 켜진다.**
   * "봤음" 플래그와 "사용자 설정값"을 같은 키로 쓰면 안 된다.
   */
  it("소리 넛지 노출이 소리를 켜지 않는다", () => {
    expect(localStorage.getItem("cv-sound-enabled")).toBeNull();
    markNudgeShown("soundUnmute", NOW);
    expect(localStorage.getItem("cv-sound-enabled")).toBeNull();
  });

  it("소리 넛지도 예산은 정상 차감한다", () => {
    markNudgeShown("soundUnmute", NOW);
    expect(usedBudget()).toBe(1);
  });
});

describe("리셋", () => {
  it("코치 기록은 지우되 소리 설정은 보존한다", () => {
    localStorage.setItem("cv-sound-enabled", "0");
    localStorage.setItem("geowatch-chrome-coach-v4", "1");
    resetOnboarding();
    expect(localStorage.getItem("geowatch-chrome-coach-v4")).toBeNull();
    // 소리는 온보딩 기록이 아니라 사용자 설정이다
    expect(localStorage.getItem("cv-sound-enabled")).toBe("0");
    expect(remainingBudget()).toBe(ONBOARDING_BUDGET_PER_SESSION);
  });
});

describe("보조", () => {
  it("ready=false면 무조건 차단", () => {
    expect(canShowNudge("ultraLiteOffer", false, NOW)).toBe(false);
  });

  it("가장 중요한 대기 넛지를 알려준다", () => {
    expect(nextPendingNudge()).toBe("ultraLiteOffer");
  });
});
