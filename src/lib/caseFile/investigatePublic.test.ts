import { describe, expect, it, beforeEach } from "vitest";
import {
  plainVerdictBlurb,
  validateInvestigateInput,
} from "@/lib/caseFile/investigatePublic";
import {
  checkInvestigateRateLimit,
  INVESTIGATE_LIMITS,
  resetInvestigateRateLimitForTests,
} from "@/lib/caseFile/investigateRateLimit";

describe("validateInvestigateInput", () => {
  it("requires url or text", () => {
    expect(validateInvestigateInput({}).ok).toBe(false);
  });

  it("accepts https url", () => {
    const v = validateInvestigateInput({
      url: "https://www.reuters.com/world/example",
    });
    expect(v.ok).toBe(true);
  });

  it("rejects non-http url", () => {
    const v = validateInvestigateInput({ url: "ftp://example.com/x" });
    expect(v.ok).toBe(false);
  });

  it("rejects oversized text", () => {
    const v = validateInvestigateInput({
      text: "a".repeat(INVESTIGATE_LIMITS.maxTextChars + 1),
    });
    expect(v.ok).toBe(false);
  });
});

describe("plainVerdictBlurb", () => {
  it("explains unconfirmed plainly", () => {
    expect(plainVerdictBlurb("unconfirmed")).toContain("확정하지");
  });
});

describe("checkInvestigateRateLimit", () => {
  beforeEach(() => {
    resetInvestigateRateLimitForTests();
  });

  it("allows a burst then blocks", () => {
    const key = "ip:test-investigate";
    for (let i = 0; i < INVESTIGATE_LIMITS.maxPerWindow; i++) {
      expect(checkInvestigateRateLimit(key).ok).toBe(true);
    }
    const blocked = checkInvestigateRateLimit(key);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
