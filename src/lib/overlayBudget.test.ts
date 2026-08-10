import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 배너 세션 예산 (P2-3).
 *
 * 여기서 지켜야 할 불변식은 하나다 — **예산이 긴급 배너를 막아서는 안 된다.**
 * 제안 배너를 아끼려다 공습 경보를 놓치면 이 기능은 순손실이다.
 */

// vitest environment가 "node"라 sessionStorage가 없다 — 최소 구현으로 대체
const store = new Map<string, string>();
vi.stubGlobal("window", {
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

const {
  OFFER_BUDGET_PER_SESSION,
  applyOverlayBudget,
  canSpendOverlayBudget,
  isUrgentBanner,
  markOverlayDismissed,
  markOverlayShown,
  resetOverlayBudget,
} = await import("@/lib/overlayBudget");

describe("overlayBudget", () => {
  beforeEach(() => {
    store.clear();
    resetOverlayBudget();
  });

  it("긴급 배너는 예산·무시와 무관하게 항상 통과한다", () => {
    for (const kind of ["airRaid", "adsbEmergency", "escalation"] as const) {
      expect(isUrgentBanner(kind)).toBe(true);
    }
    // 제안형으로 예산을 모두 소진
    markOverlayShown("exercise");
    markOverlayShown("maritime");
    markOverlayShown("hotTheater");
    expect(canSpendOverlayBudget("ultraLite")).toBe(false);

    // 그래도 공습은 뜬다
    expect(canSpendOverlayBudget("airRaid")).toBe(true);
    expect(canSpendOverlayBudget("adsbEmergency")).toBe(true);
  });

  it("긴급 배너는 닫아도 다시 뜬다 (다음 사건이 있으므로)", () => {
    markOverlayDismissed("airRaid");
    expect(canSpendOverlayBudget("airRaid")).toBe(true);
  });

  it("제안형은 세션당 예산만큼만 노출된다", () => {
    const offers = ["exercise", "maritime", "hotTheater", "ultraLite", "coach"] as const;
    let shown = 0;
    for (const kind of offers) {
      if (canSpendOverlayBudget(kind)) {
        markOverlayShown(kind);
        shown += 1;
      }
    }
    expect(shown).toBe(OFFER_BUDGET_PER_SESSION);
  });

  it("같은 종류를 여러 번 노출해도 예산은 1회만 소모한다", () => {
    markOverlayShown("exercise");
    markOverlayShown("exercise");
    markOverlayShown("exercise");
    // 리렌더로 예산이 갉아먹히면 안 된다 — 아직 2칸 남아야 한다
    expect(canSpendOverlayBudget("maritime")).toBe(true);
    markOverlayShown("maritime");
    expect(canSpendOverlayBudget("hotTheater")).toBe(true);
  });

  it("한 번 무시하면 세션 내내 다시 묻지 않는다", () => {
    expect(canSpendOverlayBudget("ultraLite")).toBe(true);
    markOverlayDismissed("ultraLite");
    expect(canSpendOverlayBudget("ultraLite")).toBe(false);
    // 다른 제안은 영향 없음
    expect(canSpendOverlayBudget("exercise")).toBe(true);
  });

  it("applyOverlayBudget은 예산 초과 후보만 걷어낸다", () => {
    markOverlayDismissed("exercise");
    const out = applyOverlayBudget({
      airRaid: true,
      exercise: true,
      maritime: true,
    });
    expect(out.airRaid).toBe(true); // 긴급 — 유지
    expect(out.exercise).toBe(false); // 무시됨 — 제거
    expect(out.maritime).toBe(true); // 예산 내 — 유지
  });
});
