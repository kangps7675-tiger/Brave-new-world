import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FIRST_VISIT_TOUR_STEPS,
  FIRST_VISIT_TOUR_KEY,
  TOUR_INVITE_KEY,
  clearFirstVisitTourDone,
  markFirstVisitTourDone,
  readFirstVisitTourDone,
  tourStepCopy,
} from "@/lib/firstVisitTour";
import {
  markTourInviteDismissed,
  readTourInviteDismissed,
  shouldOfferTourInvite,
} from "@/lib/tourInvite";
import { NUDGE_REGISTRY, resetOnboarding } from "@/lib/onboardingBudget";

function installMemoryStorage() {
  const mem = () => {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => {
        map.set(String(k), String(v));
      },
      removeItem: (k: string) => {
        map.delete(String(k));
      },
      clear: () => map.clear(),
      get length() {
        return map.size;
      },
      key: (i: number) => [...map.keys()][i] ?? null,
    };
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mem(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: mem(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

describe("first-visit tour invite (localStorage)", () => {
  beforeEach(() => {
    installMemoryStorage();
    resetOnboarding();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("offers invite only when neither invite nor tour is done", () => {
    expect(shouldOfferTourInvite()).toBe(true);
  });

  it("does not offer after dismiss (browser remembers)", () => {
    markTourInviteDismissed();
    expect(readTourInviteDismissed()).toBe(true);
    expect(localStorage.getItem(TOUR_INVITE_KEY)).toBe("1");
    expect(shouldOfferTourInvite()).toBe(false);
  });

  it("does not offer after tour completed", () => {
    markFirstVisitTourDone();
    expect(readFirstVisitTourDone()).toBe(true);
    expect(localStorage.getItem(FIRST_VISIT_TOUR_KEY)).toBe("1");
    expect(shouldOfferTourInvite()).toBe(false);
  });

  it("clearFirstVisitTourDone allows manual replay but invite key still blocks auto", () => {
    markTourInviteDismissed();
    markFirstVisitTourDone();
    clearFirstVisitTourDone();
    expect(readFirstVisitTourDone()).toBe(false);
    expect(shouldOfferTourInvite()).toBe(false);
  });
});

describe("FIRST_VISIT_TOUR_STEPS chrome alignment", () => {
  it("targets live chrome and omits dead selectors", () => {
    const selectors = FIRST_VISIT_TOUR_STEPS.map((s) => s.targetSelector);
    expect(selectors).toContain("#ask-layers-button");
    expect(selectors).toContain("#view-mode-switcher");
    expect(selectors).toContain("#chrome-menu-peep");
    expect(selectors).toContain("#macro-briefing-toggle");
    expect(selectors).not.toContain("#exploration-theater-dropdown");
    expect(selectors).not.toContain("#feature-guide-button");
  });

  it("explains three lenses for amateur adults (ko)", () => {
    const mode = FIRST_VISIT_TOUR_STEPS.find((s) => s.id === "mode")!;
    const { body } = tourStepCopy(mode, "ko", "conflict");
    expect(body).toMatch(/지정학/);
    expect(body).toMatch(/3D|라이브/);
    expect(body).toMatch(/지경학/);
  });
});

describe("onboardingBudget chromeCoach / tourInvite", () => {
  it("chromeCoach is not eager; tourInvite is exempt", () => {
    expect(NUDGE_REGISTRY.chromeCoach.eager).toBeFalsy();
    expect(NUDGE_REGISTRY.tourInvite.exempt).toBe(true);
  });
});
